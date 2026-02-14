/**
 * Relationship Index
 *
 * Maintains an in-memory directed graph of cross-references between campaign
 * files. For example, an NPC's frontmatter might reference a location ID or
 * a faction ID -- this index lets the UI show "related items" panels.
 *
 * The graph is built by scanning every .md file in the campaign and extracting
 * IDs from configured frontmatter fields (registered per module). It supports
 * incremental updates when a single file changes, and full rebuilds on
 * campaign activation.
 *
 * Two edge directions are tracked:
 *   - outgoing: "this file references these other files"
 *   - incoming: "these files reference this file" (reverse lookup)
 */

import fs from 'fs/promises';
import path from 'path';
import { config } from '../config.js';
import { markdownParser } from './markdown-parser.js';
import type { FileMetadata, ParsedFile } from '../../shared/types/file.js';

// ============================================================================
// Types & State
// ============================================================================

interface RelationshipGraph {
  outgoing: Map<string, Set<string>>; // fileId -> Set of referenced fileIds
  incoming: Map<string, Set<string>>; // fileId -> Set of fileIds that reference it
  metadata: Map<string, FileMetadata>; // fileId -> file metadata snapshot
}

// Modules register which frontmatter fields contain reference IDs
interface RelationshipFieldConfig {
  moduleId: string;
  fields: string[];  // e.g., ["location", "faction", "allies"]
}

// One graph per campaign, lazily built on first access
const graphs = new Map<string, RelationshipGraph>();

// Accumulated field registrations from all modules
const fieldConfigs: RelationshipFieldConfig[] = [];

// ============================================================================
// Helpers — Extract reference IDs from frontmatter values
// ============================================================================

// A reference field value can be a single ID string or an array of IDs
function extractIds(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string');
  }
  return [];
}

// Collect all referenced IDs across the configured relationship fields
function extractReferences(
  frontmatter: Record<string, unknown>,
  fields: string[]
): string[] {
  const refs: string[] = [];
  for (const field of fields) {
    if (frontmatter[field]) {
      refs.push(...extractIds(frontmatter[field]));
    }
  }
  return refs;
}

// Scan all .md files across every module folder in a campaign.
// Skips the assets/ directory (binary files only).
async function scanCampaignFiles(campaignId: string): Promise<ParsedFile[]> {
  const campaignPath = path.join(config.campaignsDir, campaignId);
  const files: ParsedFile[] = [];

  try {
    const entries = await fs.readdir(campaignPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name === 'assets') continue;

      const moduleDir = path.join(campaignPath, entry.name);
      const moduleFiles = await fs.readdir(moduleDir);

      for (const file of moduleFiles) {
        if (!file.endsWith('.md')) continue;

        const filePath = path.join(moduleDir, file);
        const raw = await fs.readFile(filePath, 'utf-8');
        const { frontmatter, content } = markdownParser.parse(raw);

        files.push({
          frontmatter: {
            id: frontmatter.id as string,
            name: frontmatter.name as string,
            ...frontmatter,
          },
          content,
          filePath: path.relative(campaignPath, filePath),
        });
      }
    }
  } catch {
    // Campaign doesn't exist or is empty
  }

  return files;
}

// ============================================================================
// Public API
// ============================================================================

export const relationshipIndex = {
  /** Register which frontmatter fields in a module contain reference IDs. */
  registerFields(moduleId: string, fields: string[]): void {
    const existing = fieldConfigs.find((c) => c.moduleId === moduleId);
    if (existing) {
      existing.fields = fields;
    } else {
      fieldConfigs.push({ moduleId, fields });
    }
  },

  /** Full rebuild: scan every file and reconstruct the entire graph. */
  async rebuild(campaignId: string): Promise<void> {
    const graph: RelationshipGraph = {
      outgoing: new Map(),
      incoming: new Map(),
      metadata: new Map(),
    };

    const files = await scanCampaignFiles(campaignId);
    const allFields = fieldConfigs.flatMap((c) => c.fields);

    for (const file of files) {
      const fileId = file.frontmatter.id;

      graph.metadata.set(fileId, {
        ...file.frontmatter,
        id: fileId,
        name: file.frontmatter.name,
        filePath: file.filePath,
        modified: new Date().toISOString(),
      });

      const refs = extractReferences(file.frontmatter, allFields);
      graph.outgoing.set(fileId, new Set(refs));

      for (const refId of refs) {
        if (!graph.incoming.has(refId)) {
          graph.incoming.set(refId, new Set());
        }
        graph.incoming.get(refId)!.add(fileId);
      }
    }

    graphs.set(campaignId, graph);
  },

  /** Incremental update: remove old edges for this file, then re-add. */
  async updateFile(campaignId: string, file: ParsedFile): Promise<void> {
    let graph = graphs.get(campaignId);
    if (!graph) {
      await this.rebuild(campaignId);
      graph = graphs.get(campaignId)!;
    }

    const fileId = file.frontmatter.id;
    const allFields = fieldConfigs.flatMap((c) => c.fields);

    // First, clean up old outgoing edges from the incoming maps
    const oldRefs = graph.outgoing.get(fileId) || new Set();
    for (const refId of oldRefs) {
      graph.incoming.get(refId)?.delete(fileId);
    }

    // Refresh the metadata snapshot
    graph.metadata.set(fileId, {
      ...file.frontmatter,
      id: fileId,
      name: file.frontmatter.name,
      filePath: file.filePath,
      modified: new Date().toISOString(),
    });

    // Add new references
    const newRefs = extractReferences(file.frontmatter, allFields);
    graph.outgoing.set(fileId, new Set(newRefs));

    for (const refId of newRefs) {
      if (!graph.incoming.has(refId)) {
        graph.incoming.set(refId, new Set());
      }
      graph.incoming.get(refId)!.add(fileId);
    }
  },

  /** Remove a file and all its edges (both directions) from the graph. */
  async removeFile(campaignId: string, fileId: string): Promise<void> {
    const graph = graphs.get(campaignId);
    if (!graph) return;

    // Remove outgoing references
    const refs = graph.outgoing.get(fileId) || new Set();
    for (const refId of refs) {
      graph.incoming.get(refId)?.delete(fileId);
    }

    // Remove incoming references
    for (const [, incoming] of graph.incoming) {
      incoming.delete(fileId);
    }

    graph.outgoing.delete(fileId);
    graph.incoming.delete(fileId);
    graph.metadata.delete(fileId);
  },

  /**
   * Query both directions: files this entry references, and files that
   * reference this entry. Lazily rebuilds the graph if not yet cached.
   */
  async getRelated(
    campaignId: string,
    fileId: string
  ): Promise<{ references: FileMetadata[]; referencedBy: FileMetadata[] }> {
    let graph = graphs.get(campaignId);
    if (!graph) {
      await this.rebuild(campaignId);
      graph = graphs.get(campaignId)!;
    }

    const outgoing = graph.outgoing.get(fileId) || new Set();
    const incoming = graph.incoming.get(fileId) || new Set();

    const references: FileMetadata[] = [];
    const referencedBy: FileMetadata[] = [];

    for (const refId of outgoing) {
      const meta = graph.metadata.get(refId);
      if (meta) references.push(meta);
    }

    for (const refId of incoming) {
      const meta = graph.metadata.get(refId);
      if (meta) referencedBy.push(meta);
    }

    return { references, referencedBy };
  },

  /** Batch-resolve an array of file IDs to their metadata. */
  async resolveIds(campaignId: string, ids: string[]): Promise<FileMetadata[]> {
    let graph = graphs.get(campaignId);
    if (!graph) {
      await this.rebuild(campaignId);
      graph = graphs.get(campaignId)!;
    }

    return ids
      .map((id) => graph!.metadata.get(id))
      .filter((m): m is FileMetadata => m !== undefined);
  },
};

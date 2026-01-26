import fs from 'fs/promises';
import path from 'path';
import { config } from '../config.js';
import { markdownParser } from './markdown-parser.js';
import type { FileMetadata, ParsedFile } from '../../shared/types/file.js';

interface RelationshipGraph {
  // fileId -> Set of fileIds it references
  outgoing: Map<string, Set<string>>;
  // fileId -> Set of fileIds that reference it
  incoming: Map<string, Set<string>>;
  // fileId -> FileMetadata
  metadata: Map<string, FileMetadata>;
}

interface RelationshipFieldConfig {
  moduleId: string;
  fields: string[];
}

const graphs = new Map<string, RelationshipGraph>();
const fieldConfigs: RelationshipFieldConfig[] = [];

function extractIds(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string');
  }
  return [];
}

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

export const relationshipIndex = {
  registerFields(moduleId: string, fields: string[]): void {
    const existing = fieldConfigs.find((c) => c.moduleId === moduleId);
    if (existing) {
      existing.fields = fields;
    } else {
      fieldConfigs.push({ moduleId, fields });
    }
  },

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

  async updateFile(campaignId: string, file: ParsedFile): Promise<void> {
    let graph = graphs.get(campaignId);
    if (!graph) {
      await this.rebuild(campaignId);
      graph = graphs.get(campaignId)!;
    }

    const fileId = file.frontmatter.id;
    const allFields = fieldConfigs.flatMap((c) => c.fields);

    // Remove old outgoing references
    const oldRefs = graph.outgoing.get(fileId) || new Set();
    for (const refId of oldRefs) {
      graph.incoming.get(refId)?.delete(fileId);
    }

    // Update metadata
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

import fs from 'fs/promises';
import path from 'path';
import { config } from '../config.js';
import { markdownParser } from './markdown-parser.js';
import { generateFileId } from '../../shared/utils/ids.js';
import type { ParsedFile, FileMetadata, CreateFileInput, UpdateFileInput } from '../../shared/types/file.js';

// =============================================================================
// ID Index Cache for O(1) file lookups
// =============================================================================

// Cache structure: campaignId -> moduleFolder -> fileId -> filePath
const idIndex = new Map<string, Map<string, Map<string, string>>>();


function getCachedPath(campaignId: string, moduleFolder: string, fileId: string): string | undefined {
  const campaignCache = idIndex.get(campaignId);
  if (!campaignCache) return undefined;
  const moduleCache = campaignCache.get(moduleFolder);
  if (!moduleCache) return undefined;
  return moduleCache.get(fileId);
}

function setCachedPath(campaignId: string, moduleFolder: string, fileId: string, filePath: string): void {
  let campaignCache = idIndex.get(campaignId);
  if (!campaignCache) {
    campaignCache = new Map();
    idIndex.set(campaignId, campaignCache);
  }
  let moduleCache = campaignCache.get(moduleFolder);
  if (!moduleCache) {
    moduleCache = new Map();
    campaignCache.set(moduleFolder, moduleCache);
  }
  moduleCache.set(fileId, filePath);
}

function removeCachedPath(campaignId: string, moduleFolder: string, fileId: string): void {
  const campaignCache = idIndex.get(campaignId);
  if (!campaignCache) return;
  const moduleCache = campaignCache.get(moduleFolder);
  if (!moduleCache) return;
  moduleCache.delete(fileId);
}

function clearModuleCache(campaignId: string, moduleFolder: string): void {
  const campaignCache = idIndex.get(campaignId);
  if (!campaignCache) return;
  campaignCache.delete(moduleFolder);
}

// =============================================================================
// Helper Functions
// =============================================================================

async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Find a file by ID, using cached index when available
 * Falls back to scanning if not in cache
 */
async function findFileById(
  campaignId: string,
  moduleFolder: string,
  dirPath: string,
  fileId: string
): Promise<string | null> {
  // Try cache first (O(1) lookup)
  const cachedPath = getCachedPath(campaignId, moduleFolder, fileId);
  if (cachedPath) {
    // Verify the file still exists
    if (await fileExists(cachedPath)) {
      return cachedPath;
    }
    // Cache is stale, remove it
    removeCachedPath(campaignId, moduleFolder, fileId);
  }

  // Fall back to scanning (O(n) lookup)
  try {
    const files = await fs.readdir(dirPath);
    const mdFiles = files.filter(f => f.endsWith('.md'));

    for (const file of mdFiles) {
      const filePath = path.join(dirPath, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const { frontmatter } = markdownParser.parse(content);
      if (frontmatter.id === fileId) {
        // Cache for next time
        setCachedPath(campaignId, moduleFolder, fileId, filePath);
        return filePath;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export const fileStore = {
  async list(campaignId: string, moduleFolder: string): Promise<FileMetadata[]> {
    const dirPath = path.join(config.campaignsDir, campaignId, moduleFolder);

    if (!(await fileExists(dirPath))) {
      return [];
    }

    const files = await fs.readdir(dirPath);
    const mdFiles = files.filter(f => f.endsWith('.md'));

    // Clear and rebuild the cache for this module
    clearModuleCache(campaignId, moduleFolder);

    const metadata: FileMetadata[] = [];

    for (const file of mdFiles) {
      try {
        const filePath = path.join(dirPath, file);
        const stat = await fs.stat(filePath);
        const content = await fs.readFile(filePath, 'utf-8');
        const { frontmatter } = markdownParser.parse(content);

        // Skip files without valid id and name in frontmatter
        if (!frontmatter.id || !frontmatter.name) {
          continue;
        }

        const fileId = frontmatter.id as string;

        // Cache the ID -> filePath mapping for O(1) lookups
        setCachedPath(campaignId, moduleFolder, fileId, filePath);

        metadata.push({
          id: fileId,
          name: frontmatter.name as string,
          filePath: path.join(moduleFolder, file),
          modified: stat.mtime.toISOString(),
          ...frontmatter,
        });
      } catch (error) {
        // Skip files that can't be parsed
        console.warn(`Skipping file ${file}: ${error}`);
      }
    }

    return metadata.sort((a, b) => a.name.localeCompare(b.name));
  },

  async get(campaignId: string, moduleFolder: string, fileId: string): Promise<ParsedFile | null> {
    const dirPath = path.join(config.campaignsDir, campaignId, moduleFolder);
    const filePath = await findFileById(campaignId, moduleFolder, dirPath, fileId);

    if (!filePath) {
      return null;
    }

    const raw = await fs.readFile(filePath, 'utf-8');
    const { frontmatter, content } = markdownParser.parse(raw);

    return {
      frontmatter: frontmatter as ParsedFile['frontmatter'],
      content,
      filePath: path.relative(path.join(config.campaignsDir, campaignId), filePath),
    };
  },

  async create(
    campaignId: string,
    moduleFolder: string,
    data: CreateFileInput
  ): Promise<ParsedFile> {
    const dirPath = path.join(config.campaignsDir, campaignId, moduleFolder);
    await ensureDir(dirPath);

    const id = generateFileId(data.name);
    const fileName = `${id}.md`;
    const filePath = path.join(dirPath, fileName);

    const frontmatter = {
      id,
      name: data.name,
      ...data.frontmatter,
    };

    const content = data.content || '';
    const raw = markdownParser.serialize(frontmatter, content);

    await fs.writeFile(filePath, raw, 'utf-8');

    return {
      frontmatter: frontmatter as ParsedFile['frontmatter'],
      content,
      filePath: path.join(moduleFolder, fileName),
    };
  },

  async update(
    campaignId: string,
    moduleFolder: string,
    fileId: string,
    data: UpdateFileInput
  ): Promise<ParsedFile | null> {
    const dirPath = path.join(config.campaignsDir, campaignId, moduleFolder);
    const filePath = await findFileById(campaignId, moduleFolder, dirPath, fileId);

    if (!filePath) {
      return null;
    }

    const raw = await fs.readFile(filePath, 'utf-8');
    const existing = markdownParser.parse(raw);

    // Start with existing frontmatter and merge in updates
    const newFrontmatter: Record<string, unknown> = {
      ...existing.frontmatter,
      id: fileId, // id is always preserved
    };

    // If name is provided, use it; otherwise keep existing
    if (data.name !== undefined) {
      newFrontmatter.name = data.name;
    }

    // Merge frontmatter fields - only update fields that are explicitly provided
    if (data.frontmatter) {
      for (const [key, value] of Object.entries(data.frontmatter)) {
        if (value !== undefined) {
          newFrontmatter[key] = value;
        } else if (key in data.frontmatter) {
          // If explicitly set to undefined, remove the field
          delete newFrontmatter[key];
        }
      }
    }

    const newContent = data.content !== undefined ? data.content : existing.content;
    const newRaw = markdownParser.serialize(newFrontmatter, newContent);

    await fs.writeFile(filePath, newRaw, 'utf-8');

    return {
      frontmatter: newFrontmatter as ParsedFile['frontmatter'],
      content: newContent,
      filePath: path.relative(path.join(config.campaignsDir, campaignId), filePath),
    };
  },

  async delete(campaignId: string, moduleFolder: string, fileId: string): Promise<boolean> {
    const dirPath = path.join(config.campaignsDir, campaignId, moduleFolder);
    const filePath = await findFileById(campaignId, moduleFolder, dirPath, fileId);

    if (!filePath) {
      return false;
    }

    await fs.unlink(filePath);
    // Remove from cache
    removeCachedPath(campaignId, moduleFolder, fileId);
    return true;
  },

  getPath(campaignId: string, relativePath: string): string {
    return path.join(config.campaignsDir, campaignId, relativePath);
  },
};

import fs from 'fs/promises';
import path from 'path';
import { config } from '../config.js';
import { markdownParser } from './markdown-parser.js';
import { generateFileId } from '../../shared/utils/ids.js';
import type { ParsedFile, FileMetadata, CreateFileInput, UpdateFileInput } from '../../shared/types/file.js';

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

async function findFileById(dirPath: string, fileId: string): Promise<string | null> {
  try {
    const files = await fs.readdir(dirPath);
    const mdFiles = files.filter(f => f.endsWith('.md'));

    for (const file of mdFiles) {
      const filePath = path.join(dirPath, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const { frontmatter } = markdownParser.parse(content);
      if (frontmatter.id === fileId) {
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

    const metadata: FileMetadata[] = [];

    for (const file of mdFiles) {
      const filePath = path.join(dirPath, file);
      const stat = await fs.stat(filePath);
      const content = await fs.readFile(filePath, 'utf-8');
      const { frontmatter } = markdownParser.parse(content);

      metadata.push({
        id: frontmatter.id as string,
        name: frontmatter.name as string,
        filePath: path.join(moduleFolder, file),
        modified: stat.mtime.toISOString(),
        ...frontmatter,
      });
    }

    return metadata.sort((a, b) => a.name.localeCompare(b.name));
  },

  async get(campaignId: string, moduleFolder: string, fileId: string): Promise<ParsedFile | null> {
    const dirPath = path.join(config.campaignsDir, campaignId, moduleFolder);
    const filePath = await findFileById(dirPath, fileId);

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
    const filePath = await findFileById(dirPath, fileId);

    if (!filePath) {
      return null;
    }

    const raw = await fs.readFile(filePath, 'utf-8');
    const existing = markdownParser.parse(raw);

    const newFrontmatter = {
      ...existing.frontmatter,
      ...data.frontmatter,
      id: fileId, // Preserve ID
    };

    if (data.name !== undefined) {
      (newFrontmatter as Record<string, unknown>).name = data.name;
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
    const filePath = await findFileById(dirPath, fileId);

    if (!filePath) {
      return false;
    }

    await fs.unlink(filePath);
    return true;
  },

  getPath(campaignId: string, relativePath: string): string {
    return path.join(config.campaignsDir, campaignId, relativePath);
  },
};

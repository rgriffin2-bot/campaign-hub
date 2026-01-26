import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs/promises';
import { config } from '../config.js';
import { markdownParser } from './markdown-parser.js';
import { relationshipIndex } from './relationship-index.js';
import type { ParsedFile } from '../../shared/types/file.js';

type FileChangeHandler = (
  event: 'add' | 'change' | 'unlink',
  campaignId: string,
  filePath: string,
  file?: ParsedFile
) => void;

const handlers: FileChangeHandler[] = [];
let watcher: chokidar.FSWatcher | null = null;

function parsePath(fullPath: string): { campaignId: string; relativePath: string } | null {
  const rel = path.relative(config.campaignsDir, fullPath);
  const parts = rel.split(path.sep);

  if (parts.length < 2) return null;

  return {
    campaignId: parts[0],
    relativePath: parts.slice(1).join(path.sep),
  };
}

async function handleFileChange(event: 'add' | 'change' | 'unlink', fullPath: string) {
  if (!fullPath.endsWith('.md')) return;

  const parsed = parsePath(fullPath);
  if (!parsed) return;

  const { campaignId, relativePath } = parsed;

  let file: ParsedFile | undefined;

  if (event !== 'unlink') {
    try {
      const raw = await fs.readFile(fullPath, 'utf-8');
      const { frontmatter, content } = markdownParser.parse(raw);

      file = {
        frontmatter: {
          id: frontmatter.id as string,
          name: frontmatter.name as string,
          ...frontmatter,
        },
        content,
        filePath: relativePath,
      };

      await relationshipIndex.updateFile(campaignId, file);
    } catch (err) {
      console.error(`Error reading file ${fullPath}:`, err);
      return;
    }
  } else {
    // For unlink, we need to extract the fileId from the filename
    const fileName = path.basename(fullPath, '.md');
    await relationshipIndex.removeFile(campaignId, fileName);
  }

  for (const handler of handlers) {
    handler(event, campaignId, relativePath, file);
  }
}

export const fileWatcher = {
  start(): void {
    if (watcher) return;

    watcher = chokidar.watch(config.campaignsDir, {
      ignored: [
        /(^|[\/\\])\../, // Ignore dotfiles
        /node_modules/,
        /assets/, // Don't watch asset folders
        /campaign\.yaml$/, // Don't watch config files
      ],
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50,
      },
    });

    watcher
      .on('add', (path) => handleFileChange('add', path))
      .on('change', (path) => handleFileChange('change', path))
      .on('unlink', (path) => handleFileChange('unlink', path))
      .on('error', (error) => console.error('File watcher error:', error));

    console.log(`File watcher started on ${config.campaignsDir}`);
  },

  stop(): void {
    if (watcher) {
      watcher.close();
      watcher = null;
      console.log('File watcher stopped');
    }
  },

  onFileChange(handler: FileChangeHandler): () => void {
    handlers.push(handler);
    return () => {
      const index = handlers.indexOf(handler);
      if (index > -1) handlers.splice(index, 1);
    };
  },
};

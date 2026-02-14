/**
 * Watches the campaigns directory for markdown file changes using chokidar.
 *
 * On add/change events the file is parsed and the relationship index is
 * updated. On unlink events the file is removed from the index. External
 * consumers can subscribe via `onFileChange` to react to mutations
 * (e.g. WebSocket push to connected clients).
 */

import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs/promises';
import { config } from '../config.js';
import { markdownParser } from './markdown-parser.js';
import { relationshipIndex } from './relationship-index.js';
import type { ParsedFile } from '../../shared/types/file.js';

// ── Types ──────────────────────────────────────────────────────────────

type FileChangeHandler = (
  event: 'add' | 'change' | 'unlink',
  campaignId: string,
  filePath: string,
  file?: ParsedFile
) => void;

// ── State ──────────────────────────────────────────────────────────────

const handlers: FileChangeHandler[] = [];
let watcher: chokidar.FSWatcher | null = null;

// ── Internal Helpers ───────────────────────────────────────────────────

/** Extract campaignId and relative path from an absolute filesystem path */
function parsePath(fullPath: string): { campaignId: string; relativePath: string } | null {
  const rel = path.relative(config.campaignsDir, fullPath);
  const parts = rel.split(path.sep);

  if (parts.length < 2) return null;

  return {
    campaignId: parts[0],
    relativePath: parts.slice(1).join(path.sep),
  };
}

/** Process a single file change: parse, update index, notify subscribers */
async function handleFileChange(event: 'add' | 'change' | 'unlink', fullPath: string) {
  // Only track markdown files; assets and configs are handled elsewhere
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

  // Notify all registered subscribers
  for (const handler of handlers) {
    handler(event, campaignId, relativePath, file);
  }
}

// ── Public API ─────────────────────────────────────────────────────────

export const fileWatcher = {
  /** Start watching the campaigns directory (no-op if already running) */
  start(): void {
    if (watcher) return;

    watcher = chokidar.watch(config.campaignsDir, {
      ignored: [
        /(^|[\/\\])\../, // dotfiles
        /node_modules/,
        /assets/,         // binary assets are not markdown
        /campaign\.yaml$/, // config changes are handled by campaign-manager
      ],
      persistent: true,
      ignoreInitial: true, // Don't fire events for files that exist at startup
      awaitWriteFinish: {
        // Wait for write to stabilize before emitting event; avoids
        // reading a partially-written file.
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

  /** Stop the file watcher and release resources */
  stop(): void {
    if (watcher) {
      watcher.close();
      watcher = null;
      console.log('File watcher stopped');
    }
  },

  /** Subscribe to file changes. Returns an unsubscribe function. */
  onFileChange(handler: FileChangeHandler): () => void {
    handlers.push(handler);
    return () => {
      const index = handlers.indexOf(handler);
      if (index > -1) handlers.splice(index, 1);
    };
  },
};

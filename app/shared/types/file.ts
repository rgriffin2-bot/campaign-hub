/**
 * Shared types for the markdown-with-YAML-frontmatter file format
 * that all campaign data files use on disk.
 */

/** Minimum required frontmatter fields every data file must have */
export interface BaseFrontmatter {
  id: string;
  name: string;
}

/** A parsed markdown file with typed frontmatter, body content, and disk path */
export interface ParsedFile<T = Record<string, unknown>> {
  frontmatter: T & BaseFrontmatter;
  /** Markdown body content (everything after the frontmatter block) */
  content: string;
  filePath: string;
}

/** Lightweight file metadata returned by list endpoints (no body content) */
export interface FileMetadata {
  id: string;
  name: string;
  filePath: string;
  /** ISO date string of last modification */
  modified: string;
  /** Additional frontmatter fields forwarded from the file */
  [key: string]: unknown;
}

/** Input for creating a new data file */
export interface CreateFileInput {
  name: string;
  content?: string;
  frontmatter?: Record<string, unknown>;
}

/** Input for updating an existing data file (all fields optional) */
export interface UpdateFileInput {
  name?: string;
  content?: string;
  frontmatter?: Record<string, unknown>;
}

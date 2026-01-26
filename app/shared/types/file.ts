export interface BaseFrontmatter {
  id: string;
  name: string;
}

export interface ParsedFile<T = Record<string, unknown>> {
  frontmatter: T & BaseFrontmatter;
  content: string;
  filePath: string;
}

export interface FileMetadata {
  id: string;
  name: string;
  filePath: string;
  modified: string;
  [key: string]: unknown;
}

export interface CreateFileInput {
  name: string;
  content?: string;
  frontmatter?: Record<string, unknown>;
}

export interface UpdateFileInput {
  name?: string;
  content?: string;
  frontmatter?: Record<string, unknown>;
}

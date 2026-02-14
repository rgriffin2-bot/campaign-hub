/**
 * Thin wrapper around gray-matter for parsing and serializing
 * markdown files with YAML frontmatter.
 */

import matter from 'gray-matter';
import type { ZodSchema } from 'zod';

export interface ParseResult {
  frontmatter: Record<string, unknown>;
  content: string;
}

export const markdownParser = {
  /** Split a raw markdown string into frontmatter object + body content */
  parse(raw: string): ParseResult {
    const { data, content } = matter(raw);
    return {
      frontmatter: data,
      content: content.trim(),
    };
  },

  /** Recombine frontmatter and body back into a markdown string with YAML header */
  serialize(frontmatter: Record<string, unknown>, content: string): string {
    return matter.stringify(content, frontmatter);
  },

  /** Validate frontmatter against a Zod schema, throwing on failure */
  validate<T>(frontmatter: Record<string, unknown>, schema: ZodSchema<T>): T {
    return schema.parse(frontmatter);
  },
};

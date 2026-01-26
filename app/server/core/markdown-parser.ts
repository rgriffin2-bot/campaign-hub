import matter from 'gray-matter';
import type { ZodSchema } from 'zod';

export interface ParseResult {
  frontmatter: Record<string, unknown>;
  content: string;
}

export const markdownParser = {
  parse(raw: string): ParseResult {
    const { data, content } = matter(raw);
    return {
      frontmatter: data,
      content: content.trim(),
    };
  },

  serialize(frontmatter: Record<string, unknown>, content: string): string {
    return matter.stringify(content, frontmatter);
  },

  validate<T>(frontmatter: Record<string, unknown>, schema: ZodSchema<T>): T {
    return schema.parse(frontmatter);
  },
};

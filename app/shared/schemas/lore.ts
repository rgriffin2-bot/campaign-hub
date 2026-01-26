import { z } from 'zod';

export const loreTypes = [
  'world',
  'faction',
  'history',
  'religion',
  'magic',
  'other',
] as const;

export type LoreType = (typeof loreTypes)[number];

export const loreSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name is required'),
  type: z.enum(loreTypes),
  tags: z.array(z.string()).optional().default([]),
});

export type LoreFrontmatter = z.infer<typeof loreSchema>;

export interface LoreFile {
  frontmatter: LoreFrontmatter;
  content: string;
  filePath: string;
}

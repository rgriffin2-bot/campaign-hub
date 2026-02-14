/**
 * Lore schema.
 * Validates frontmatter for lore/worldbuilding markdown files stored in the lore/ folder.
 * Each lore entry has a categorical type and optional header image.
 */

import { z } from 'zod';

// ── Lore Categories ─────────────────────────────────────────────────────────

export const loreTypes = [
  'cosmology-and-origins',
  'makers',
  'stewards',
  'human-polities-and-power',
  'faiths-and-ideologies',
  'the-breath-and-paraphysics',
  'relics-and-artifacts',
  'life-in-haven',
] as const;

export type LoreType = (typeof loreTypes)[number];

export const loreSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name is required'),
  type: z.enum(loreTypes),
  tags: z.array(z.string()).optional().default([]),
  image: z.string().optional(), // Path to header image
  hidden: z.boolean().optional().default(false), // Hidden from players until revealed
});

export type LoreFrontmatter = z.infer<typeof loreSchema>;

/** A fully parsed lore file (frontmatter + markdown body + path) */
export interface LoreFile {
  frontmatter: LoreFrontmatter;
  content: string;
  filePath: string;
}

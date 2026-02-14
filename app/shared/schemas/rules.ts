/**
 * Rules schema.
 * Validates frontmatter for game rules/moves stored in the rules/ folder.
 * Categories map to the game system's rule types (core mechanics, moves, etc.).
 */

import { z } from 'zod';

// ── Rule Categories ─────────────────────────────────────────────────────────

export const ruleCategories = [
  'core-mechanic',
  'action',
  'general-move',
  'playbook-move',
  'downtime',
  'harm-recovery',
  'gear',
  'ship',
  'gm-reference',
] as const;

export type RuleCategory = (typeof ruleCategories)[number];

export const ruleCategoryLabels: Record<RuleCategory, string> = {
  'core-mechanic': 'Core Mechanic',
  'action': 'Action',
  'general-move': 'General Move',
  'playbook-move': 'Playbook Move',
  'downtime': 'Downtime',
  'harm-recovery': 'Harm & Recovery',
  'gear': 'Gear',
  'ship': 'Ship',
  'gm-reference': 'GM Reference',
};

// ── Main Rule Schema ────────────────────────────────────────────────────────

export const ruleSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name is required'),
  category: z.enum(ruleCategories),
  subcategory: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  playerVisible: z.boolean().optional().default(true),
  source: z.string().optional(),
});

export type RuleFrontmatter = z.infer<typeof ruleSchema>;

/** A fully parsed rule file (frontmatter + markdown body + path) */
export interface RuleFile {
  frontmatter: RuleFrontmatter;
  content: string;
  filePath: string;
}

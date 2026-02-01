import { z } from 'zod';

export const npcDmOnlySchema = z.object({
  secrets: z.string().optional(),
  voice: z.string().optional(),
  notes: z.string().optional(),
});

// Disposition for NPCs in scenes
export const dispositionSchema = z.enum(['hostile', 'friendly', 'neutral']);
export type Disposition = z.infer<typeof dispositionSchema>;

// Combat/stat block for NPCs that need stats
export const npcStatsSchema = z.object({
  damage: z.number().optional().default(0), // Current damage taken
  maxDamage: z.number().optional().default(10), // Damage threshold
  armor: z.number().optional().default(0), // Armor rating
  moves: z.string().optional(), // Enemy moves/abilities (markdown)
});

// Keep old name as alias for backwards compatibility
export const antagonistStatsSchema = npcStatsSchema;

// Related character entry: "[[npcs:id]] - description"
export const relatedCharacterSchema = z.object({
  id: z.string(), // The NPC id (without [[npcs:]] wrapper)
  description: z.string().optional(), // Optional description of the relationship
});

export type RelatedCharacter = z.infer<typeof relatedCharacterSchema>;

export const npcSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name is required'),
  occupation: z.string().optional(),
  location: z.string().optional(),
  appearance: z.string().optional(),
  personality: z.string().optional(),
  goals: z.string().optional(),
  dmOnly: npcDmOnlySchema.optional(),
  // Support both old format (string[]) and new format (RelatedCharacter[])
  relatedCharacters: z.array(
    z.union([z.string(), relatedCharacterSchema])
  ).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
  portrait: z.string().optional(), // Path to portrait image
  portraitPosition: z.object({
    x: z.number(),
    y: z.number(),
    scale: z.number(),
  }).optional(), // Position/zoom for circular crop
  hidden: z.boolean().optional().default(false), // Hidden from players until revealed
  hasStats: z.boolean().optional().default(false), // Whether this NPC has combat/stat block
  disposition: dispositionSchema.optional().default('neutral'), // Hostile, friendly, or neutral
  stats: npcStatsSchema.optional(), // Combat stats (only used if hasStats is true)
  // Keep old fields as aliases for backwards compatibility
  isAntagonist: z.boolean().optional(), // Deprecated: use hasStats instead
  antagonistStats: antagonistStatsSchema.optional(), // Deprecated: use stats instead
});

export type NPCFrontmatter = z.infer<typeof npcSchema>;
export type NPCDmOnly = z.infer<typeof npcDmOnlySchema>;
export type NPCStats = z.infer<typeof npcStatsSchema>;
export type AntagonistStats = z.infer<typeof antagonistStatsSchema>; // Deprecated alias

export interface NPCFile {
  frontmatter: NPCFrontmatter;
  content: string;
  filePath: string;
}

// For AI generation input
export interface NPCGenerateInput {
  prompt: string;
  includeSecrets?: boolean;
}

// For AI generation output
export interface GeneratedNPC {
  name: string;
  occupation?: string;
  location?: string;
  appearance?: string;
  personality?: string;
  goals?: string;
  dmOnly?: {
    secrets?: string;
    voice?: string;
  };
  content?: string;
  tags?: string[];
}

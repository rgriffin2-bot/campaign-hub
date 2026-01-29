import { z } from 'zod';

export const resourceLevels = [
  'screwed',
  'dry',
  'light',
  'covered',
  'flush',
  'swimming',
] as const;

export type ResourceLevel = (typeof resourceLevels)[number];

export const resourceLevelLabels: Record<ResourceLevel, string> = {
  'screwed': 'Screwed',
  'dry': 'Dry',
  'light': 'Light',
  'covered': 'Covered',
  'flush': 'Flush',
  'swimming': 'Swimming in it',
};

export const statNames = ['poise', 'insight', 'grit', 'presence', 'resonance'] as const;
export type StatName = (typeof statNames)[number];

export const statLabels: Record<StatName, string> = {
  'poise': 'Poise',
  'insight': 'Insight',
  'grit': 'Grit',
  'presence': 'Presence',
  'resonance': 'Resonance',
};

export const gearItemSchema = z.object({
  item: z.string(),
  tags: z.array(z.string()).optional().default([]),
  notes: z.string().optional(),
});

export type GearItem = z.infer<typeof gearItemSchema>;

export const harmSchema = z.object({
  oldWounds: z.string().optional(),
  mild: z.string().optional(),
  moderate: z.string().optional(),
  severe: z.string().optional(),
});

export type HarmState = z.infer<typeof harmSchema>;

export const statsSchema = z.object({
  poise: z.number().min(0).max(4).default(0),
  insight: z.number().min(0).max(4).default(0),
  grit: z.number().min(0).max(4).default(0),
  presence: z.number().min(0).max(4).default(0),
  resonance: z.number().min(0).max(4).default(0),
});

export type Stats = z.infer<typeof statsSchema>;

export const playerCharacterSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name is required'),
  player: z.string().min(1, 'Player name is required'),
  playerVisible: z.literal(true).optional().default(true),

  // Demographics & Biography
  portrait: z.string().optional(),
  pronouns: z.string().optional(),
  species: z.string().optional(),
  age: z.string().optional(),
  appearance: z.string().optional(),
  background: z.string().optional(),

  // Class/Occupation
  playbook: z.string().optional(),
  playbookMoves: z.array(z.string()).optional().default([]), // Rule IDs

  // Affiliations (IDs referencing other modules)
  npcConnections: z.array(z.string()).optional().default([]),
  locationConnections: z.array(z.string()).optional().default([]),
  loreConnections: z.array(z.string()).optional().default([]),

  // Stats
  stats: statsSchema.optional().default({
    poise: 0,
    insight: 0,
    grit: 0,
    presence: 0,
    resonance: 0,
  }),

  // Trackers
  pressure: z.number().min(0).max(5).optional().default(0),
  harm: harmSchema.optional().default({}),
  resources: z.enum(resourceLevels).optional().default('covered'),
  experience: z.number().min(0).max(5).optional().default(0),
  luck: z.boolean().optional().default(true),

  // Gear
  gear: z.array(gearItemSchema).optional().default([]),
});

export type PlayerCharacterFrontmatter = z.infer<typeof playerCharacterSchema>;

export interface PlayerCharacterFile {
  frontmatter: PlayerCharacterFrontmatter;
  content: string;
  filePath: string;
}

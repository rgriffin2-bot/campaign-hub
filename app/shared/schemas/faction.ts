import { z } from 'zod';

// Faction types - different categories of organizations
export const factionTypeSchema = z.enum([
  'institutional',    // governments, megacorps, academies
  'belief-driven',    // religions, Steward cults, Breath mystics
  'commercial',       // trade hubs, dock unions, brokers
  'frontier',         // nomadic flotillas, pirate enclaves, settlements
  'security',         // militias, patrol fleets, enforcement arms
  'political',        // alliances, councils, blocs
  'criminal',         // smugglers, fixers, black markets
  'other',            // catch-all
]);

export type FactionType = z.infer<typeof factionTypeSchema>;

// Affinity scale from -3 to +3
export const affinitySchema = z.number().int().min(-3).max(3).default(0);

export const affinityLabels: Record<number, string> = {
  3: 'Allies',
  2: 'Friendly',
  1: 'Helpful',
  0: 'Neutral',
  '-1': 'Interfering',
  '-2': 'Adversarial',
  '-3': 'Open Hostilities',
};

// DM-only notes
export const factionDmOnlySchema = z.object({
  secrets: z.string().optional(),
  notes: z.string().optional(),
});

// Main faction schema
export const factionSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name is required'),
  type: factionTypeSchema.optional().default('other'),
  description: z.string().optional(), // Short description for grid view
  affinity: affinitySchema, // Standing with the crew (-3 to +3)
  location: z.string().optional(), // Where they're based
  leader: z.string().optional(), // Who leads/represents them
  affiliations: z.array(z.string()).optional().default([]), // Related NPCs or factions
  notes: z.string().optional(), // Open-ended notes (markdown)
  dmOnly: factionDmOnlySchema.optional(), // DM-only notes
  hidden: z.boolean().optional().default(false), // Hidden from players
  image: z.string().optional(), // Path to faction image/logo
  imagePosition: z.object({ x: z.number(), y: z.number(), scale: z.number() }).optional(),
  tags: z.array(z.string()).optional().default([]),
});

export type FactionFrontmatter = z.infer<typeof factionSchema>;
export type FactionDmOnly = z.infer<typeof factionDmOnlySchema>;

export interface FactionFile {
  frontmatter: FactionFrontmatter;
  content: string;
  filePath: string;
}

// Type labels for display
export const FACTION_TYPE_LABELS: Record<FactionType, string> = {
  'institutional': 'Institutional',
  'belief-driven': 'Belief-Driven',
  'commercial': 'Commercial',
  'frontier': 'Frontier',
  'security': 'Security',
  'political': 'Political',
  'criminal': 'Criminal',
  'other': 'Other',
};

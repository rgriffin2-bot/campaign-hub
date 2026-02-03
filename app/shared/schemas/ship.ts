import { z } from 'zod';

// Disposition type for ships in scenes
export const shipDispositionSchema = z.enum(['hostile', 'friendly', 'neutral']);
export type ShipDisposition = z.infer<typeof shipDispositionSchema>;

// Subsystem damage - each can have minor and major damage descriptions
export const subsystemDamageSchema = z.object({
  minor: z.string().optional(), // Description of minor damage
  major: z.string().optional(), // Description of major damage
});

// The 6 subsystems for ship damage
export const shipDamageSchema = z.object({
  helmControl: subsystemDamageSchema.optional(),     // HELM & CONTROL
  enginesDrives: subsystemDamageSchema.optional(),   // ENGINES & DRIVES
  sensorsArrays: subsystemDamageSchema.optional(),   // SENSORS & ARRAYS
  hullStructure: subsystemDamageSchema.optional(),   // HULL & STRUCTURE
  powerLifeSupport: subsystemDamageSchema.optional(),// POWER & LIFE SUPPORT
  weaponsBoarding: subsystemDamageSchema.optional(), // WEAPONS & BOARDING
});

// Pressure tracker for ships (similar to player characters)
export const shipPressureSchema = z.number().min(0).max(5).optional().default(0);

// DM-only notes
export const shipDmOnlySchema = z.object({
  secrets: z.string().optional(),
  notes: z.string().optional(),
});

// Main ship schema
export const shipSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name is required'),
  type: z.string().optional(), // starship, vehicle, submersible, mech, drone
  class: z.string().optional(), // freighter, interceptor, capital, industrial, etc.
  owner: z.string().optional(), // Person or faction that owns/controls it
  isCrewShip: z.boolean().optional().default(false), // Controlled by the player crew
  affiliations: z.array(z.string()).optional().default([]), // Related characters or factions
  appearance: z.string().optional(), // Physical description
  characteristics: z.array(z.string()).optional().default([]), // Open-ended tags
  notes: z.string().optional(), // Open-ended notes (markdown)
  dmOnly: shipDmOnlySchema.optional(), // DM-only notes
  hidden: z.boolean().optional().default(false), // Hidden from players
  disposition: shipDispositionSchema.optional().default('neutral'), // For scene display
  pressure: shipPressureSchema, // Pressure tracker (0-5)
  damage: shipDamageSchema.optional(), // Subsystem damage
  image: z.string().optional(), // Path to ship image
  imagePosition: z.object({ x: z.number(), y: z.number(), scale: z.number() }).optional(), // Image crop position
  tags: z.array(z.string()).optional().default([]),
});

export type ShipFrontmatter = z.infer<typeof shipSchema>;
export type ShipDmOnly = z.infer<typeof shipDmOnlySchema>;
export type ShipDamage = z.infer<typeof shipDamageSchema>;
export type SubsystemDamage = z.infer<typeof subsystemDamageSchema>;

export interface ShipFile {
  frontmatter: ShipFrontmatter;
  content: string;
  filePath: string;
}

// Subsystem labels for display
export const SUBSYSTEM_LABELS = {
  helmControl: 'Helm & Control',
  enginesDrives: 'Engines & Drives',
  sensorsArrays: 'Sensors & Arrays',
  hullStructure: 'Hull & Structure',
  powerLifeSupport: 'Power & Life Support',
  weaponsBoarding: 'Weapons & Boarding',
} as const;

export const SUBSYSTEM_SHORT_LABELS = {
  helmControl: 'Helm',
  enginesDrives: 'Engines',
  sensorsArrays: 'Sensors',
  hullStructure: 'Hull',
  powerLifeSupport: 'Power',
  weaponsBoarding: 'Weapons',
} as const;

export type SubsystemKey = keyof typeof SUBSYSTEM_LABELS;

import { z } from 'zod';

// Suggested location types (user can also enter custom)
export const LOCATION_TYPE_SUGGESTIONS = [
  'Star',
  'Planet',
  'Moon',
  'Station',
  'Asteroid Belt',
  'Continent',
  'Ocean',
  'Region',
  'Country',
  'Province',
  'City',
  'Town',
  'Village',
  'District',
  'Building',
  'Room',
  'Dungeon',
  'Cave',
  'Forest',
  'Mountain',
  'Island',
] as const;

// Celestial body types for map rendering
export const celestialBodyTypes = [
  'star',
  'planet',
  'moon',
  'station',
  'asteroid_ring',
] as const;

export type CelestialBodyType = (typeof celestialBodyTypes)[number];

export const celestialDataSchema = z.object({
  bodyType: z.enum(celestialBodyTypes),
  orbitDistance: z.number().optional(), // Distance from parent in map units
  orbitShape: z.enum(['circle', 'ellipse']).default('circle'),
  orbitEccentricity: z.number().min(0).max(0.99).default(0),
  orbitRotation: z.number().default(0), // Ellipse rotation in degrees
  startPosition: z.number().default(0), // Initial angle (0-359)
  radius: z.number().optional(), // Visual size on map
  color: z.string().optional(), // Fallback color if no image
  orbitColor: z.string().optional(), // Orbit line color
  orbitStyle: z.enum(['solid', 'dashed', 'dotted']).default('solid'),
  showLabel: z.boolean().default(true),
  mapImage: z.string().optional(), // Image path for map visualization (separate from card image)
  ringWidth: z.number().optional(), // For asteroid rings
});

export const locationDmOnlySchema = z.object({
  secrets: z.string().optional(),
  plotHooks: z.string().optional(),
  notes: z.string().optional(),
});

export const locationFrontmatterSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string().optional(), // Open-ended, with suggestions
  parent: z.string().optional(), // Parent location ID
  description: z.string().optional(), // Brief description for cards/sidebar
  image: z.string().optional(), // Landscape image path
  tags: z.array(z.string()).optional().default([]),
  hidden: z.boolean().optional().default(false),
  treeRoot: z.boolean().optional().default(false), // Show as root in tree view even if has parent

  // For celestial bodies (shown on map)
  celestial: celestialDataSchema.optional(),

  // DM-only info
  dmOnly: locationDmOnlySchema.optional(),
});

export type LocationFrontmatter = z.infer<typeof locationFrontmatterSchema>;
export type CelestialData = z.infer<typeof celestialDataSchema>;
export type LocationDmOnly = z.infer<typeof locationDmOnlySchema>;

// Map configuration schema (stored in _map-config.md)
export const mapBackgroundTypes = [
  'color',
  'starfield',
  'nebula',
  'gradient',
] as const;

export type MapBackgroundType = (typeof mapBackgroundTypes)[number];

export const mapConfigSchema = z.object({
  id: z.literal('_map-config'),
  name: z.literal('Map Configuration'),

  // Background settings
  backgroundColor: z.string().default('#0a0a12'),
  backgroundType: z.enum(mapBackgroundTypes).default('starfield'),
  nebulaColors: z.array(z.string()).optional(), // Colors for nebula background type

  // Map dimensions and display
  mapWidth: z.number().default(2400),
  mapHeight: z.number().default(2400),

  // Default orbit styling
  defaultOrbitColor: z.string().default('#2A3A4A'),
  defaultOrbitStyle: z.enum(['solid', 'dashed', 'dotted']).default('solid'),

  // Font settings
  fontFamily: z.string().optional(),
});

export type MapConfig = z.infer<typeof mapConfigSchema>;

// Default map configuration
export const DEFAULT_MAP_CONFIG: MapConfig = {
  id: '_map-config',
  name: 'Map Configuration',
  backgroundColor: '#0a0a12',
  backgroundType: 'starfield',
  nebulaColors: ['#3a2a5a', '#5a3a4a', '#2a5a5a', '#5a5a3a'],
  mapWidth: 2400,
  mapHeight: 2400,
  defaultOrbitColor: '#2A3A4A',
  defaultOrbitStyle: 'solid',
};

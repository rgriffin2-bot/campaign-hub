/**
 * Shared types for live play scene entities
 * Used by both server and client for scene NPCs and ships
 */

import type { Disposition } from '../schemas/npc.js';
import type { ShipDamage } from '../schemas/ship.js';

// Re-export for convenience
export type { Disposition };

/**
 * NPC stats for combat/encounter tracking
 */
export interface NPCStats {
  damage?: number;
  maxDamage?: number;
  armor?: number;
  moves?: string;
}

/**
 * Scene NPC - an NPC added to the current live play scene
 */
export interface SceneNPC {
  id: string;
  name: string;
  occupation?: string;
  portrait?: string;
  portraitPosition?: { x: number; y: number; scale: number };
  hasStats?: boolean;
  disposition?: Disposition;
  stats?: NPCStats;
  visibleToPlayers?: boolean;
  // Backwards compatibility
  isAntagonist?: boolean;
  antagonistStats?: NPCStats;
}

/**
 * Scene Ship - a ship added to the current live play scene
 */
export interface SceneShip {
  id: string;
  name: string;
  type?: string;
  class?: string;
  image?: string;
  isCrewShip?: boolean;
  disposition?: Disposition;
  pressure?: number;
  damage?: ShipDamage;
  visibleToPlayers?: boolean;
}

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
  imagePosition?: { x: number; y: number; scale: number };
  isCrewShip?: boolean;
  disposition?: Disposition;
  pressure?: number;
  damage?: ShipDamage;
  visibleToPlayers?: boolean;
}

/**
 * Dice types available for rolling
 */
export type DiceType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd100';

/**
 * A single dice roll record
 */
export interface DiceRoll {
  id: string;
  diceType: DiceType;
  result: number;
  rolledBy: 'dm' | 'player';
  rollerName?: string;
  rolledAt: string;
}

/**
 * Dice roll state - tracks recent dice rolls for live play
 */
export interface DiceRollState {
  rolls: DiceRoll[];
  visibleToPlayers: boolean;
}

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
  /** Current damage taken */
  damage?: number;
  /** Damage threshold before being taken out */
  maxDamage?: number;
  armor?: number;
  /** Enemy moves/abilities (markdown) */
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
  /** Crop position and zoom for circular portrait display */
  portraitPosition?: { x: number; y: number; scale: number };
  /** Whether this NPC has a combat stat block */
  hasStats?: boolean;
  disposition?: Disposition;
  stats?: NPCStats;
  visibleToPlayers?: boolean;
  // Backwards compatibility
  /** @deprecated Use hasStats instead */
  isAntagonist?: boolean;
  /** @deprecated Use stats instead */
  antagonistStats?: NPCStats;
}

/**
 * Scene Ship - a ship added to the current live play scene
 */
export interface SceneShip {
  id: string;
  name: string;
  /** Vehicle category (e.g. starship, mech, drone) */
  type?: string;
  /** Ship class (e.g. freighter, interceptor) */
  class?: string;
  image?: string;
  /** Crop position and zoom for ship image display */
  imagePosition?: { x: number; y: number; scale: number };
  /** True if this ship is controlled by the player crew */
  isCrewShip?: boolean;
  disposition?: Disposition;
  /** Pressure tracker (0-5) */
  pressure?: number;
  /** Subsystem damage state */
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

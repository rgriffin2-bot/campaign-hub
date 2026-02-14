/**
 * Initiative Tracker Types
 * Used by both Live Play and Tactical Board modules to track
 * turn order during combat encounters.
 */

/** The kind of entity this initiative entry represents */
export type InitiativeSourceType = 'pc' | 'npc' | 'ship' | 'custom';

/** A single entry (combatant) in the initiative order */
export interface InitiativeEntry {
  id: string;
  sourceType: InitiativeSourceType;
  /** Reference to PC/NPC/Ship ID, if sourced from another module */
  sourceId?: string;
  name: string;
  portrait?: string;
  /** Crop position and zoom for portrait display */
  portraitPosition?: { x: number; y: number; scale: number };
  /** Initiative value used for sorting/display */
  initiative: number;
  /** True when it is this entry's turn */
  isActive: boolean;
  /** DM-only notes for this entry */
  notes?: string;
}

/** Overall state of the initiative tracker */
export interface InitiativeState {
  entries: InitiativeEntry[];
  currentRound: number;
  /** Whether initiative tracking is currently active */
  isActive: boolean;
  /** Master toggle for player visibility */
  visibleToPlayers: boolean;
}

/** Default state when no initiative has been set up */
export const DEFAULT_INITIATIVE_STATE: InitiativeState = {
  entries: [],
  currentRound: 1,
  isActive: false,
  visibleToPlayers: true,
};

/** Creates a new initiative entry with sensible defaults */
export function createInitiativeEntry(
  name: string,
  sourceType: InitiativeSourceType = 'custom',
  sourceId?: string,
  portrait?: string
): InitiativeEntry {
  return {
    id: `init-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    sourceType,
    sourceId,
    name,
    portrait,
    initiative: 0,
    isActive: false,
  };
}

// Initiative Tracker Types
// Used by both Live Play and Tactical Board modules

export type InitiativeSourceType = 'pc' | 'npc' | 'ship' | 'custom';

export interface InitiativeEntry {
  id: string;
  sourceType: InitiativeSourceType;
  sourceId?: string; // Reference to PC/NPC/Ship if applicable
  name: string;
  portrait?: string; // Image path
  portraitPosition?: { x: number; y: number; scale: number };
  initiative: number; // Initiative value for sorting/display
  isActive: boolean; // Is it this entry's turn?
  notes?: string; // DM notes for this entry
}

export interface InitiativeState {
  entries: InitiativeEntry[];
  currentRound: number;
  isActive: boolean; // Is initiative tracking currently enabled?
  visibleToPlayers: boolean; // Master visibility toggle
}

// Default state when no initiative has been set up
export const DEFAULT_INITIATIVE_STATE: InitiativeState = {
  entries: [],
  currentRound: 1,
  isActive: false,
  visibleToPlayers: true,
};

// Helper to create a new entry
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

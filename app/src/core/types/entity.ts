export interface Entity {
  id: string;
  type: string;
  name: string;
  tags?: string[];
  description?: string;
  notes?: string;
  created: string;
  modified: string;
  visibility?: 'public' | 'players' | 'dm-only';
  relationships?: Relationship[];
  [key: string]: any; // Allow additional custom fields
}

export interface Relationship {
  target: string;
  type: string;
  description?: string;
  bidirectional?: boolean;
}

export interface Character extends Entity {
  type: 'character';
  character_type: 'pc' | 'npc' | 'historical';
  player?: string;
  status?: 'alive' | 'dead' | 'missing' | 'unknown';
  faction?: string;
  location?: string;
  portrait?: string;
  pronouns?: string;
  appearance?: string;
  personality?: string;
  background?: string;
  motivations?: string;
  secrets?: string;
  stats?: Record<string, any>;
  inventory?: string[] | Record<string, any>[];
  abilities?: Ability[];
}

export interface Ability {
  name: string;
  description: string;
}

export interface Location extends Entity {
  type: 'location';
  location_type: string;
  parent?: string;
  children?: string[];
  features?: string;
  maps?: MapData[];
}

export interface MapData {
  file: string;
  label: string;
  hotspots?: MapHotspot[];
}

export interface MapHotspot {
  region: [number, number, number, number]; // [x1, y1, x2, y2]
  target: string;
  label?: string;
}

export interface MapEntry extends Entity {
  type: 'map';
  map_type?: string;
  file?: string;
  location?: string;
  scale?: string;
  notes?: string;
}

export interface Faction extends Entity {
  type: 'faction';
  faction_type: string;
  motto?: string;
  headquarters?: string;
  leader?: string;
  members?: string[];
  goals?: string;
  secret_goals?: string;
  resources?: string;
  territory?: string[];
  history?: string;
}

export interface Session extends Entity {
  type: 'session';
  session_number: number;
  date: string;
  title?: string;
  summary?: string;
  highlights?: string;
  characters_present?: string[];
  locations_visited?: string[];
  npcs_met?: string[];
  loot?: string[];
  clues?: string;
  open_threads?: string;
  next_session?: string;
  in_game_date?: string;
}

export interface LoreEntry extends Entity {
  type: 'lore';
  lore_type: 'history' | 'culture' | 'technology' | 'religion' | 'geography' | 'rules' | 'other';
  era?: string;
  related_factions?: string[];
  related_locations?: string[];
  related_characters?: string[];
  sources?: string;
  contradictions?: string;
}

export interface ParsedMarkdown {
  frontmatter: Record<string, any>;
  content: string;
  path: string;
}

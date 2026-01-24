export interface Campaign {
  id: string;
  name: string;
  description: string;
  game_system: string;
  created: string;
  last_modified: string;
  dm: {
    name: string;
    email?: string;
  };
  entity_types: {
    location_types: LocationType[];
    faction_types: FactionType[];
    character_types: CharacterType[];
  };
  labels?: {
    location?: string;
    faction?: string;
    character?: string;
  };
  sharing?: {
    google_drive_folder_id?: string;
    player_site_url?: string;
    player_visible?: string[];
  };
  ai?: {
    default_model?: string;
    generation_preview?: boolean;
    context_file?: string;
    modules?: Record<string, any>;
  };
  custom_fields?: CustomFieldsConfig;
}

export interface LocationType {
  id: string;
  label: string;
  can_contain: string[];
}

export interface FactionType {
  id: string;
  label: string;
}

export interface CharacterType {
  id: string;
  label: string;
}

export interface CustomFieldsConfig {
  character?: CustomField[];
  location?: CustomField[];
  faction?: CustomField[];
  [key: string]: CustomField[] | undefined;
}

export interface CustomField {
  name: string;
  type: 'text' | 'number' | 'select' | 'textarea' | 'boolean' | 'date';
  label: string;
  description?: string;
  options?: string[];
  required?: boolean;
  default?: any;
}

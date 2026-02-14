/**
 * Shared types for campaign configuration and management.
 * Stored on disk as campaign.yaml inside each campaign folder.
 */

/** Full campaign configuration persisted in campaign.yaml */
export interface CampaignConfig {
  id: string;
  name: string;
  description?: string;
  /** ISO date string of campaign creation */
  created: string;
  lastAccessed?: string;
  /** List of enabled module IDs (e.g. "npcs", "locations") */
  modules: string[];
  /** Per-module settings keyed by module ID */
  moduleSettings?: {
    [moduleId: string]: Record<string, unknown>;
  };
  /** External sync integration paths */
  sync?: {
    googleDrivePath?: string;
    playerSitePath?: string;
  };
}

/** Lightweight campaign metadata used in campaign lists and selectors */
export interface CampaignMeta {
  id: string;
  name: string;
  description?: string;
  lastAccessed?: string;
  /** Absolute filesystem path to the campaign folder */
  path: string;
}

/** Input for creating a new campaign (id and created are auto-generated) */
export type CreateCampaignInput = Omit<CampaignConfig, 'created' | 'id'> & {
  id?: string;
};

/** Input for updating an existing campaign (id and created are immutable) */
export type UpdateCampaignInput = Partial<Omit<CampaignConfig, 'id' | 'created'>>;

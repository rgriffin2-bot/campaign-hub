export interface CampaignConfig {
  id: string;
  name: string;
  description?: string;
  created: string;
  lastAccessed?: string;
  modules: string[];
  moduleSettings?: {
    [moduleId: string]: Record<string, unknown>;
  };
  sync?: {
    googleDrivePath?: string;
    playerSitePath?: string;
  };
}

export interface CampaignMeta {
  id: string;
  name: string;
  description?: string;
  lastAccessed?: string;
  path: string;
}

export type CreateCampaignInput = Omit<CampaignConfig, 'created' | 'id'> & {
  id?: string;
};

export type UpdateCampaignInput = Partial<Omit<CampaignConfig, 'id' | 'created'>>;

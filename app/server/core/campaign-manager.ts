import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { config } from '../config.js';
import { generateId } from '../../shared/utils/ids.js';
import { toISOString } from '../../shared/utils/dates.js';
import type {
  CampaignConfig,
  CampaignMeta,
  CreateCampaignInput,
  UpdateCampaignInput,
} from '../../shared/types/campaign.js';

let activeCampaign: CampaignConfig | null = null;

async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readCampaignConfig(campaignPath: string): Promise<CampaignConfig | null> {
  const configPath = path.join(campaignPath, 'campaign.yaml');

  if (!(await fileExists(configPath))) {
    return null;
  }

  const content = await fs.readFile(configPath, 'utf-8');
  return yaml.load(content) as CampaignConfig;
}

async function writeCampaignConfig(
  campaignPath: string,
  config: CampaignConfig
): Promise<void> {
  const configPath = path.join(campaignPath, 'campaign.yaml');
  const content = yaml.dump(config, { indent: 2 });
  await fs.writeFile(configPath, content, 'utf-8');
}

export const campaignManager = {
  async list(): Promise<CampaignMeta[]> {
    await ensureDir(config.campaignsDir);

    const entries = await fs.readdir(config.campaignsDir, { withFileTypes: true });
    const campaigns: CampaignMeta[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const campaignPath = path.join(config.campaignsDir, entry.name);
      const campaignConfig = await readCampaignConfig(campaignPath);

      if (campaignConfig) {
        campaigns.push({
          id: campaignConfig.id,
          name: campaignConfig.name,
          description: campaignConfig.description,
          lastAccessed: campaignConfig.lastAccessed,
          path: campaignPath,
        });
      }
    }

    return campaigns.sort((a, b) => {
      if (a.lastAccessed && b.lastAccessed) {
        return new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime();
      }
      return a.name.localeCompare(b.name);
    });
  },

  async load(campaignId: string): Promise<CampaignConfig | null> {
    const campaignPath = path.join(config.campaignsDir, campaignId);
    return readCampaignConfig(campaignPath);
  },

  async create(input: CreateCampaignInput): Promise<CampaignConfig> {
    const id = input.id || generateId();
    const campaignPath = path.join(config.campaignsDir, id);

    await ensureDir(campaignPath);
    await ensureDir(path.join(campaignPath, 'assets'));

    const campaignConfig: CampaignConfig = {
      id,
      name: input.name,
      description: input.description,
      created: toISOString(),
      lastAccessed: toISOString(),
      modules: input.modules || [],
      moduleSettings: input.moduleSettings,
      sync: input.sync,
    };

    await writeCampaignConfig(campaignPath, campaignConfig);

    // Create module folders
    for (const moduleId of campaignConfig.modules) {
      await ensureDir(path.join(campaignPath, moduleId));
    }

    return campaignConfig;
  },

  async update(
    campaignId: string,
    updates: UpdateCampaignInput
  ): Promise<CampaignConfig | null> {
    const campaignPath = path.join(config.campaignsDir, campaignId);
    const existing = await readCampaignConfig(campaignPath);

    if (!existing) {
      return null;
    }

    const updated: CampaignConfig = {
      ...existing,
      ...updates,
      id: existing.id,
      created: existing.created,
    };

    // Create any new module folders
    if (updates.modules) {
      for (const moduleId of updates.modules) {
        await ensureDir(path.join(campaignPath, moduleId));
      }
    }

    await writeCampaignConfig(campaignPath, updated);

    if (activeCampaign?.id === campaignId) {
      activeCampaign = updated;
    }

    return updated;
  },

  async delete(campaignId: string): Promise<boolean> {
    const campaignPath = path.join(config.campaignsDir, campaignId);

    if (!(await fileExists(campaignPath))) {
      return false;
    }

    await fs.rm(campaignPath, { recursive: true });

    if (activeCampaign?.id === campaignId) {
      activeCampaign = null;
    }

    return true;
  },

  getActive(): CampaignConfig | null {
    return activeCampaign;
  },

  async setActive(campaignId: string): Promise<CampaignConfig | null> {
    const campaign = await this.load(campaignId);

    if (!campaign) {
      return null;
    }

    campaign.lastAccessed = toISOString();
    const campaignPath = path.join(config.campaignsDir, campaignId);
    await writeCampaignConfig(campaignPath, campaign);

    activeCampaign = campaign;
    return campaign;
  },
};

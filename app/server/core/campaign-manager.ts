/**
 * Campaign CRUD operations and active-campaign tracking.
 *
 * Each campaign is a folder under `campaignsDir` containing a
 * `campaign.yaml` config file plus per-module subfolders of markdown files.
 */

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

// ── State ──────────────────────────────────────────────────────────────
// Only one campaign is "active" at a time; this is the one the UI operates on.
let activeCampaign: CampaignConfig | null = null;

// ── Filesystem Helpers ─────────────────────────────────────────────────

/** Create directory (and parents) if it doesn't exist */
async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

/** Check whether a file or directory exists at the given path */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/** Read and parse the campaign.yaml config from a campaign folder */
async function readCampaignConfig(campaignPath: string): Promise<CampaignConfig | null> {
  const configPath = path.join(campaignPath, 'campaign.yaml');

  if (!(await fileExists(configPath))) {
    return null;
  }

  const content = await fs.readFile(configPath, 'utf-8');
  return yaml.load(content) as CampaignConfig;
}

/** Serialize a CampaignConfig back to YAML and write it to disk */
async function writeCampaignConfig(
  campaignPath: string,
  config: CampaignConfig
): Promise<void> {
  const configPath = path.join(campaignPath, 'campaign.yaml');
  const content = yaml.dump(config, { indent: 2 });
  await fs.writeFile(configPath, content, 'utf-8');
}

// ── Campaign Manager API ───────────────────────────────────────────────

export const campaignManager = {
  /** List all campaigns, sorted by most-recently-accessed first */
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

    // Sort by last accessed (most recent first), fall back to alphabetical
    return campaigns.sort((a, b) => {
      if (a.lastAccessed && b.lastAccessed) {
        return new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime();
      }
      return a.name.localeCompare(b.name);
    });
  },

  /** Load a single campaign's config by ID */
  async load(campaignId: string): Promise<CampaignConfig | null> {
    const campaignPath = path.join(config.campaignsDir, campaignId);
    return readCampaignConfig(campaignPath);
  },

  /** Create a new campaign folder with config and module subdirectories */
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

  /** Update campaign metadata. Preserves immutable fields (id, created). */
  async update(
    campaignId: string,
    updates: UpdateCampaignInput
  ): Promise<CampaignConfig | null> {
    const campaignPath = path.join(config.campaignsDir, campaignId);
    const existing = await readCampaignConfig(campaignPath);

    if (!existing) {
      return null;
    }

    // Merge updates but never overwrite id or created timestamp
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

    // Keep in-memory active campaign in sync if this is the one being updated
    if (activeCampaign?.id === campaignId) {
      activeCampaign = updated;
    }

    return updated;
  },

  /** Delete a campaign and its entire folder tree */
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

  /** Return the currently active campaign (may be null on startup) */
  getActive(): CampaignConfig | null {
    return activeCampaign;
  },

  /** Mark a campaign as active and update its lastAccessed timestamp */
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

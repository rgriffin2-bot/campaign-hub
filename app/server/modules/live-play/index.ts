import type { RequestHandler } from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';
import { moduleRegistry } from '../registry.js';
import { campaignManager } from '../../core/campaign-manager.js';
import { config } from '../../config.js';
import type { ModuleDefinition } from '../../../shared/types/module.js';

// Placeholder views - will be replaced by actual React components
const PlaceholderView = () => null;

// Scene NPC type (matches client-side SceneNPC)
interface SceneNPC {
  id: string;
  name: string;
  occupation?: string;
  portrait?: string;
  portraitPosition?: { x: number; y: number; scale: number };
  isAntagonist?: boolean;
  antagonistStats?: {
    damage?: number;
    maxDamage?: number;
    armor?: number;
    moves?: string;
  };
  visibleToPlayers?: boolean;
}

// Helper to get the scene file path for a campaign
function getSceneFilePath(campaignId: string): string {
  return path.join(config.campaignsDir, campaignId, '_scene-npcs.json');
}

// Helper to read scene NPCs from file
async function readSceneNPCs(campaignId: string): Promise<SceneNPC[]> {
  const filePath = getSceneFilePath(campaignId);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

// Helper to write scene NPCs to file
async function writeSceneNPCs(campaignId: string, npcs: SceneNPC[]): Promise<void> {
  const filePath = getSceneFilePath(campaignId);
  await fs.writeFile(filePath, JSON.stringify(npcs, null, 2), 'utf-8');
}

// GET /scene-npcs - Get all scene NPCs
const getSceneNPCs: RequestHandler = async (_req, res) => {
  try {
    const campaign = campaignManager.getActive();
    if (!campaign) {
      res.status(400).json({ success: false, error: 'No active campaign' });
      return;
    }

    const npcs = await readSceneNPCs(campaign.id);
    res.json({ success: true, data: npcs });
  } catch (error) {
    console.error('Error getting scene NPCs:', error);
    res.status(500).json({ success: false, error: 'Failed to get scene NPCs' });
  }
};

// POST /scene-npcs - Add an NPC to the scene
const addSceneNPC: RequestHandler = async (req, res) => {
  try {
    const campaign = campaignManager.getActive();
    if (!campaign) {
      res.status(400).json({ success: false, error: 'No active campaign' });
      return;
    }

    const npc: SceneNPC = req.body;
    if (!npc.id || !npc.name) {
      res.status(400).json({ success: false, error: 'NPC id and name are required' });
      return;
    }

    // Default to visible if not specified
    if (npc.visibleToPlayers === undefined) {
      npc.visibleToPlayers = true;
    }

    const npcs = await readSceneNPCs(campaign.id);

    // Don't add duplicates
    if (npcs.some(n => n.id === npc.id)) {
      res.json({ success: true, data: npcs });
      return;
    }

    npcs.push(npc);
    await writeSceneNPCs(campaign.id, npcs);

    res.json({ success: true, data: npcs });
  } catch (error) {
    console.error('Error adding scene NPC:', error);
    res.status(500).json({ success: false, error: 'Failed to add scene NPC' });
  }
};

// PATCH /scene-npcs/:npcId - Update an NPC in the scene
const updateSceneNPC: RequestHandler = async (req, res) => {
  try {
    const campaign = campaignManager.getActive();
    if (!campaign) {
      res.status(400).json({ success: false, error: 'No active campaign' });
      return;
    }

    const { npcId } = req.params;
    const updates = req.body;

    const npcs = await readSceneNPCs(campaign.id);
    const index = npcs.findIndex(n => n.id === npcId);

    if (index === -1) {
      res.status(404).json({ success: false, error: 'NPC not found in scene' });
      return;
    }

    // Merge updates into existing NPC
    npcs[index] = {
      ...npcs[index],
      ...updates,
      // Deep merge antagonistStats if present
      antagonistStats: updates.antagonistStats
        ? { ...npcs[index].antagonistStats, ...updates.antagonistStats }
        : npcs[index].antagonistStats,
    };

    await writeSceneNPCs(campaign.id, npcs);

    res.json({ success: true, data: npcs });
  } catch (error) {
    console.error('Error updating scene NPC:', error);
    res.status(500).json({ success: false, error: 'Failed to update scene NPC' });
  }
};

// DELETE /scene-npcs/:npcId - Remove an NPC from the scene
const removeSceneNPC: RequestHandler = async (req, res) => {
  try {
    const campaign = campaignManager.getActive();
    if (!campaign) {
      res.status(400).json({ success: false, error: 'No active campaign' });
      return;
    }

    const { npcId } = req.params;

    const npcs = await readSceneNPCs(campaign.id);
    const filtered = npcs.filter(n => n.id !== npcId);

    await writeSceneNPCs(campaign.id, filtered);

    res.json({ success: true, data: filtered });
  } catch (error) {
    console.error('Error removing scene NPC:', error);
    res.status(500).json({ success: false, error: 'Failed to remove scene NPC' });
  }
};

// DELETE /scene-npcs - Clear all scene NPCs
const clearSceneNPCs: RequestHandler = async (_req, res) => {
  try {
    const campaign = campaignManager.getActive();
    if (!campaign) {
      res.status(400).json({ success: false, error: 'No active campaign' });
      return;
    }

    await writeSceneNPCs(campaign.id, []);

    res.json({ success: true, data: [] });
  } catch (error) {
    console.error('Error clearing scene NPCs:', error);
    res.status(500).json({ success: false, error: 'Failed to clear scene NPCs' });
  }
};

// Live Play module
export const livePlayModule: ModuleDefinition = {
  id: 'live-play',
  name: 'Live Play',
  icon: 'Play',
  description: 'Session-time tracker for player characters',
  dataFolder: '', // No data folder - uses player-characters data
  routes: [
    { method: 'GET', path: '/scene-npcs', handler: getSceneNPCs },
    { method: 'POST', path: '/scene-npcs', handler: addSceneNPC },
    { method: 'PATCH', path: '/scene-npcs/:npcId', handler: updateSceneNPC },
    { method: 'DELETE', path: '/scene-npcs/:npcId', handler: removeSceneNPC },
    { method: 'DELETE', path: '/scene-npcs', handler: clearSceneNPCs },
  ],
  views: {
    list: PlaceholderView, // Dashboard is the "list" view
  },
  playerSite: {
    enabled: true,
  },
};

// Register the module
moduleRegistry.register(livePlayModule);

export default livePlayModule;

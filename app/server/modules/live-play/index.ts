import type { RequestHandler } from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';
import { moduleRegistry } from '../registry.js';
import { campaignManager } from '../../core/campaign-manager.js';
import { config } from '../../config.js';
import type { ModuleDefinition } from '../../../shared/types/module.js';

// Placeholder views - will be replaced by actual React components
const PlaceholderView = () => null;

// Disposition type for NPCs
type Disposition = 'hostile' | 'friendly' | 'neutral';

// Scene NPC type (matches client-side SceneNPC)
interface SceneNPC {
  id: string;
  name: string;
  occupation?: string;
  portrait?: string;
  portraitPosition?: { x: number; y: number; scale: number };
  hasStats?: boolean;
  disposition?: Disposition;
  stats?: {
    damage?: number;
    maxDamage?: number;
    armor?: number;
    moves?: string;
  };
  visibleToPlayers?: boolean;
  // Backwards compatibility
  isAntagonist?: boolean;
  antagonistStats?: {
    damage?: number;
    maxDamage?: number;
    armor?: number;
    moves?: string;
  };
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
      // Deep merge stats if present (new field)
      stats: updates.stats
        ? { ...npcs[index].stats, ...updates.stats }
        : npcs[index].stats,
      // Deep merge antagonistStats if present (backwards compatibility)
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

// ============================================================================
// Scene Ships
// ============================================================================

interface SceneShip {
  id: string;
  name: string;
  type?: string;
  class?: string;
  image?: string;
  isCrewShip?: boolean;
  disposition?: Disposition;
  pressure?: number;
  damage?: {
    helmControl?: { minor?: string; major?: string };
    enginesDrives?: { minor?: string; major?: string };
    sensorsArrays?: { minor?: string; major?: string };
    hullStructure?: { minor?: string; major?: string };
    powerLifeSupport?: { minor?: string; major?: string };
    weaponsBoarding?: { minor?: string; major?: string };
  };
  visibleToPlayers?: boolean;
}

function getSceneShipsFilePath(campaignId: string): string {
  return path.join(config.campaignsDir, campaignId, '_scene-ships.json');
}

async function readSceneShips(campaignId: string): Promise<SceneShip[]> {
  const filePath = getSceneShipsFilePath(campaignId);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

async function writeSceneShips(campaignId: string, ships: SceneShip[]): Promise<void> {
  const filePath = getSceneShipsFilePath(campaignId);
  await fs.writeFile(filePath, JSON.stringify(ships, null, 2), 'utf-8');
}

// GET /scene-ships - Get all scene ships
const getSceneShips: RequestHandler = async (_req, res) => {
  try {
    const campaign = campaignManager.getActive();
    if (!campaign) {
      res.status(400).json({ success: false, error: 'No active campaign' });
      return;
    }

    const ships = await readSceneShips(campaign.id);
    res.json({ success: true, data: ships });
  } catch (error) {
    console.error('Error getting scene ships:', error);
    res.status(500).json({ success: false, error: 'Failed to get scene ships' });
  }
};

// POST /scene-ships - Add a ship to the scene
const addSceneShip: RequestHandler = async (req, res) => {
  try {
    const campaign = campaignManager.getActive();
    if (!campaign) {
      res.status(400).json({ success: false, error: 'No active campaign' });
      return;
    }

    const ship: SceneShip = req.body;
    if (!ship.id || !ship.name) {
      res.status(400).json({ success: false, error: 'Ship id and name are required' });
      return;
    }

    if (ship.visibleToPlayers === undefined) {
      ship.visibleToPlayers = true;
    }

    const ships = await readSceneShips(campaign.id);

    if (ships.some(s => s.id === ship.id)) {
      res.json({ success: true, data: ships });
      return;
    }

    ships.push(ship);
    await writeSceneShips(campaign.id, ships);

    res.json({ success: true, data: ships });
  } catch (error) {
    console.error('Error adding scene ship:', error);
    res.status(500).json({ success: false, error: 'Failed to add scene ship' });
  }
};

// PATCH /scene-ships/:shipId - Update a ship in the scene
const updateSceneShip: RequestHandler = async (req, res) => {
  try {
    const campaign = campaignManager.getActive();
    if (!campaign) {
      res.status(400).json({ success: false, error: 'No active campaign' });
      return;
    }

    const { shipId } = req.params;
    const updates = req.body;

    const ships = await readSceneShips(campaign.id);
    const index = ships.findIndex(s => s.id === shipId);

    if (index === -1) {
      res.status(404).json({ success: false, error: 'Ship not found in scene' });
      return;
    }

    // Merge updates into existing ship
    ships[index] = {
      ...ships[index],
      ...updates,
      // Deep merge damage if present
      damage: updates.damage
        ? { ...ships[index].damage, ...updates.damage }
        : ships[index].damage,
    };

    await writeSceneShips(campaign.id, ships);

    res.json({ success: true, data: ships });
  } catch (error) {
    console.error('Error updating scene ship:', error);
    res.status(500).json({ success: false, error: 'Failed to update scene ship' });
  }
};

// DELETE /scene-ships/:shipId - Remove a ship from the scene
const removeSceneShip: RequestHandler = async (req, res) => {
  try {
    const campaign = campaignManager.getActive();
    if (!campaign) {
      res.status(400).json({ success: false, error: 'No active campaign' });
      return;
    }

    const { shipId } = req.params;

    const ships = await readSceneShips(campaign.id);
    const filtered = ships.filter(s => s.id !== shipId);

    await writeSceneShips(campaign.id, filtered);

    res.json({ success: true, data: filtered });
  } catch (error) {
    console.error('Error removing scene ship:', error);
    res.status(500).json({ success: false, error: 'Failed to remove scene ship' });
  }
};

// DELETE /scene-ships - Clear all scene ships
const clearSceneShips: RequestHandler = async (_req, res) => {
  try {
    const campaign = campaignManager.getActive();
    if (!campaign) {
      res.status(400).json({ success: false, error: 'No active campaign' });
      return;
    }

    await writeSceneShips(campaign.id, []);

    res.json({ success: true, data: [] });
  } catch (error) {
    console.error('Error clearing scene ships:', error);
    res.status(500).json({ success: false, error: 'Failed to clear scene ships' });
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
    // Scene NPCs
    { method: 'GET', path: '/scene-npcs', handler: getSceneNPCs },
    { method: 'POST', path: '/scene-npcs', handler: addSceneNPC },
    { method: 'PATCH', path: '/scene-npcs/:npcId', handler: updateSceneNPC },
    { method: 'DELETE', path: '/scene-npcs/:npcId', handler: removeSceneNPC },
    { method: 'DELETE', path: '/scene-npcs', handler: clearSceneNPCs },
    // Scene Ships
    { method: 'GET', path: '/scene-ships', handler: getSceneShips },
    { method: 'POST', path: '/scene-ships', handler: addSceneShip },
    { method: 'PATCH', path: '/scene-ships/:shipId', handler: updateSceneShip },
    { method: 'DELETE', path: '/scene-ships/:shipId', handler: removeSceneShip },
    { method: 'DELETE', path: '/scene-ships', handler: clearSceneShips },
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

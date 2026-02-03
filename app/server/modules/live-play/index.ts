import type { RequestHandler } from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';
import { moduleRegistry } from '../registry.js';
import { campaignManager } from '../../core/campaign-manager.js';
import { fileStore } from '../../core/file-store.js';
import { config } from '../../config.js';
import { withFileLock } from '../../core/file-lock.js';
import type { ModuleDefinition } from '../../../shared/types/module.js';
import type { SceneNPC, SceneShip, DiceRollState, DiceRoll } from '../../../shared/types/scene.js';
import {
  validate,
  sceneNPCSchema,
  updateSceneNPCSchema,
  sceneShipSchema,
  updateSceneShipSchema,
} from '../../core/validation.js';

// Placeholder views - will be replaced by actual React components
const PlaceholderView = () => null;

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

// Helper to write scene NPCs to file (with file locking to prevent corruption)
async function writeSceneNPCs(campaignId: string, npcs: SceneNPC[]): Promise<void> {
  const filePath = getSceneFilePath(campaignId);
  await withFileLock(filePath, async () => {
    await fs.writeFile(filePath, JSON.stringify(npcs, null, 2), 'utf-8');
  });
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

// POST /scene-npcs - Add an NPC to the scene (validation via middleware)
const addSceneNPC: RequestHandler = async (req, res) => {
  try {
    const campaign = campaignManager.getActive();
    if (!campaign) {
      res.status(400).json({ success: false, error: 'No active campaign' });
      return;
    }

    const npc: SceneNPC = req.body;

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
// Scene Ships (uses shared SceneShip type from ../../../shared/types/scene.js)
// ============================================================================

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

// Helper to write scene ships to file (with file locking to prevent corruption)
async function writeSceneShips(campaignId: string, ships: SceneShip[]): Promise<void> {
  const filePath = getSceneShipsFilePath(campaignId);
  await withFileLock(filePath, async () => {
    await fs.writeFile(filePath, JSON.stringify(ships, null, 2), 'utf-8');
  });
}

// GET /scene-ships - Get all scene ships (syncs pressure/damage from ship files)
const getSceneShips: RequestHandler = async (_req, res) => {
  try {
    const campaign = campaignManager.getActive();
    if (!campaign) {
      res.status(400).json({ success: false, error: 'No active campaign' });
      return;
    }

    const ships = await readSceneShips(campaign.id);

    // Sync pressure and damage from actual ship files to scene copies
    let hasChanges = false;
    for (let i = 0; i < ships.length; i++) {
      try {
        const shipFile = await fileStore.get(campaign.id, 'ships', ships[i].id);
        if (shipFile) {
          const fm = shipFile.frontmatter as Record<string, unknown>;
          // Sync pressure if different
          if (fm.pressure !== undefined && fm.pressure !== ships[i].pressure) {
            ships[i].pressure = fm.pressure as number;
            hasChanges = true;
          }
          // Sync damage if different
          if (fm.damage !== undefined) {
            const fileDamage = JSON.stringify(fm.damage);
            const sceneDamage = JSON.stringify(ships[i].damage);
            if (fileDamage !== sceneDamage) {
              ships[i].damage = fm.damage as typeof ships[0]['damage'];
              hasChanges = true;
            }
          }
        }
      } catch {
        // Ship file doesn't exist or error reading - skip sync for this ship
      }
    }

    // Save updated scene ships if there were changes
    if (hasChanges) {
      await writeSceneShips(campaign.id, ships);
    }

    res.json({ success: true, data: ships });
  } catch (error) {
    console.error('Error getting scene ships:', error);
    res.status(500).json({ success: false, error: 'Failed to get scene ships' });
  }
};

// POST /scene-ships - Add a ship to the scene (validation via middleware)
const addSceneShip: RequestHandler = async (req, res) => {
  try {
    const campaign = campaignManager.getActive();
    if (!campaign) {
      res.status(400).json({ success: false, error: 'No active campaign' });
      return;
    }

    const ship: SceneShip = req.body;

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
    const mergedDamage = updates.damage
      ? { ...ships[index].damage, ...updates.damage }
      : ships[index].damage;

    ships[index] = {
      ...ships[index],
      ...updates,
      // Deep merge damage if present
      damage: mergedDamage,
    };

    await writeSceneShips(campaign.id, ships);

    // Sync pressure and damage back to the actual ship file
    if ('pressure' in updates || 'damage' in updates) {
      try {
        const shipFile = await fileStore.get(campaign.id, 'ships', shipId);
        if (shipFile) {
          const fileUpdates: Record<string, unknown> = {};
          if ('pressure' in updates) {
            fileUpdates.pressure = updates.pressure;
          }
          if ('damage' in updates) {
            fileUpdates.damage = mergedDamage;
          }
          await fileStore.update(campaign.id, 'ships', shipId, {
            frontmatter: fileUpdates,
          });
        }
      } catch (syncError) {
        // Log but don't fail the request if sync fails
        console.error('Failed to sync ship updates to file:', syncError);
      }
    }

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

// ============================================================================
// Dice Rolls
// ============================================================================

const MAX_ROLL_HISTORY = 5;

function getDiceRollFilePath(campaignId: string): string {
  return path.join(config.campaignsDir, campaignId, '_dice-rolls.json');
}

async function readDiceRollState(campaignId: string): Promise<DiceRollState> {
  const filePath = getDiceRollFilePath(campaignId);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { rolls: [], visibleToPlayers: true };
  }
}

async function writeDiceRollState(campaignId: string, state: DiceRollState): Promise<void> {
  const filePath = getDiceRollFilePath(campaignId);
  await withFileLock(filePath, async () => {
    await fs.writeFile(filePath, JSON.stringify(state, null, 2), 'utf-8');
  });
}

// GET /dice-rolls - Get the dice roll state with history
const getDiceRolls: RequestHandler = async (_req, res) => {
  try {
    const campaign = campaignManager.getActive();
    if (!campaign) {
      res.status(400).json({ success: false, error: 'No active campaign' });
      return;
    }

    const state = await readDiceRollState(campaign.id);
    res.json({ success: true, data: state });
  } catch (error) {
    console.error('Error getting dice rolls:', error);
    res.status(500).json({ success: false, error: 'Failed to get dice rolls' });
  }
};

// POST /dice-rolls - Roll a dice (adds to history)
const rollDice: RequestHandler = async (req, res) => {
  try {
    const campaign = campaignManager.getActive();
    if (!campaign) {
      res.status(400).json({ success: false, error: 'No active campaign' });
      return;
    }

    const { diceType, rolledBy = 'dm', rollerName } = req.body;

    // Validate dice type
    const validDice = ['d4', 'd6', 'd8', 'd10', 'd12', 'd100'];
    if (!validDice.includes(diceType)) {
      res.status(400).json({ success: false, error: 'Invalid dice type' });
      return;
    }

    // Generate random result based on dice type
    const maxValue = diceType === 'd100' ? 100 : parseInt(diceType.substring(1));
    const result = Math.floor(Math.random() * maxValue) + 1;

    const roll: DiceRoll = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      diceType,
      result,
      rolledBy,
      rollerName,
      rolledAt: new Date().toISOString(),
    };

    const state = await readDiceRollState(campaign.id);

    // Add new roll to the beginning and keep only last MAX_ROLL_HISTORY
    state.rolls = [roll, ...state.rolls].slice(0, MAX_ROLL_HISTORY);

    await writeDiceRollState(campaign.id, state);

    res.json({ success: true, data: state });
  } catch (error) {
    console.error('Error rolling dice:', error);
    res.status(500).json({ success: false, error: 'Failed to roll dice' });
  }
};

// PATCH /dice-rolls/visibility - Toggle visibility of the dice roller
const toggleDiceVisibility: RequestHandler = async (req, res) => {
  try {
    const campaign = campaignManager.getActive();
    if (!campaign) {
      res.status(400).json({ success: false, error: 'No active campaign' });
      return;
    }

    const { visibleToPlayers } = req.body;

    const state = await readDiceRollState(campaign.id);
    state.visibleToPlayers = visibleToPlayers;
    await writeDiceRollState(campaign.id, state);

    res.json({ success: true, data: state });
  } catch (error) {
    console.error('Error toggling dice visibility:', error);
    res.status(500).json({ success: false, error: 'Failed to toggle dice visibility' });
  }
};

// DELETE /dice-rolls - Clear all roll history
const clearDiceRolls: RequestHandler = async (_req, res) => {
  try {
    const campaign = campaignManager.getActive();
    if (!campaign) {
      res.status(400).json({ success: false, error: 'No active campaign' });
      return;
    }

    const state = await readDiceRollState(campaign.id);
    state.rolls = [];
    await writeDiceRollState(campaign.id, state);

    res.json({ success: true, data: state });
  } catch (error) {
    console.error('Error clearing dice rolls:', error);
    res.status(500).json({ success: false, error: 'Failed to clear dice rolls' });
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
    { method: 'POST', path: '/scene-npcs', handler: addSceneNPC, middleware: [validate({ body: sceneNPCSchema })] },
    { method: 'PATCH', path: '/scene-npcs/:npcId', handler: updateSceneNPC, middleware: [validate({ body: updateSceneNPCSchema })] },
    { method: 'DELETE', path: '/scene-npcs/:npcId', handler: removeSceneNPC },
    { method: 'DELETE', path: '/scene-npcs', handler: clearSceneNPCs },
    // Scene Ships
    { method: 'GET', path: '/scene-ships', handler: getSceneShips },
    { method: 'POST', path: '/scene-ships', handler: addSceneShip, middleware: [validate({ body: sceneShipSchema })] },
    { method: 'PATCH', path: '/scene-ships/:shipId', handler: updateSceneShip, middleware: [validate({ body: updateSceneShipSchema })] },
    { method: 'DELETE', path: '/scene-ships/:shipId', handler: removeSceneShip },
    { method: 'DELETE', path: '/scene-ships', handler: clearSceneShips },
    // Dice Rolls
    { method: 'GET', path: '/dice-rolls', handler: getDiceRolls },
    { method: 'POST', path: '/dice-rolls', handler: rollDice },
    { method: 'PATCH', path: '/dice-rolls/visibility', handler: toggleDiceVisibility },
    { method: 'DELETE', path: '/dice-rolls', handler: clearDiceRolls },
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

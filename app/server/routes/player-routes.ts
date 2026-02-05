import { Router } from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileStore } from '../core/file-store.js';
import { relationshipIndex } from '../core/relationship-index.js';
import { campaignManager } from '../core/campaign-manager.js';
import { moduleRegistry } from '../modules/registry.js';
import { filterDmOnlyContent, filterDmOnlyMetadataList, isHiddenFromPlayers } from '../core/content-filter.js';
import { config } from '../config.js';
import { generateStarSystemMap } from '../modules/locations/map-generator.js';
import { upload, processAndSavePCPortrait } from '../core/upload-handler.js';
import { withFileLock } from '../core/file-lock.js';

const router = Router();

// Helper to filter out system files (IDs starting with _)
function filterSystemFiles<T extends { id: string }>(files: T[]): T[] {
  return files.filter((f) => !f.id.startsWith('_'));
}

// =============================================================================
// Player Campaign & Module Routes (Read-Only)
// =============================================================================

// Get active campaign (players need this to know which campaign to load)
router.get('/active-campaign', (_req, res) => {
  const campaign = campaignManager.getActive();
  res.json({ success: true, data: campaign });
});

// Get enabled modules for the active campaign
router.get('/modules', (_req, res) => {
  const modules = moduleRegistry.getAllInfo();
  res.json({ success: true, data: modules });
});

// =============================================================================
// Player File Routes (Read-Only, Filtered)
// =============================================================================

// List all files in a module (filtered)
router.get('/campaigns/:campaignId/files/:moduleId', async (req, res) => {
  try {
    const { campaignId, moduleId } = req.params;
    const category = req.query.category as string | undefined;

    const files = await fileStore.list(campaignId, moduleId);
    // Filter out system files (like _map-config) and DM-only content
    const nonSystemFiles = filterSystemFiles(files);
    const filtered = filterDmOnlyMetadataList(nonSystemFiles);

    // Apply category filter if specified (for playbook moves, etc.)
    const result = category
      ? filtered.filter((f) => (f as { category?: string }).category === category)
      : filtered;

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error listing files for player:', error);
    res.status(500).json({ success: false, error: 'Failed to list files' });
  }
});

// Get a single file (filtered)
router.get('/campaigns/:campaignId/files/:moduleId/:fileId', async (req, res) => {
  try {
    const { campaignId, moduleId, fileId } = req.params;
    const file = await fileStore.get(campaignId, moduleId, fileId);

    if (!file) {
      res.status(404).json({ success: false, error: 'File not found' });
      return;
    }

    // Check if this item is hidden from players
    if (isHiddenFromPlayers(file.frontmatter)) {
      res.status(404).json({ success: false, error: 'File not found' });
      return;
    }

    const filtered = filterDmOnlyContent(file);
    res.json({ success: true, data: filtered });
  } catch (error) {
    console.error('Error getting file for player:', error);
    res.status(500).json({ success: false, error: 'Failed to get file' });
  }
});

// Get relationships for a file (filtered)
router.get('/campaigns/:campaignId/relationships/:fileId', async (req, res) => {
  try {
    const { campaignId, fileId } = req.params;
    const related = await relationshipIndex.getRelated(campaignId, fileId);

    // Filter dmOnly from related file metadata
    const filtered = {
      references: filterDmOnlyMetadataList(related.references),
      referencedBy: filterDmOnlyMetadataList(related.referencedBy),
    };

    res.json({ success: true, data: filtered });
  } catch (error) {
    console.error('Error getting relationships for player:', error);
    res.status(500).json({ success: false, error: 'Failed to get relationships' });
  }
});

// =============================================================================
// Player Search Route
// =============================================================================

router.get('/campaigns/:campaignId/search', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const query = (req.query.q as string || '').toLowerCase().trim();
    const modules = (req.query.modules as string || 'npcs,lore').split(',');

    if (!query) {
      res.json({ success: true, data: [] });
      return;
    }

    const results: Array<{
      moduleId: string;
      id: string;
      name: string;
      snippet: string;
      type?: string;
    }> = [];

    for (const moduleId of modules) {
      const allFiles = await fileStore.list(campaignId, moduleId.trim());
      // Filter out system files
      const files = filterSystemFiles(allFiles);

      for (const file of files) {
        // Skip hidden items
        if (isHiddenFromPlayers(file)) {
          continue;
        }

        // Search in name
        const nameMatch = file.name.toLowerCase().includes(query);

        // Search in other visible fields (not dmOnly or hidden)
        const { dmOnly, hidden, ...visibleFields } = file as Record<string, unknown>;
        const fieldValues = Object.values(visibleFields)
          .filter((v) => typeof v === 'string')
          .join(' ')
          .toLowerCase();
        const fieldMatch = fieldValues.includes(query);

        if (nameMatch || fieldMatch) {
          // Create a snippet from matching content
          let snippet = '';
          if (typeof visibleFields.personality === 'string') {
            snippet = visibleFields.personality.slice(0, 100);
          } else if (typeof visibleFields.appearance === 'string') {
            snippet = visibleFields.appearance.slice(0, 100);
          }

          results.push({
            moduleId: moduleId.trim(),
            id: file.id,
            name: file.name,
            snippet: snippet + (snippet.length >= 100 ? '...' : ''),
            type: visibleFields.type as string | undefined,
          });
        }
      }
    }

    // Sort by name
    results.sort((a, b) => a.name.localeCompare(b.name));

    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Error searching for player:', error);
    res.status(500).json({ success: false, error: 'Search failed' });
  }
});

// =============================================================================
// Player Session Notes (Write Access)
// =============================================================================

// Create a session note
router.post('/campaigns/:campaignId/files/session-notes', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { name, frontmatter, content } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, error: 'Name is required' });
      return;
    }

    const file = await fileStore.create(campaignId, 'session-notes', {
      name: name.trim(),
      frontmatter: frontmatter || {},
      content: content || '',
    });

    res.status(201).json({ success: true, data: file });
  } catch (error) {
    console.error('Error creating session notes:', error);
    res.status(500).json({ success: false, error: 'Failed to create session notes' });
  }
});

// Update a session note
router.put('/campaigns/:campaignId/files/session-notes/:fileId', async (req, res) => {
  try {
    const { campaignId, fileId } = req.params;
    const { name, frontmatter, content } = req.body;

    const existingFile = await fileStore.get(campaignId, 'session-notes', fileId);
    if (!existingFile) {
      res.status(404).json({ success: false, error: 'Session notes not found' });
      return;
    }

    const updated = await fileStore.update(campaignId, 'session-notes', fileId, {
      name,
      frontmatter: frontmatter || {},
      content,
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating session notes:', error);
    res.status(500).json({ success: false, error: 'Failed to update session notes' });
  }
});

// Delete a session note
router.delete('/campaigns/:campaignId/files/session-notes/:fileId', async (req, res) => {
  try {
    const { campaignId, fileId } = req.params;

    const existingFile = await fileStore.get(campaignId, 'session-notes', fileId);
    if (!existingFile) {
      res.status(404).json({ success: false, error: 'Session notes not found' });
      return;
    }

    const success = await fileStore.delete(campaignId, 'session-notes', fileId);
    if (!success) {
      res.status(404).json({ success: false, error: 'Session notes not found' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting session notes:', error);
    res.status(500).json({ success: false, error: 'Failed to delete session notes' });
  }
});

// =============================================================================
// Player Character Updates (Write Access for Own Characters)
// =============================================================================

// Full update for a player character (for character sheet editing)
// Players can edit the full character details
router.put('/campaigns/:campaignId/files/player-characters/:fileId', async (req, res) => {
  try {
    const { campaignId, fileId } = req.params;

    const pc = await fileStore.get(campaignId, 'player-characters', fileId);

    if (!pc) {
      res.status(404).json({ success: false, error: 'Character not found' });
      return;
    }

    // Update the character with the provided data
    const { frontmatter, content } = req.body;

    const updated = await fileStore.update(campaignId, 'player-characters', fileId, {
      frontmatter: frontmatter || {},
      content: content,
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating player character:', error);
    res.status(500).json({ success: false, error: 'Failed to update character' });
  }
});

// Update trackers for a player character (for Live Play)
// This is intentionally limited to only tracker fields for safety
router.patch('/campaigns/:campaignId/files/player-characters/:fileId/trackers', async (req, res) => {
  try {
    const { campaignId, fileId } = req.params;

    const pc = await fileStore.get(campaignId, 'player-characters', fileId);

    if (!pc) {
      res.status(404).json({ success: false, error: 'Character not found' });
      return;
    }

    // Only allow updating tracker fields
    const allowedFields = ['pressure', 'harm', 'resources', 'experience', 'luck', 'gear'];
    const updates: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ success: false, error: 'No valid tracker fields to update' });
      return;
    }

    const updated = await fileStore.update(campaignId, 'player-characters', fileId, {
      frontmatter: updates,
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating trackers for player:', error);
    res.status(500).json({ success: false, error: 'Failed to update trackers' });
  }
});

// =============================================================================
// Player Character Portrait Upload
// =============================================================================

// Upload a portrait for a player character (players can upload their own portraits)
router.post(
  '/campaigns/:campaignId/pc-portraits/:pcId',
  upload.single('image'),
  async (req, res) => {
    try {
      const { campaignId, pcId } = req.params;

      if (!req.file) {
        res.status(400).json({ success: false, error: 'No file uploaded' });
        return;
      }

      // Verify the character exists
      const pc = await fileStore.get(campaignId, 'player-characters', pcId);
      if (!pc) {
        res.status(404).json({ success: false, error: 'Character not found' });
        return;
      }

      const portraitPath = await processAndSavePCPortrait(
        campaignId,
        pcId,
        req.file.buffer
      );

      res.json({ success: true, data: { path: portraitPath } });
    } catch (error) {
      console.error('Error uploading PC portrait:', error);
      const message = error instanceof Error ? error.message : 'Failed to upload portrait';
      res.status(500).json({ success: false, error: message });
    }
  }
);

// =============================================================================
// Player Map Route (Read-Only, Filtered)
// =============================================================================

// Get the generated map HTML for players (hidden celestial bodies filtered)
router.get('/campaigns/:campaignId/map', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const campaignPath = path.join(config.campaignsDir, campaignId);
    const playerMapPath = path.join(campaignPath, 'player-system-map.html');

    // Try to read existing player map
    try {
      const html = await fs.readFile(playerMapPath, 'utf-8');
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch {
      // Player map doesn't exist, generate it from filtered locations
      const allLocations = await fileStore.list(campaignId, 'locations');

      // Filter out system files and hidden locations
      const nonSystemLocations = filterSystemFiles(allLocations);
      const visibleLocations = nonSystemLocations.filter(
        (loc) => !isHiddenFromPlayers(loc)
      );

      if (visibleLocations.length === 0) {
        res.status(404).json({ success: false, error: 'No visible map data' });
        return;
      }

      // Generate player-specific map
      const result = await generateStarSystemMap({
        campaignPath,
        locations: visibleLocations,
        outputPath: playerMapPath,
      });

      if (result.success) {
        const html = await fs.readFile(playerMapPath, 'utf-8');
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
      } else {
        res.status(404).json({ success: false, error: result.error || 'Map not found' });
      }
    }
  } catch (error) {
    console.error('Error reading player map:', error);
    res.status(500).json({ success: false, error: 'Failed to read map' });
  }
});

// =============================================================================
// Player Scene NPCs Route (Read-Only, Filtered by visibility)
// =============================================================================

// Get scene NPCs that are visible to players
router.get('/scene-npcs', async (_req, res) => {
  try {
    const campaign = campaignManager.getActive();
    if (!campaign) {
      res.status(400).json({ success: false, error: 'No active campaign' });
      return;
    }

    // Read scene NPCs from the campaign's _scene-npcs.json file
    const scenePath = path.join(config.campaignsDir, campaign.id, '_scene-npcs.json');
    let allNPCs: Array<{
      id: string;
      name: string;
      occupation?: string;
      portrait?: string;
      portraitPosition?: { x: number; y: number; scale: number };
      isAntagonist?: boolean;
      hasStats?: boolean;
      disposition?: string;
      antagonistStats?: {
        damage?: number;
        maxDamage?: number;
        armor?: number;
        moves?: string;
      };
      stats?: {
        damage?: number;
        maxDamage?: number;
        armor?: number;
        moves?: string;
      };
      visibleToPlayers?: boolean;
    }> = [];

    try {
      const content = await fs.readFile(scenePath, 'utf-8');
      allNPCs = JSON.parse(content);
    } catch {
      // File doesn't exist or is invalid - return empty array
      allNPCs = [];
    }

    // Filter to only visible NPCs and strip sensitive data
    const visibleNPCs = allNPCs
      .filter(npc => npc.visibleToPlayers !== false)
      .map(npc => {
        // Support both old (antagonistStats) and new (stats) field names
        const hasStats = npc.hasStats ?? npc.isAntagonist ?? false;
        const stats = npc.stats ?? npc.antagonistStats;

        return {
          id: npc.id,
          name: npc.name,
          occupation: npc.occupation,
          portrait: npc.portrait,
          portraitPosition: npc.portraitPosition,
          disposition: npc.disposition,
          isAntagonist: npc.isAntagonist,
          hasStats,
          // Only include defeated status, not actual stats
          antagonistStats: hasStats && stats ? {
            // Calculate if defeated without exposing actual numbers
            damage: (stats.damage || 0) >= (stats.maxDamage || 10)
              ? (stats.maxDamage || 10) // Just indicate "full damage" for defeated
              : 0, // Otherwise show 0
            maxDamage: stats.maxDamage || 10,
          } : undefined,
          stats: hasStats && stats ? {
            damage: (stats.damage || 0) >= (stats.maxDamage || 10)
              ? (stats.maxDamage || 10)
              : 0,
            maxDamage: stats.maxDamage || 10,
          } : undefined,
        };
      });

    res.json({ success: true, data: visibleNPCs });
  } catch (error) {
    console.error('Error getting scene NPCs for player:', error);
    res.status(500).json({ success: false, error: 'Failed to get scene NPCs' });
  }
});

// =============================================================================
// Player Scene Ships Route (Read-Only, Filtered by visibility)
// =============================================================================

// Get scene ships that are visible to players
router.get('/scene-ships', async (_req, res) => {
  try {
    const campaign = campaignManager.getActive();
    if (!campaign) {
      res.status(400).json({ success: false, error: 'No active campaign' });
      return;
    }

    const scenePath = path.join(config.campaignsDir, campaign.id, '_scene-ships.json');
    let allShips: Array<{
      id: string;
      name: string;
      type?: string;
      class?: string;
      image?: string;
      isCrewShip?: boolean;
      disposition?: string;
      pressure?: number;
      damage?: Record<string, { minor?: string; major?: string }>;
      visibleToPlayers?: boolean;
    }> = [];

    try {
      const content = await fs.readFile(scenePath, 'utf-8');
      allShips = JSON.parse(content);
    } catch {
      allShips = [];
    }

    // Filter to only visible ships
    const visibleShips = allShips
      .filter(ship => ship.visibleToPlayers !== false)
      .map(ship => ({
        id: ship.id,
        name: ship.name,
        type: ship.type,
        class: ship.class,
        image: ship.image,
        isCrewShip: ship.isCrewShip,
        disposition: ship.disposition,
        pressure: ship.pressure,
        damage: ship.damage, // Players can see damage on visible ships
      }));

    res.json({ success: true, data: visibleShips });
  } catch (error) {
    console.error('Error getting scene ships for player:', error);
    res.status(500).json({ success: false, error: 'Failed to get scene ships' });
  }
});

// Update crew ship (players can update crew ships)
router.patch('/scene-ships/:shipId', async (req, res) => {
  try {
    const campaign = campaignManager.getActive();
    if (!campaign) {
      res.status(400).json({ success: false, error: 'No active campaign' });
      return;
    }

    const { shipId } = req.params;
    const updates = req.body;

    const scenePath = path.join(config.campaignsDir, campaign.id, '_scene-ships.json');

    // Use file lock to prevent race conditions during read-modify-write
    type ShipUpdateResult = { data: unknown[] } | { error: string; status: number };
    const result: ShipUpdateResult = await withFileLock(scenePath, async () => {
      let ships: Array<{
        id: string;
        name: string;
        isCrewShip?: boolean;
        [key: string]: unknown;
      }> = [];

      try {
        const content = await fs.readFile(scenePath, 'utf-8');
        ships = JSON.parse(content);
      } catch {
        return { error: 'Ship not found', status: 404 };
      }

      const index = ships.findIndex(s => s.id === shipId);
      if (index === -1) {
        return { error: 'Ship not found', status: 404 };
      }

      // Players can only update crew ships
      if (!ships[index].isCrewShip) {
        return { error: 'Cannot update non-crew ships', status: 403 };
      }

      // Only allow updating certain fields
      const allowedFields = ['pressure', 'damage'];
      const safeUpdates: Record<string, unknown> = {};
      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          safeUpdates[field] = updates[field];
        }
      }

      ships[index] = {
        ...ships[index],
        ...safeUpdates,
        // Deep merge damage
        damage: updates.damage
          ? { ...(ships[index].damage as Record<string, unknown>), ...updates.damage }
          : ships[index].damage,
      };

      await fs.writeFile(scenePath, JSON.stringify(ships, null, 2), 'utf-8');

      // Return filtered list for players
      const visibleShips = ships
        .filter(ship => ship.visibleToPlayers !== false)
        .map(ship => ({
          id: ship.id,
          name: ship.name,
          type: ship.type,
          class: ship.class,
          image: ship.image,
          isCrewShip: ship.isCrewShip,
          disposition: ship.disposition,
          pressure: ship.pressure,
          damage: ship.damage,
        }));

      return { data: visibleShips };
    });

    if ('error' in result) {
      res.status(result.status).json({ success: false, error: result.error });
      return;
    }

    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Error updating crew ship:', error);
    res.status(500).json({ success: false, error: 'Failed to update ship' });
  }
});

// =============================================================================
// Player Tactical Boards (Read-Only, Filtered)
// =============================================================================

// List tactical boards (filtered for players)
router.get('/tactical-boards', async (_req, res) => {
  try {
    const campaign = campaignManager.getActive();
    if (!campaign) {
      res.status(400).json({ success: false, error: 'No active campaign' });
      return;
    }

    const boards = await fileStore.list(campaign.id, 'tactical-boards');

    // Filter out hidden boards and filter tokens to only visible ones
    // Note: list returns FileMetadata which includes frontmatter fields
    const visibleBoards = boards
      .filter((board) => !(board as Record<string, unknown>).hidden)
      .map((board) => {
        const boardData = board as Record<string, unknown>;
        const tokens = (boardData.tokens || []) as Array<{ visibleToPlayers?: boolean }>;
        return {
          ...boardData,
          tokens: tokens.filter((token) => token.visibleToPlayers !== false),
        };
      });

    res.json({ success: true, data: visibleBoards });
  } catch (error) {
    console.error('Error listing tactical boards for player:', error);
    res.status(500).json({ success: false, error: 'Failed to list boards' });
  }
});

// Get a single tactical board (filtered for players)
router.get('/tactical-boards/:boardId', async (req, res) => {
  try {
    const campaign = campaignManager.getActive();
    if (!campaign) {
      res.status(400).json({ success: false, error: 'No active campaign' });
      return;
    }

    const { boardId } = req.params;
    const parsedFile = await fileStore.get(campaign.id, 'tactical-boards', boardId);

    if (!parsedFile) {
      res.status(404).json({ success: false, error: 'Board not found' });
      return;
    }

    const boardData = parsedFile.frontmatter as Record<string, unknown>;

    if (boardData.hidden) {
      res.status(404).json({ success: false, error: 'Board not found' });
      return;
    }

    // Filter tokens to only show visible ones
    const tokens = (boardData.tokens || []) as Array<{ visibleToPlayers?: boolean }>;
    const filteredBoard = {
      ...boardData,
      tokens: tokens.filter((token) => token.visibleToPlayers !== false),
    };

    res.json({ success: true, data: filteredBoard });
  } catch (error) {
    console.error('Error getting tactical board for player:', error);
    res.status(500).json({ success: false, error: 'Failed to get board' });
  }
});

// =============================================================================
// Player Dice Rolls
// =============================================================================

interface DiceRoll {
  id: string;
  diceType: string;
  result: number;
  rolledBy: 'dm' | 'player';
  rollerName?: string;
  rolledAt: string;
}

interface DiceRollState {
  rolls: DiceRoll[];
  visibleToPlayers: boolean;
}

// Get dice rolls (only if visible to players)
router.get('/dice-rolls', async (_req, res) => {
  try {
    const campaign = campaignManager.getActive();
    if (!campaign) {
      res.status(400).json({ success: false, error: 'No active campaign' });
      return;
    }

    const filePath = path.join(config.campaignsDir, campaign.id, '_dice-rolls.json');
    let state: DiceRollState = { rolls: [], visibleToPlayers: true };

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      state = JSON.parse(content);
    } catch {
      // File doesn't exist - return empty state
    }

    // If not visible to players, return empty rolls
    if (!state.visibleToPlayers) {
      res.json({ success: true, data: { rolls: [], visibleToPlayers: false } });
      return;
    }

    res.json({ success: true, data: state });
  } catch (error) {
    console.error('Error getting dice rolls for player:', error);
    res.status(500).json({ success: false, error: 'Failed to get dice rolls' });
  }
});

// Roll dice (players can roll)
router.post('/dice-rolls', async (req, res) => {
  try {
    const campaign = campaignManager.getActive();
    if (!campaign) {
      res.status(400).json({ success: false, error: 'No active campaign' });
      return;
    }

    const { diceType, rollerName } = req.body;

    // Validate dice type
    const validDice = ['d4', 'd6', 'd8', 'd10', 'd12', 'd100'];
    if (!validDice.includes(diceType)) {
      res.status(400).json({ success: false, error: 'Invalid dice type' });
      return;
    }

    // Generate random result
    const maxValue = diceType === 'd100' ? 100 : parseInt(diceType.substring(1));
    const result = Math.floor(Math.random() * maxValue) + 1;

    const roll: DiceRoll = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      diceType,
      result,
      rolledBy: 'player',
      rollerName,
      rolledAt: new Date().toISOString(),
    };

    const filePath = path.join(config.campaignsDir, campaign.id, '_dice-rolls.json');

    // Use file lock to prevent race conditions during read-modify-write
    const state = await withFileLock(filePath, async () => {
      let currentState: DiceRollState = { rolls: [], visibleToPlayers: true };

      try {
        const content = await fs.readFile(filePath, 'utf-8');
        currentState = JSON.parse(content);
      } catch {
        // File doesn't exist - use default state
      }

      // Add new roll to the beginning and keep only last 5
      currentState.rolls = [roll, ...currentState.rolls].slice(0, 5);

      await fs.writeFile(filePath, JSON.stringify(currentState, null, 2), 'utf-8');

      return currentState;
    });

    res.json({ success: true, data: state });
  } catch (error) {
    console.error('Error rolling dice for player:', error);
    res.status(500).json({ success: false, error: 'Failed to roll dice' });
  }
});

// =============================================================================
// Player Initiative (Read-Only)
// =============================================================================

interface InitiativeEntry {
  id: string;
  sourceType: 'pc' | 'npc' | 'ship' | 'custom';
  sourceId?: string;
  name: string;
  portrait?: string;
  portraitPosition?: { x: number; y: number; scale: number };
  initiative: number;
  isActive: boolean;
  notes?: string;
}

interface InitiativeState {
  entries: InitiativeEntry[];
  currentRound: number;
  isActive: boolean;
  visibleToPlayers: boolean;
}

// Get initiative state for players
router.get('/initiative', async (_req, res) => {
  try {
    const campaign = campaignManager.getActive();
    if (!campaign) {
      res.status(400).json({ success: false, error: 'No active campaign' });
      return;
    }

    const filePath = path.join(config.campaignsDir, campaign.id, '_initiative.json');
    let state: InitiativeState = {
      entries: [],
      currentRound: 1,
      isActive: false,
      visibleToPlayers: true,
    };

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      state = JSON.parse(content);
    } catch {
      // File doesn't exist - return default state
    }

    // If not visible to players, return minimal state
    if (!state.visibleToPlayers) {
      res.json({
        success: true,
        data: {
          entries: [],
          currentRound: state.currentRound,
          isActive: false,
          visibleToPlayers: false,
        },
      });
      return;
    }

    // Remove DM notes from entries
    const entriesWithoutNotes = state.entries.map((entry) => ({
      ...entry,
      notes: undefined,
    }));

    res.json({
      success: true,
      data: {
        ...state,
        entries: entriesWithoutNotes,
      },
    });
  } catch (error) {
    console.error('Error getting initiative for player:', error);
    res.status(500).json({ success: false, error: 'Failed to get initiative' });
  }
});

export const playerRoutes = router;

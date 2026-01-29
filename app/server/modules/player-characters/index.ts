import type { RequestHandler } from 'express';
import { playerCharacterSchema } from '../../../shared/schemas/player-character.js';
import { createBaseRoutes } from '../base-routes.js';
import { moduleRegistry } from '../registry.js';
import { fileStore } from '../../core/file-store.js';
import { campaignManager } from '../../core/campaign-manager.js';
import type { ModuleDefinition, ModuleRoute } from '../../../shared/types/module.js';
import type { ParsedFile, FileMetadata } from '../../../shared/types/file.js';

// Placeholder views - will be replaced by actual React components
const PlaceholderView = () => null;

// Get playbook moves for a character (fetches full rule data)
const getMovesHandler: RequestHandler = async (req, res) => {
  try {
    const campaign = campaignManager.getActive();
    if (!campaign) {
      res.status(400).json({ success: false, error: 'No active campaign' });
      return;
    }

    const { fileId } = req.params;
    const pc = await fileStore.get(campaign.id, 'player-characters', fileId);

    if (!pc) {
      res.status(404).json({ success: false, error: 'Character not found' });
      return;
    }

    const playbookMoves = (pc.frontmatter.playbookMoves as string[]) || [];

    // Fetch each move from the rules module
    const moves: ParsedFile[] = [];
    for (const moveId of playbookMoves) {
      try {
        const move = await fileStore.get(campaign.id, 'rules', moveId);
        if (move) {
          moves.push(move);
        }
      } catch {
        // Skip missing moves
      }
    }

    res.json({ success: true, data: moves });
  } catch (error) {
    console.error('Error getting moves:', error);
    res.status(500).json({ success: false, error: 'Failed to get moves' });
  }
};

// Quick update for tracker values only (used by Live Play)
const updateTrackersHandler: RequestHandler = async (req, res) => {
  try {
    const campaign = campaignManager.getActive();
    if (!campaign) {
      res.status(400).json({ success: false, error: 'No active campaign' });
      return;
    }

    const { fileId } = req.params;
    const pc = await fileStore.get(campaign.id, 'player-characters', fileId);

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

    const updated = await fileStore.update(campaign.id, 'player-characters', fileId, {
      frontmatter: updates,
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating trackers:', error);
    res.status(500).json({ success: false, error: 'Failed to update trackers' });
  }
};

// Get available playbook moves (all rules in playbook-move category)
const getAvailableMovesHandler: RequestHandler = async (_req, res) => {
  try {
    const campaign = campaignManager.getActive();
    if (!campaign) {
      res.status(400).json({ success: false, error: 'No active campaign' });
      return;
    }

    const rules = await fileStore.list(campaign.id, 'rules');
    const playbookMoves = rules.filter(
      (rule) => rule.category === 'playbook-move'
    );

    res.json({ success: true, data: playbookMoves });
  } catch (error) {
    console.error('Error getting available moves:', error);
    res.status(500).json({ success: false, error: 'Failed to get available moves' });
  }
};

// Get related NPCs for a character
const getRelatedNPCsHandler: RequestHandler = async (req, res) => {
  try {
    const campaign = campaignManager.getActive();
    if (!campaign) {
      res.status(400).json({ success: false, error: 'No active campaign' });
      return;
    }

    const { fileId } = req.params;
    const pc = await fileStore.get(campaign.id, 'player-characters', fileId);

    if (!pc) {
      res.status(404).json({ success: false, error: 'Character not found' });
      return;
    }

    const npcConnections = (pc.frontmatter.npcConnections as string[]) || [];

    // Fetch metadata for each NPC
    const npcs: FileMetadata[] = [];
    const allNPCs = await fileStore.list(campaign.id, 'npcs');

    for (const npcId of npcConnections) {
      const npc = allNPCs.find((n) => n.id === npcId);
      if (npc) {
        npcs.push(npc);
      }
    }

    res.json({ success: true, data: npcs });
  } catch (error) {
    console.error('Error getting related NPCs:', error);
    res.status(500).json({ success: false, error: 'Failed to get related NPCs' });
  }
};

// Custom routes
const customRoutes: ModuleRoute[] = [
  { method: 'GET', path: '/:fileId/moves', handler: getMovesHandler },
  { method: 'PATCH', path: '/:fileId/trackers', handler: updateTrackersHandler },
  { method: 'GET', path: '/available-moves', handler: getAvailableMovesHandler },
  { method: 'GET', path: '/:fileId/related-npcs', handler: getRelatedNPCsHandler },
];

// Base routes for CRUD
const baseRoutes = createBaseRoutes('player-characters');

export const playerCharactersModule: ModuleDefinition = {
  id: 'player-characters',
  name: 'Player Characters',
  icon: 'Users',
  description: 'Character sheets and player character management',
  dataFolder: 'player-characters',
  schema: playerCharacterSchema,
  routes: [...customRoutes, ...baseRoutes],
  views: {
    list: PlaceholderView,
    detail: PlaceholderView,
    edit: PlaceholderView,
  },
  playerSite: {
    enabled: true,
  },
};

// Register the module
moduleRegistry.register(playerCharactersModule);

export default playerCharactersModule;

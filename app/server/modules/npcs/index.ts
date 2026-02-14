/**
 * NPC module: CRUD for NPCs/entities plus AI-powered NPC generation.
 */

import type { RequestHandler } from 'express';
import { npcSchema } from '../../../shared/schemas/npc.js';
import { createBaseRoutes } from '../base-routes.js';
import { moduleRegistry } from '../registry.js';
import { relationshipIndex } from '../../core/relationship-index.js';
import { campaignManager } from '../../core/campaign-manager.js';
import { generateNPC } from './ai-generator.js';
import type { ModuleDefinition, ModuleRoute } from '../../../shared/types/module.js';

// Placeholder views - will be replaced by actual React components
const PlaceholderView = () => null;

// Tell the relationship index which frontmatter fields link NPCs together
relationshipIndex.registerFields('npcs', ['relatedCharacters']);

// ── AI Generation Route ────────────────────────────────────────────────

const generateHandler: RequestHandler = async (req, res) => {
  try {
    const campaign = campaignManager.getActive();
    if (!campaign) {
      res.status(400).json({ success: false, error: 'No active campaign' });
      return;
    }

    const { prompt, includeSecrets } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ success: false, error: 'Prompt is required' });
      return;
    }

    const generated = await generateNPC({ prompt, includeSecrets });
    res.json({ success: true, data: generated });
  } catch (error) {
    console.error('Error generating NPC:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate NPC';
    res.status(500).json({ success: false, error: message });
  }
};

// ── Route Assembly ─────────────────────────────────────────────────────
// Merge generic CRUD routes with the AI generation endpoint
const baseRoutes = createBaseRoutes('npcs');
const customRoutes: ModuleRoute[] = [
  { method: 'POST', path: '/generate', handler: generateHandler },
];

// ── Module Definition ──────────────────────────────────────────────────

export const npcsModule: ModuleDefinition = {
  id: 'npcs',
  name: 'NPCs + Entities',
  icon: 'Users',
  description: 'NPCs, creatures, monsters, robots, and other entities',
  dataFolder: 'npcs',
  schema: npcSchema,
  routes: [...baseRoutes, ...customRoutes],
  views: {
    list: PlaceholderView,
    detail: PlaceholderView,
  },
  ai: {
    enabled: true,
    generateEndpoint: '/generate',
  },
};

// Register the module
moduleRegistry.register(npcsModule);

export default npcsModule;

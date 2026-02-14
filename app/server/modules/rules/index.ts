/**
 * Rules module: CRUD for game rules/moves with category filtering and search.
 *
 * Rules are categorised (e.g. "basic-move", "playbook-move") and can be
 * searched by name or tag. This module also exposes data to the player site
 * so players can look up moves during play.
 */

import type { RequestHandler } from 'express';
import { ruleSchema, ruleCategories } from '../../../shared/schemas/rules.js';
import { createBaseRoutes } from '../base-routes.js';
import { moduleRegistry } from '../registry.js';
import { fileStore } from '../../core/file-store.js';
import { campaignManager } from '../../core/campaign-manager.js';
import type { ModuleDefinition, ModuleRoute } from '../../../shared/types/module.js';

// Placeholder views - will be replaced by actual React components
const PlaceholderView = () => null;

// ── Custom Route Handlers ──────────────────────────────────────────────

/** Return all known categories and which ones have at least one rule */
const getCategoriesHandler: RequestHandler = async (_req, res) => {
  try {
    const campaign = campaignManager.getActive();
    if (!campaign) {
      res.status(400).json({ success: false, error: 'No active campaign' });
      return;
    }

    const files = await fileStore.list(campaign.id, 'rules');
    const categoriesInUse = new Set<string>();

    for (const file of files) {
      const category = file.category as string | undefined;
      if (category) {
        categoriesInUse.add(category);
      }
    }

    // Return both all categories and which are in use
    res.json({
      success: true,
      data: {
        all: ruleCategories,
        inUse: Array.from(categoriesInUse),
      },
    });
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({ success: false, error: 'Failed to get categories' });
  }
};

/** Search rules by name and tags (metadata-only; full-text search is a TODO) */
const searchHandler: RequestHandler = async (req, res) => {
  try {
    const campaign = campaignManager.getActive();
    if (!campaign) {
      res.status(400).json({ success: false, error: 'No active campaign' });
      return;
    }

    const query = (req.query.q as string || '').toLowerCase().trim();
    if (!query) {
      res.status(400).json({ success: false, error: 'Search query required' });
      return;
    }

    const files = await fileStore.list(campaign.id, 'rules');
    const results = [];

    // Match against name and tags from metadata (avoids loading full content)
    for (const file of files) {
      const nameMatch = file.name.toLowerCase().includes(query);
      const tagsMatch = (file.tags as string[] || []).some((tag) =>
        tag.toLowerCase().includes(query)
      );

      if (nameMatch || tagsMatch) {
        results.push(file);
      }
    }

    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Error searching rules:', error);
    res.status(500).json({ success: false, error: 'Failed to search rules' });
  }
};

/** Filter rules to only those matching a specific category */
const byCategoryHandler: RequestHandler = async (req, res) => {
  try {
    const campaign = campaignManager.getActive();
    if (!campaign) {
      res.status(400).json({ success: false, error: 'No active campaign' });
      return;
    }

    const { category } = req.params;
    const files = await fileStore.list(campaign.id, 'rules');
    const filtered = files.filter((file) => file.category === category);

    res.json({ success: true, data: filtered });
  } catch (error) {
    console.error('Error filtering rules:', error);
    res.status(500).json({ success: false, error: 'Failed to filter rules' });
  }
};

// ── Route Assembly ─────────────────────────────────────────────────────
// Custom routes are registered before base routes so that more-specific
// paths (e.g. /categories, /search) match before the generic /:fileId.
const customRoutes: ModuleRoute[] = [
  { method: 'GET', path: '/categories', handler: getCategoriesHandler },
  { method: 'GET', path: '/search', handler: searchHandler },
  { method: 'GET', path: '/by-category/:category', handler: byCategoryHandler },
];

// Base routes for CRUD
const baseRoutes = createBaseRoutes('rules');

// ── Module Definition ──────────────────────────────────────────────────

export const rulesModule: ModuleDefinition = {
  id: 'rules',
  name: 'Rules',
  icon: 'BookText',
  description: 'Game rules, moves, and mechanics reference',
  dataFolder: 'rules',
  schema: ruleSchema,
  routes: [...customRoutes, ...baseRoutes],
  views: {
    list: PlaceholderView,
    detail: PlaceholderView,
  },
  playerSite: {
    enabled: true,
  },
};

// Register the module
moduleRegistry.register(rulesModule);

export default rulesModule;

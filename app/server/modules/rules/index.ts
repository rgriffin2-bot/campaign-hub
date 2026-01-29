import type { RequestHandler } from 'express';
import { ruleSchema, ruleCategories } from '../../../shared/schemas/rules.js';
import { createBaseRoutes } from '../base-routes.js';
import { moduleRegistry } from '../registry.js';
import { fileStore } from '../../core/file-store.js';
import { campaignManager } from '../../core/campaign-manager.js';
import type { ModuleDefinition, ModuleRoute } from '../../../shared/types/module.js';

// Placeholder views - will be replaced by actual React components
const PlaceholderView = () => null;

// Get all categories currently in use
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

// Search rules by name and content
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

    for (const file of files) {
      // Search in name, tags, and we'd need to load content for full-text
      const nameMatch = file.name.toLowerCase().includes(query);
      const tagsMatch = (file.tags as string[] || []).some((tag) =>
        tag.toLowerCase().includes(query)
      );

      if (nameMatch || tagsMatch) {
        results.push(file);
      }
    }

    // For full-text content search, load each file (this could be optimized)
    // For now, just search metadata

    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Error searching rules:', error);
    res.status(500).json({ success: false, error: 'Failed to search rules' });
  }
};

// Filter rules by category
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

// Custom routes
const customRoutes: ModuleRoute[] = [
  { method: 'GET', path: '/categories', handler: getCategoriesHandler },
  { method: 'GET', path: '/search', handler: searchHandler },
  { method: 'GET', path: '/by-category/:category', handler: byCategoryHandler },
];

// Base routes for CRUD
const baseRoutes = createBaseRoutes('rules');

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

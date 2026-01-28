import type { RequestHandler } from 'express';
import * as path from 'path';
import * as fs from 'fs/promises';
import {
  locationFrontmatterSchema,
  mapConfigSchema,
  DEFAULT_MAP_CONFIG,
  type MapConfig,
} from '../../../shared/schemas/location.js';
import { createBaseRoutes } from '../base-routes.js';
import { moduleRegistry } from '../registry.js';
import { relationshipIndex } from '../../core/relationship-index.js';
import { fileStore } from '../../core/file-store.js';
import { campaignManager } from '../../core/campaign-manager.js';
import { validateParentAssignment } from './cycle-detection.js';
import { generateStarSystemMap } from './map-generator.js';
import type { ModuleDefinition, ModuleRoute } from '../../../shared/types/module.js';

// Placeholder views - will be replaced by actual React components
const PlaceholderView = () => null;

// Register relationship fields for locations (parent field for hierarchy)
relationshipIndex.registerFields('locations', ['parent']);

// Helper to filter out system files (IDs starting with _)
function filterSystemFiles<T extends { id: string }>(files: T[]): T[] {
  return files.filter((f) => !f.id.startsWith('_'));
}

// Helper to invalidate cached player map when locations change
async function invalidatePlayerMapCache(campaignId: string) {
  const campaignPath = path.join(process.cwd(), 'campaigns', campaignId);
  const playerMapPath = path.join(campaignPath, 'player-system-map.html');
  try {
    await fs.unlink(playerMapPath);
  } catch {
    // Player map doesn't exist yet, that's fine
  }
}

// Custom list handler that excludes system files like _map-config
const listLocationsHandler: RequestHandler = async (_req, res) => {
  try {
    const campaign = campaignManager.getActive();
    if (!campaign) {
      res.status(400).json({ success: false, error: 'No active campaign' });
      return;
    }

    const files = await fileStore.list(campaign.id, 'locations');
    const filteredFiles = filterSystemFiles(files);
    res.json({ success: true, data: filteredFiles });
  } catch (error) {
    console.error('Error listing locations:', error);
    res.status(500).json({ success: false, error: 'Failed to list locations' });
  }
};

// Custom update handler with cycle detection
const updateWithCycleCheck: RequestHandler = async (req, res) => {
  try {
    const campaign = campaignManager.getActive();
    if (!campaign) {
      res.status(400).json({ success: false, error: 'No active campaign' });
      return;
    }

    const { fileId } = req.params;
    const proposedParent = req.body.frontmatter?.parent;

    // If parent is being set, validate it won't create a cycle
    if (proposedParent !== undefined) {
      const allLocations = await fileStore.list(campaign.id, 'locations');
      const error = validateParentAssignment(allLocations, fileId, proposedParent);
      if (error) {
        res.status(400).json({ success: false, error });
        return;
      }
    }

    const file = await fileStore.update(campaign.id, 'locations', fileId, req.body);

    if (!file) {
      res.status(404).json({ success: false, error: 'File not found' });
      return;
    }

    await invalidatePlayerMapCache(campaign.id);
    res.json({ success: true, data: file });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ success: false, error: 'Failed to update location' });
  }
};

// Custom create handler with cycle detection (for when parent is set on creation)
const createWithCycleCheck: RequestHandler = async (req, res) => {
  try {
    const campaign = campaignManager.getActive();
    if (!campaign) {
      res.status(400).json({ success: false, error: 'No active campaign' });
      return;
    }

    const proposedParent = req.body.frontmatter?.parent;

    // If parent is being set, validate it exists
    if (proposedParent) {
      const allLocations = await fileStore.list(campaign.id, 'locations');
      const parentExists = allLocations.some((loc) => loc.id === proposedParent);
      if (!parentExists) {
        res.status(400).json({ success: false, error: 'Parent location not found' });
        return;
      }
    }

    const file = await fileStore.create(campaign.id, 'locations', req.body);
    await invalidatePlayerMapCache(campaign.id);
    res.status(201).json({ success: true, data: file });
  } catch (error) {
    console.error('Error creating location:', error);
    res.status(500).json({ success: false, error: 'Failed to create location' });
  }
};

// Helper to read map config from _map-config.md
async function readMapConfig(campaignId: string): Promise<MapConfig> {
  try {
    const configFile = await fileStore.get(campaignId, 'locations', '_map-config');
    if (configFile) {
      // Parse and validate the config
      const parsed = mapConfigSchema.safeParse(configFile);
      if (parsed.success) {
        return parsed.data;
      }
      console.warn('Invalid map config, using defaults:', parsed.error);
    }
  } catch {
    // Config file doesn't exist, use defaults
  }
  return DEFAULT_MAP_CONFIG;
}

// Map generation handler
const generateMapHandler: RequestHandler = async (_req, res) => {
  try {
    const campaign = campaignManager.getActive();
    if (!campaign) {
      res.status(400).json({ success: false, error: 'No active campaign' });
      return;
    }

    const locations = await fileStore.list(campaign.id, 'locations');
    const campaignPath = path.join(process.cwd(), 'campaigns', campaign.id);
    const outputPath = path.join(campaignPath, 'system-map.html');

    // Delete the cached player map so it regenerates on next player access
    await invalidatePlayerMapCache(campaign.id);

    // Read map configuration
    const config = await readMapConfig(campaign.id);

    const result = await generateStarSystemMap({
      campaignPath,
      locations,
      outputPath,
      config,
    });

    if (result.success) {
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Error generating map:', error);
    res.status(500).json({ success: false, error: 'Failed to generate map' });
  }
};

// Get generated map HTML
const getMapHandler: RequestHandler = async (_req, res) => {
  try {
    const campaign = campaignManager.getActive();
    if (!campaign) {
      res.status(400).json({ success: false, error: 'No active campaign' });
      return;
    }

    const campaignPath = path.join(process.cwd(), 'campaigns', campaign.id);
    const mapPath = path.join(campaignPath, 'system-map.html');

    try {
      const html = await fs.readFile(mapPath, 'utf-8');
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch {
      res.status(404).json({ success: false, error: 'Map not found' });
    }
  } catch (error) {
    console.error('Error reading map:', error);
    res.status(500).json({ success: false, error: 'Failed to read map' });
  }
};

// Get base routes and replace handlers with our custom ones
const baseRoutes = createBaseRoutes('locations');
const customRoutes: ModuleRoute[] = baseRoutes.map((route) => {
  if (route.method === 'GET' && route.path === '/') {
    return { ...route, handler: listLocationsHandler };
  }
  if (route.method === 'PUT' && route.path === '/:fileId') {
    return { ...route, handler: updateWithCycleCheck };
  }
  if (route.method === 'POST' && route.path === '/') {
    return { ...route, handler: createWithCycleCheck };
  }
  return route;
});

// Add map routes
customRoutes.push(
  { method: 'POST', path: '/map/generate', handler: generateMapHandler },
  { method: 'GET', path: '/map', handler: getMapHandler }
);

export const locationsModule: ModuleDefinition = {
  id: 'locations',
  name: 'Locations',
  icon: 'MapPin',
  description: 'Places, regions, and celestial bodies in your campaign',
  dataFolder: 'locations',
  schema: locationFrontmatterSchema,
  routes: customRoutes,
  views: {
    list: PlaceholderView,
    detail: PlaceholderView,
  },
};

// Register the module
moduleRegistry.register(locationsModule);

export default locationsModule;

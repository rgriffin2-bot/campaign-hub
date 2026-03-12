/**
 * Locations module: CRUD for places/regions with parent-child hierarchy,
 * cycle detection on parent assignment, and star-system map generation.
 */

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

// The `parent` field establishes the location hierarchy for the relationship index
relationshipIndex.registerFields('locations', ['parent']);

// ── Model reference block appended to every new location file ──────────
const MODEL_REFERENCE = `<!--
3D MODEL (optional)
Upload a .glb or .gltf file via Settings → 3D Models, then add these fields
under the \`celestial:\` block in the frontmatter above:

  model: assets/3d-models/your-file.glb
  modelStyle: wireframe   # wireframe | solid | textured  (default: wireframe)
  modelEdgeAngle: 15      # 1–89 °  raise to 30–60 for high-poly models
                          # (wireframe only — ignored by solid & textured)
-->`;

// ── Helpers ────────────────────────────────────────────────────────────

/** Exclude internal system files (e.g. `_map-config`) from API responses */
function filterSystemFiles<T extends { id: string }>(files: T[]): T[] {
  return files.filter((f) => !f.id.startsWith('_'));
}

/**
 * Delete the cached player-facing map HTML so it regenerates on next access.
 * Called whenever location data changes.
 */
async function invalidatePlayerMapCache(campaignId: string) {
  const campaignPath = path.join(process.cwd(), 'campaigns', campaignId);
  const playerMapPath = path.join(campaignPath, 'player-system-map.html');
  try {
    await fs.unlink(playerMapPath);
  } catch {
    // Player map doesn't exist yet, that's fine
  }
}

// ── Custom Route Handlers ──────────────────────────────────────────────

// Overrides the base list handler to filter out system files like _map-config
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

// Wraps update with cycle detection to prevent circular parent chains
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

// Validates that the parent exists when creating a location with a parent set
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

    const bodyWithModelDocs = {
      ...req.body,
      content: (req.body.content ? req.body.content + '\n\n' : '') + MODEL_REFERENCE,
    };
    const file = await fileStore.create(campaign.id, 'locations', bodyWithModelDocs);
    await invalidatePlayerMapCache(campaign.id);
    res.status(201).json({ success: true, data: file });
  } catch (error) {
    console.error('Error creating location:', error);
    res.status(500).json({ success: false, error: 'Failed to create location' });
  }
};

// ── Map Configuration ──────────────────────────────────────────────────

/** Read the optional _map-config.md file, falling back to defaults */
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

// ── Map Generation & Retrieval ─────────────────────────────────────────

/** Trigger star-system map generation from current location data */
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

/** Serve the previously generated map HTML file */
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

// ── Route Assembly ─────────────────────────────────────────────────────
// Start with base CRUD routes, then swap in custom handlers where needed
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

// ── Module Definition ──────────────────────────────────────────────────

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

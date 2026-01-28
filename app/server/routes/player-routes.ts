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
    const files = await fileStore.list(campaignId, moduleId);
    // Filter out system files (like _map-config) and DM-only content
    const nonSystemFiles = filterSystemFiles(files);
    const filtered = filterDmOnlyMetadataList(nonSystemFiles);
    res.json({ success: true, data: filtered });
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

export const playerRoutes = router;

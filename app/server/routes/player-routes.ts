import { Router } from 'express';
import { fileStore } from '../core/file-store.js';
import { relationshipIndex } from '../core/relationship-index.js';
import { campaignManager } from '../core/campaign-manager.js';
import { moduleRegistry } from '../modules/registry.js';
import { filterDmOnlyContent, filterDmOnlyMetadataList, isHiddenFromPlayers } from '../core/content-filter.js';

const router = Router();

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
    const filtered = filterDmOnlyMetadataList(files);
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
      const files = await fileStore.list(campaignId, moduleId.trim());

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

export const playerRoutes = router;

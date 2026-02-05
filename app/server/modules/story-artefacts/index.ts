import type { RequestHandler } from 'express';
import { storyArtefactSchema } from '../../../shared/schemas/story-artefact.js';
import { createBaseRoutes } from '../base-routes.js';
import { moduleRegistry } from '../registry.js';
import { campaignManager } from '../../core/campaign-manager.js';
import { fileStore } from '../../core/file-store.js';
import { deleteArtefactImageFolder } from '../../core/upload-handler.js';
import type { ModuleDefinition, ModuleRoute } from '../../../shared/types/module.js';

// Placeholder views - will be replaced by actual React components
const PlaceholderView = () => null;

// Custom delete handler that also cleans up the image folder
const deleteHandler: RequestHandler = async (req, res) => {
  try {
    const campaign = campaignManager.getActive();
    if (!campaign) {
      res.status(400).json({ success: false, error: 'No active campaign' });
      return;
    }

    const { fileId } = req.params;

    // Delete the artefact file
    const success = await fileStore.delete(campaign.id, 'story-artefacts', fileId);

    if (!success) {
      res.status(404).json({ success: false, error: 'File not found' });
      return;
    }

    // Clean up the image folder for this artefact
    await deleteArtefactImageFolder(campaign.id, fileId);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting story artefact:', error);
    res.status(500).json({ success: false, error: 'Failed to delete artefact' });
  }
};

// Get base routes and override the delete handler
const baseRoutes = createBaseRoutes('story-artefacts');
const routes: ModuleRoute[] = baseRoutes.map((route) => {
  if (route.method === 'DELETE' && route.path === '/:fileId') {
    return { ...route, handler: deleteHandler };
  }
  return route;
});

export const storyArtefactsModule: ModuleDefinition = {
  id: 'story-artefacts',
  name: 'Story Artefacts',
  icon: 'Scroll',
  description: 'In-world props, clues, and collectibles',
  dataFolder: 'story-artefacts',
  schema: storyArtefactSchema,
  routes,
  views: {
    list: PlaceholderView,
    detail: PlaceholderView,
  },
  playerSite: {
    enabled: true,
  },
};

// Register the module
moduleRegistry.register(storyArtefactsModule);

export default storyArtefactsModule;

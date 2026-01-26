import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { campaignManager } from './core/campaign-manager.js';
import { fileStore } from './core/file-store.js';
import { relationshipIndex } from './core/relationship-index.js';
import { fileWatcher } from './core/file-watcher.js';
import { moduleRegistry } from './modules/registry.js';

// Import modules (registers them automatically)
import './modules/lore/index.js';
import './modules/npcs/index.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// =============================================================================
// Campaign Routes
// =============================================================================

// List all campaigns
app.get('/api/campaigns', async (_req, res) => {
  try {
    const campaigns = await campaignManager.list();
    res.json({ success: true, data: campaigns });
  } catch (error) {
    console.error('Error listing campaigns:', error);
    res.status(500).json({ success: false, error: 'Failed to list campaigns' });
  }
});

// Create a campaign
app.post('/api/campaigns', async (req, res) => {
  try {
    const campaign = await campaignManager.create(req.body);
    res.status(201).json({ success: true, data: campaign });
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({ success: false, error: 'Failed to create campaign' });
  }
});

// Get a campaign
app.get('/api/campaigns/:id', async (req, res) => {
  try {
    const campaign = await campaignManager.load(req.params.id);
    if (!campaign) {
      res.status(404).json({ success: false, error: 'Campaign not found' });
      return;
    }
    res.json({ success: true, data: campaign });
  } catch (error) {
    console.error('Error loading campaign:', error);
    res.status(500).json({ success: false, error: 'Failed to load campaign' });
  }
});

// Update a campaign
app.put('/api/campaigns/:id', async (req, res) => {
  try {
    const campaign = await campaignManager.update(req.params.id, req.body);
    if (!campaign) {
      res.status(404).json({ success: false, error: 'Campaign not found' });
      return;
    }
    res.json({ success: true, data: campaign });
  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(500).json({ success: false, error: 'Failed to update campaign' });
  }
});

// Delete a campaign
app.delete('/api/campaigns/:id', async (req, res) => {
  try {
    const success = await campaignManager.delete(req.params.id);
    if (!success) {
      res.status(404).json({ success: false, error: 'Campaign not found' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    res.status(500).json({ success: false, error: 'Failed to delete campaign' });
  }
});

// Activate a campaign
app.post('/api/campaigns/:id/activate', async (req, res) => {
  try {
    const campaign = await campaignManager.setActive(req.params.id);
    if (!campaign) {
      res.status(404).json({ success: false, error: 'Campaign not found' });
      return;
    }
    // Rebuild relationship index for active campaign
    await relationshipIndex.rebuild(campaign.id);
    res.json({ success: true, data: campaign });
  } catch (error) {
    console.error('Error activating campaign:', error);
    res.status(500).json({ success: false, error: 'Failed to activate campaign' });
  }
});

// Get active campaign
app.get('/api/active-campaign', (_req, res) => {
  const campaign = campaignManager.getActive();
  res.json({ success: true, data: campaign });
});

// =============================================================================
// Module Routes
// =============================================================================

// List all registered modules
app.get('/api/modules', (_req, res) => {
  const modules = moduleRegistry.getAllInfo();
  res.json({ success: true, data: modules });
});

// Get a specific module
app.get('/api/modules/:moduleId', (req, res) => {
  const module = moduleRegistry.getInfo(req.params.moduleId);
  if (!module) {
    res.status(404).json({ success: false, error: 'Module not found' });
    return;
  }
  res.json({ success: true, data: module });
});

// =============================================================================
// Generic File Routes
// =============================================================================

// List files for a module
app.get('/api/campaigns/:campaignId/files/:moduleId', async (req, res) => {
  try {
    const { campaignId, moduleId } = req.params;
    const module = moduleRegistry.get(moduleId);

    if (!module) {
      res.status(404).json({ success: false, error: 'Module not found' });
      return;
    }

    const files = await fileStore.list(campaignId, module.dataFolder);
    res.json({ success: true, data: files });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ success: false, error: 'Failed to list files' });
  }
});

// Get a specific file
app.get('/api/campaigns/:campaignId/files/:moduleId/:fileId', async (req, res) => {
  try {
    const { campaignId, moduleId, fileId } = req.params;
    const module = moduleRegistry.get(moduleId);

    if (!module) {
      res.status(404).json({ success: false, error: 'Module not found' });
      return;
    }

    const file = await fileStore.get(campaignId, module.dataFolder, fileId);

    if (!file) {
      res.status(404).json({ success: false, error: 'File not found' });
      return;
    }

    res.json({ success: true, data: file });
  } catch (error) {
    console.error('Error getting file:', error);
    res.status(500).json({ success: false, error: 'Failed to get file' });
  }
});

// Create a file
app.post('/api/campaigns/:campaignId/files/:moduleId', async (req, res) => {
  try {
    const { campaignId, moduleId } = req.params;
    const module = moduleRegistry.get(moduleId);

    if (!module) {
      res.status(404).json({ success: false, error: 'Module not found' });
      return;
    }

    const file = await fileStore.create(campaignId, module.dataFolder, req.body);
    res.status(201).json({ success: true, data: file });
  } catch (error) {
    console.error('Error creating file:', error);
    res.status(500).json({ success: false, error: 'Failed to create file' });
  }
});

// Update a file
app.put('/api/campaigns/:campaignId/files/:moduleId/:fileId', async (req, res) => {
  try {
    const { campaignId, moduleId, fileId } = req.params;
    const module = moduleRegistry.get(moduleId);

    if (!module) {
      res.status(404).json({ success: false, error: 'Module not found' });
      return;
    }

    const file = await fileStore.update(campaignId, module.dataFolder, fileId, req.body);

    if (!file) {
      res.status(404).json({ success: false, error: 'File not found' });
      return;
    }

    res.json({ success: true, data: file });
  } catch (error) {
    console.error('Error updating file:', error);
    res.status(500).json({ success: false, error: 'Failed to update file' });
  }
});

// Delete a file
app.delete('/api/campaigns/:campaignId/files/:moduleId/:fileId', async (req, res) => {
  try {
    const { campaignId, moduleId, fileId } = req.params;
    const module = moduleRegistry.get(moduleId);

    if (!module) {
      res.status(404).json({ success: false, error: 'Module not found' });
      return;
    }

    const success = await fileStore.delete(campaignId, module.dataFolder, fileId);

    if (!success) {
      res.status(404).json({ success: false, error: 'File not found' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ success: false, error: 'Failed to delete file' });
  }
});

// =============================================================================
// Relationship Routes
// =============================================================================

// Get relationships for a file
app.get('/api/campaigns/:campaignId/relationships/:fileId', async (req, res) => {
  try {
    const { campaignId, fileId } = req.params;
    const related = await relationshipIndex.getRelated(campaignId, fileId);
    res.json({ success: true, data: related });
  } catch (error) {
    console.error('Error getting relationships:', error);
    res.status(500).json({ success: false, error: 'Failed to get relationships' });
  }
});

// =============================================================================
// Mount Module Routes & Start Server
// =============================================================================

// Mount module-specific routes
moduleRegistry.mountRoutes(app);

// Start file watcher
fileWatcher.start();

// Start server
app.listen(config.port, () => {
  console.log(`Campaign Hub server running on http://localhost:${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Campaigns directory: ${config.campaignsDir}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  fileWatcher.stop();
  process.exit(0);
});

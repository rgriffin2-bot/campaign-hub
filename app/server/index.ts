import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import * as fs from 'fs/promises';
import { config } from './config.js';
import { campaignManager } from './core/campaign-manager.js';
import { fileStore } from './core/file-store.js';
import { relationshipIndex } from './core/relationship-index.js';
import { fileWatcher } from './core/file-watcher.js';
import { moduleRegistry } from './modules/registry.js';
import { upload, processAndSavePortrait, processAndSaveLoreImage, processAndSaveLocationImage, processAndSaveMapImage, processAndSavePCPortrait, processAndSaveShipImage } from './core/upload-handler.js';
import { playerRoutes } from './routes/player-routes.js';
import { createAuthMiddleware, login, logout, validateSession } from './core/auth-middleware.js';
import { generateStarSystemMap } from './modules/locations/map-generator.js';

// Import modules (registers them automatically)
import './modules/lore/index.js';
import './modules/npcs/index.js';
import './modules/locations/index.js';
import './modules/rules/index.js';
import './modules/player-characters/index.js';
import './modules/ships/index.js';
import './modules/live-play/index.js';

const app = express();

// =============================================================================
// Security Middleware
// =============================================================================

// Helmet for security headers (disable some that conflict with local dev)
app.use(
  helmet({
    contentSecurityPolicy: false, // Vite dev server needs inline scripts
    crossOriginEmbedderPolicy: false,
  })
);

// Rate limiting disabled for local development
// The live play polling (every 3s per user) was exceeding limits
// For production, consider re-enabling with higher limits or using WebSockets

// Stricter rate limit for auth endpoints only
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 attempts per 15 minutes
  message: { success: false, error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// CORS configuration - allow local network and ngrok tunnels
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) {
      callback(null, true);
      return;
    }

    // Check if origin is from local network or ngrok
    const isAllowed =
      origin.startsWith('http://localhost') ||
      origin.startsWith('http://127.0.0.1') ||
      origin.startsWith('http://192.168.') ||
      origin.startsWith('http://10.') ||
      origin.startsWith('http://172.16.') ||
      origin.startsWith('http://172.17.') ||
      origin.startsWith('http://172.18.') ||
      origin.startsWith('http://172.19.') ||
      origin.startsWith('http://172.20.') ||
      origin.startsWith('http://172.21.') ||
      origin.startsWith('http://172.22.') ||
      origin.startsWith('http://172.23.') ||
      origin.startsWith('http://172.24.') ||
      origin.startsWith('http://172.25.') ||
      origin.startsWith('http://172.26.') ||
      origin.startsWith('http://172.27.') ||
      origin.startsWith('http://172.28.') ||
      origin.startsWith('http://172.29.') ||
      origin.startsWith('http://172.30.') ||
      origin.startsWith('http://172.31.') ||
      origin.includes('.ngrok-free.app') ||
      origin.includes('.ngrok-free.dev') ||
      origin.includes('.ngrok.io');

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('CORS: Origin not allowed'));
    }
  },
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());

// Initialize auth middleware
const auth = createAuthMiddleware(config.auth.dmPassword, config.auth.playerPassword);

// =============================================================================
// Auth Routes
// =============================================================================

// Login endpoint
app.post('/api/auth/login', authLimiter, (req, res) => {
  const { password } = req.body;

  if (!password || typeof password !== 'string') {
    res.status(400).json({ success: false, error: 'Password required' });
    return;
  }

  const result = login(password, config.auth.dmPassword, config.auth.playerPassword);

  if (result.success) {
    // Set cookie for browser clients
    res.setHeader(
      'Set-Cookie',
      `session=${result.token}; HttpOnly; SameSite=Strict; Max-Age=${24 * 60 * 60}; Path=/`
    );
    res.json({ success: true, role: result.role });
  } else {
    res.status(401).json(result);
  }
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
  const cookies = req.headers.cookie;
  if (cookies) {
    const match = cookies.match(/session=([^;]+)/);
    if (match) {
      logout(match[1]);
    }
  }
  res.setHeader('Set-Cookie', 'session=; HttpOnly; SameSite=Strict; Max-Age=0; Path=/');
  res.json({ success: true });
});

// Get ngrok tunnel URL (for sharing player link)
app.get('/api/tunnel-url', auth.requireDm, async (_req, res) => {
  try {
    // First try reading from .ngrok-url file (set by launcher)
    const urlFilePath = path.join(process.cwd(), '.ngrok-url');
    try {
      const url = await fs.readFile(urlFilePath, 'utf-8');
      if (url.trim()) {
        res.json({ success: true, data: { url: url.trim() } });
        return;
      }
    } catch {
      // File doesn't exist, try ngrok API
    }

    // Try getting URL from ngrok API directly
    try {
      const response = await fetch('http://localhost:4040/api/tunnels');
      const data = await response.json() as { tunnels?: Array<{ public_url?: string }> };
      const tunnel = data.tunnels?.find((t: { public_url?: string }) => t.public_url?.startsWith('https://'));
      if (tunnel?.public_url) {
        res.json({ success: true, data: { url: tunnel.public_url } });
        return;
      }
    } catch {
      // ngrok not running or API not available
    }

    res.json({ success: true, data: { url: null } });
  } catch (error) {
    console.error('Error getting tunnel URL:', error);
    res.status(500).json({ success: false, error: 'Failed to get tunnel URL' });
  }
});

// Check session endpoint
app.get('/api/auth/session', (req, res) => {
  // If auth is not enabled, return dm role
  if (!auth.authEnabled) {
    res.json({ success: true, authenticated: true, role: 'dm', authEnabled: false });
    return;
  }

  const cookies = req.headers.cookie;
  if (cookies) {
    const match = cookies.match(/session=([^;]+)/);
    if (match) {
      const session = validateSession(match[1]);
      if (session) {
        res.json({ success: true, authenticated: true, role: session.role, authEnabled: true });
        return;
      }
    }
  }
  res.json({ success: true, authenticated: false, authEnabled: true });
});

// =============================================================================
// Campaign Routes (DM Only)
// =============================================================================

// List all campaigns
app.get('/api/campaigns', auth.requireDm, async (_req, res) => {
  try {
    const campaigns = await campaignManager.list();
    res.json({ success: true, data: campaigns });
  } catch (error) {
    console.error('Error listing campaigns:', error);
    res.status(500).json({ success: false, error: 'Failed to list campaigns' });
  }
});

// Create a campaign
app.post('/api/campaigns', auth.requireDm, async (req, res) => {
  try {
    const campaign = await campaignManager.create(req.body);
    res.status(201).json({ success: true, data: campaign });
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({ success: false, error: 'Failed to create campaign' });
  }
});

// Get a campaign
app.get('/api/campaigns/:id', auth.requireDm, async (req, res) => {
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
app.put('/api/campaigns/:id', auth.requireDm, async (req, res) => {
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
app.delete('/api/campaigns/:id', auth.requireDm, async (req, res) => {
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
app.post('/api/campaigns/:id/activate', auth.requireDm, async (req, res) => {
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
app.get('/api/active-campaign', auth.requireDm, (_req, res) => {
  const campaign = campaignManager.getActive();
  res.json({ success: true, data: campaign });
});

// =============================================================================
// Module Routes (DM Only)
// =============================================================================

// List all registered modules
app.get('/api/modules', auth.requireDm, (_req, res) => {
  const modules = moduleRegistry.getAllInfo();
  res.json({ success: true, data: modules });
});

// Get a specific module
app.get('/api/modules/:moduleId', auth.requireDm, (req, res) => {
  const module = moduleRegistry.getInfo(req.params.moduleId);
  if (!module) {
    res.status(404).json({ success: false, error: 'Module not found' });
    return;
  }
  res.json({ success: true, data: module });
});

// =============================================================================
// Generic File Routes (DM Only)
// =============================================================================

// List files for a module
app.get('/api/campaigns/:campaignId/files/:moduleId', auth.requireDm, async (req, res) => {
  try {
    const { campaignId, moduleId } = req.params;
    const module = moduleRegistry.get(moduleId);

    if (!module) {
      res.status(404).json({ success: false, error: 'Module not found' });
      return;
    }

    const files = await fileStore.list(campaignId, module.dataFolder);
    // Filter out system files (IDs starting with _) like _map-config
    const filteredFiles = files.filter((f) => !f.id.startsWith('_'));
    res.json({ success: true, data: filteredFiles });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ success: false, error: 'Failed to list files' });
  }
});

// Get a specific file
app.get('/api/campaigns/:campaignId/files/:moduleId/:fileId', auth.requireDm, async (req, res) => {
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

// Helper to invalidate cached player map when locations change
async function invalidatePlayerMapCache(campaignId: string, moduleId: string) {
  if (moduleId === 'locations') {
    const campaignPath = path.join(config.campaignsDir, campaignId);
    const playerMapPath = path.join(campaignPath, 'player-system-map.html');
    try {
      await fs.unlink(playerMapPath);
    } catch {
      // Player map doesn't exist yet, that's fine
    }
  }
}

// Create a file
app.post('/api/campaigns/:campaignId/files/:moduleId', auth.requireDm, async (req, res) => {
  try {
    const { campaignId, moduleId } = req.params;
    const module = moduleRegistry.get(moduleId);

    if (!module) {
      res.status(404).json({ success: false, error: 'Module not found' });
      return;
    }

    const file = await fileStore.create(campaignId, module.dataFolder, req.body);
    await invalidatePlayerMapCache(campaignId, moduleId);
    res.status(201).json({ success: true, data: file });
  } catch (error) {
    console.error('Error creating file:', error);
    res.status(500).json({ success: false, error: 'Failed to create file' });
  }
});

// Update a file
app.put('/api/campaigns/:campaignId/files/:moduleId/:fileId', auth.requireDm, async (req, res) => {
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

    await invalidatePlayerMapCache(campaignId, moduleId);
    res.json({ success: true, data: file });
  } catch (error) {
    console.error('Error updating file:', error);
    res.status(500).json({ success: false, error: 'Failed to update file' });
  }
});

// Delete a file
app.delete('/api/campaigns/:campaignId/files/:moduleId/:fileId', auth.requireDm, async (req, res) => {
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

    await invalidatePlayerMapCache(campaignId, moduleId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ success: false, error: 'Failed to delete file' });
  }
});

// =============================================================================
// Relationship Routes (DM Only)
// =============================================================================

// Get relationships for a file
app.get('/api/campaigns/:campaignId/relationships/:fileId', auth.requireDm, async (req, res) => {
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
// Portrait Upload Routes (DM Only)
// =============================================================================

// Upload a portrait for an NPC
app.post(
  '/api/campaigns/:campaignId/portraits/:npcId',
  auth.requireDm,
  upload.single('portrait'),
  async (req, res) => {
    try {
      const { campaignId, npcId } = req.params;

      if (!req.file) {
        res.status(400).json({ success: false, error: 'No file uploaded' });
        return;
      }

      // Get crop position from request body (sent as JSON string in form data)
      let cropPosition;
      if (req.body.cropPosition) {
        try {
          cropPosition = JSON.parse(req.body.cropPosition);
        } catch {
          // Ignore invalid JSON
        }
      }

      const portraitPath = await processAndSavePortrait(
        campaignId,
        npcId,
        req.file.buffer,
        cropPosition
      );

      res.json({ success: true, data: { path: portraitPath } });
    } catch (error) {
      console.error('Error uploading portrait:', error);
      const message = error instanceof Error ? error.message : 'Failed to upload portrait';
      res.status(500).json({ success: false, error: message });
    }
  }
);

// Upload an image for a lore entry
app.post(
  '/api/campaigns/:campaignId/lore-images/:loreId',
  auth.requireDm,
  upload.single('image'),
  async (req, res) => {
    try {
      const { campaignId, loreId } = req.params;

      if (!req.file) {
        res.status(400).json({ success: false, error: 'No file uploaded' });
        return;
      }

      const imagePath = await processAndSaveLoreImage(
        campaignId,
        loreId,
        req.file.buffer
      );

      res.json({ success: true, data: { path: imagePath } });
    } catch (error) {
      console.error('Error uploading lore image:', error);
      const message = error instanceof Error ? error.message : 'Failed to upload image';
      res.status(500).json({ success: false, error: message });
    }
  }
);

// Upload an image for a location
app.post(
  '/api/campaigns/:campaignId/location-images/:locationId',
  auth.requireDm,
  upload.single('image'),
  async (req, res) => {
    try {
      const { campaignId, locationId } = req.params;

      if (!req.file) {
        res.status(400).json({ success: false, error: 'No file uploaded' });
        return;
      }

      const imagePath = await processAndSaveLocationImage(
        campaignId,
        locationId,
        req.file.buffer
      );

      res.json({ success: true, data: { path: imagePath } });
    } catch (error) {
      console.error('Error uploading location image:', error);
      const message = error instanceof Error ? error.message : 'Failed to upload image';
      res.status(500).json({ success: false, error: message });
    }
  }
);

// Upload a map image for a celestial body (used on star system map)
app.post(
  '/api/campaigns/:campaignId/map-images/:locationId',
  auth.requireDm,
  upload.single('image'),
  async (req, res) => {
    try {
      const { campaignId, locationId } = req.params;

      if (!req.file) {
        res.status(400).json({ success: false, error: 'No file uploaded' });
        return;
      }

      const imagePath = await processAndSaveMapImage(
        campaignId,
        locationId,
        req.file.buffer,
        req.file.originalname
      );

      res.json({ success: true, data: { path: imagePath } });
    } catch (error) {
      console.error('Error uploading map image:', error);
      const message = error instanceof Error ? error.message : 'Failed to upload image';
      res.status(500).json({ success: false, error: message });
    }
  }
);

// Upload a portrait for a player character
app.post(
  '/api/campaigns/:campaignId/pc-portraits/:pcId',
  auth.requireDm,
  upload.single('image'),
  async (req, res) => {
    try {
      const { campaignId, pcId } = req.params;

      if (!req.file) {
        res.status(400).json({ success: false, error: 'No file uploaded' });
        return;
      }

      const portraitPath = await processAndSavePCPortrait(
        campaignId,
        pcId,
        req.file.buffer
      );

      res.json({ success: true, data: { path: portraitPath } });
    } catch (error) {
      console.error('Error uploading PC portrait:', error);
      const message = error instanceof Error ? error.message : 'Failed to upload portrait';
      res.status(500).json({ success: false, error: message });
    }
  }
);

// Upload an image for a ship
app.post(
  '/api/campaigns/:campaignId/ship-images/:shipId',
  auth.requireDm,
  upload.single('image'),
  async (req, res) => {
    try {
      const { campaignId, shipId } = req.params;

      if (!req.file) {
        res.status(400).json({ success: false, error: 'No file uploaded' });
        return;
      }

      const imagePath = await processAndSaveShipImage(
        campaignId,
        shipId,
        req.file.buffer
      );

      res.json({ success: true, data: { path: imagePath } });
    } catch (error) {
      console.error('Error uploading ship image:', error);
      const message = error instanceof Error ? error.message : 'Failed to upload image';
      res.status(500).json({ success: false, error: message });
    }
  }
);

// Serve static assets from campaigns directory
app.use('/api/campaigns/:campaignId/assets', (req, res, next) => {
  const { campaignId } = req.params;
  const assetsPath = path.join(config.campaignsDir, campaignId, 'assets');
  express.static(assetsPath)(req, res, next);
});

// =============================================================================
// Map Generation Routes (DM Only)
// =============================================================================

// Generate the star system map for a campaign
app.post('/api/campaigns/:campaignId/map/generate', auth.requireDm, async (req, res) => {
  try {
    const { campaignId } = req.params;

    const locations = await fileStore.list(campaignId, 'locations');
    const campaignPath = path.join(config.campaignsDir, campaignId);
    const outputPath = path.join(campaignPath, 'system-map.html');

    // Delete the cached player map so it regenerates on next player access
    const playerMapPath = path.join(campaignPath, 'player-system-map.html');
    try {
      await fs.unlink(playerMapPath);
    } catch {
      // Player map doesn't exist yet, that's fine
    }

    const result = await generateStarSystemMap({
      campaignPath,
      locations,
      outputPath,
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
});

// Get the generated map HTML (DM version)
app.get('/api/campaigns/:campaignId/map', auth.requireDm, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const campaignPath = path.join(config.campaignsDir, campaignId);
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
});

// =============================================================================
// Mount Module Routes & Start Server
// =============================================================================

// Mount player routes (read-only, filtered, requires player or DM auth)
app.use('/api/player', auth.requirePlayer, playerRoutes);

// Mount module-specific routes (DM only)
// Note: Module routes at /api/modules/* are protected by requireDm
app.use('/api/modules', auth.requireDm);
moduleRegistry.mountRoutes(app);

// Start file watcher
fileWatcher.start();

// Start server - listen on all interfaces for network access
app.listen(config.port, '0.0.0.0', () => {
  console.log(`Campaign Hub server running on http://localhost:${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Campaigns directory: ${config.campaignsDir}`);
  console.log(`Authentication: ${auth.authEnabled ? 'ENABLED' : 'DISABLED (set DM_PASSWORD and PLAYER_PASSWORD in .env)'}`);
  if (auth.authEnabled) {
    console.log(`  - DM password: ${config.auth.dmPassword ? 'SET' : 'NOT SET'}`);
    console.log(`  - Player password: ${config.auth.playerPassword ? 'SET' : 'NOT SET'}`);
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  fileWatcher.stop();
  process.exit(0);
});

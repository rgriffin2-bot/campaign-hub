import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { FileSystemManager } from '../src/core/data/fileSystemManager.js';
import { createCampaignRoutes } from './routes/campaigns.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize FileSystemManager with path to campaigns directory
// campaigns/ is adjacent to app/ directory
const campaignsPath = path.resolve(__dirname, '../../campaigns');
console.log('Campaigns directory:', campaignsPath);

const fileSystemManager = new FileSystemManager(campaignsPath);

// Routes
app.use('/api/campaigns', createCampaignRoutes(fileSystemManager));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', campaignsPath });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Campaign Hub server running on http://localhost:${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});

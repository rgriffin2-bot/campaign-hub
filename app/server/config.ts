import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  campaignsDir: path.resolve(
    rootDir,
    process.env.CAMPAIGNS_DIR || './campaigns'
  ),

  playerSitesDir: path.resolve(
    rootDir,
    process.env.PLAYER_SITES_DIR || './player-sites'
  ),

  googleDrive: {
    enabled: process.env.GOOGLE_DRIVE_ENABLED === 'true',
    credentials: process.env.GOOGLE_DRIVE_CREDENTIALS,
  },

  isDev: process.env.NODE_ENV !== 'production',
};

export type Config = typeof config;

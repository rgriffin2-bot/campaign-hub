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

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
  },

  // Authentication - set these in .env to enable password protection
  auth: {
    dmPassword: process.env.DM_PASSWORD,
    playerPassword: process.env.PLAYER_PASSWORD,
  },

  // Security settings
  security: {
    // Rate limiting: max requests per window
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    },
    // Allowed origins for CORS (comma-separated, or * for all local)
    allowedOrigins: process.env.ALLOWED_ORIGINS,
  },

  isDev: process.env.NODE_ENV !== 'production',
};

export type Config = typeof config;

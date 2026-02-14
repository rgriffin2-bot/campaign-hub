/**
 * Centralised configuration derived from environment variables.
 *
 * All env vars have sensible defaults for local development.
 * In production, override via `.env` or actual environment variables.
 */

import path from 'path';
import { fileURLToPath } from 'url';

// ── Path Resolution ────────────────────────────────────────────────────
// Compute project root relative to this file's location (app/server/config.ts)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

// ── Exported Config ────────────────────────────────────────────────────

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Data directories
  campaignsDir: path.resolve(
    rootDir,
    process.env.CAMPAIGNS_DIR || './campaigns'
  ),

  playerSitesDir: path.resolve(
    rootDir,
    process.env.PLAYER_SITES_DIR || './player-sites'
  ),

  // Optional Google Drive sync
  googleDrive: {
    enabled: process.env.GOOGLE_DRIVE_ENABLED === 'true',
    credentials: process.env.GOOGLE_DRIVE_CREDENTIALS,
  },

  // Anthropic API for AI features (NPC generation, etc.)
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
    // Rate limiting: max requests per window.
    // Default is 5000 because Live Play polls every 1s per player.
    // 5 players × 900 req/15min = 4,500, plus DM overhead.
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '5000', 10),
    },
    // Allowed origins for CORS (comma-separated, or * for all local)
    allowedOrigins: process.env.ALLOWED_ORIGINS,
  },

  // Convenience flag for conditional dev-only behaviour
  isDev: process.env.NODE_ENV !== 'production',
};

export type Config = typeof config;

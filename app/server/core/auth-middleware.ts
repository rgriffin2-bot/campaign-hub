/**
 * Auth middleware for DM/player role-based access control.
 *
 * Uses in-memory sessions with Bearer tokens or cookies.
 * Players authenticate by selecting their name (no password).
 * Only the DM requires a password.
 * When no passwords or players are configured, auth is bypassed entirely
 * to keep local development frictionless.
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// ── Types ────────────────────────────────────────────────────────────

export interface SessionData {
  role: 'dm' | 'player';
  playerName?: string;
  selectedCampaignId?: string;
}

// Augment Express Request so route handlers can read req.sessionData
declare global {
  namespace Express {
    interface Request {
      sessionData?: SessionData;
    }
  }
}

// ── Session Store ──────────────────────────────────────────────────────
// In-memory store is sufficient here because CampaignHub runs as a
// single-process local server; no need for Redis or a DB-backed store.
interface Session {
  role: 'dm' | 'player';
  playerName?: string;
  selectedCampaignId?: string;
  expires: number;
}

const sessions = new Map<string, Session>();

// Session duration: 24 hours
const SESSION_DURATION = 24 * 60 * 60 * 1000;

// Evict expired sessions every hour to prevent unbounded memory growth
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of sessions) {
    if (session.expires < now) {
      sessions.delete(token);
    }
  }
}, 60 * 60 * 1000); // Every hour

// ── Token Helpers ──────────────────────────────────────────────────────

/** Generate a cryptographically secure random session token */
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Constant-time string comparison to prevent timing attacks.
 * Even when lengths differ we run timingSafeEqual so the function
 * takes roughly the same amount of time regardless of input.
 */
function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Run a dummy comparison so total elapsed time stays constant
    crypto.timingSafeEqual(Buffer.from(a), Buffer.from(a));
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// ── Login / Logout / Session Validation ────────────────────────────────

/**
 * DM login — verify password against configured DM password.
 */
export function login(
  password: string,
  dmPassword: string | undefined
): { success: true; token: string; role: 'dm' } | { success: false; error: string } {
  if (dmPassword && secureCompare(password, dmPassword)) {
    const token = generateToken();
    sessions.set(token, {
      role: 'dm',
      expires: Date.now() + SESSION_DURATION,
    });
    return { success: true, token, role: 'dm' };
  }

  return { success: false, error: 'Invalid password' };
}

/**
 * Player login — no password, just validate that the name is in the configured list.
 */
export function loginAsPlayer(
  playerName: string,
  configuredPlayers: string[]
): { success: true; token: string; role: 'player'; playerName: string } | { success: false; error: string } {
  if (!configuredPlayers.includes(playerName)) {
    return { success: false, error: 'Unknown player' };
  }

  const token = generateToken();
  sessions.set(token, {
    role: 'player',
    playerName,
    expires: Date.now() + SESSION_DURATION,
  });
  return { success: true, token, role: 'player', playerName };
}

/**
 * Validate a session token and return its data.
 */
export function validateSession(token: string): SessionData | null {
  const session = sessions.get(token);
  if (!session) return null;

  if (session.expires < Date.now()) {
    sessions.delete(token);
    return null;
  }

  // Extend session on use
  session.expires = Date.now() + SESSION_DURATION;
  return {
    role: session.role,
    playerName: session.playerName,
    selectedCampaignId: session.selectedCampaignId,
  };
}

/**
 * Update the selected campaign for a session.
 */
export function setSessionCampaign(token: string, campaignId: string): boolean {
  const session = sessions.get(token);
  if (!session) return false;
  session.selectedCampaignId = campaignId;
  return true;
}

/**
 * Logout - invalidate session
 */
export function logout(token: string): void {
  sessions.delete(token);
}

// ── Token Extraction ───────────────────────────────────────────────────

/** Extract session token from Authorization header (Bearer) or cookie */
export function getTokenFromRequest(req: Request): string | null {
  // Check Authorization header first
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Check cookie
  const cookies = req.headers.cookie;
  if (cookies) {
    const match = cookies.match(/session=([^;]+)/);
    if (match) return match[1];
  }

  return null;
}

// ── Express Middleware ──────────────────────────────────────────────────

/** Middleware: rejects requests that don't carry a valid DM session */
export function requireDm(req: Request, res: Response, next: NextFunction): void {
  const token = getTokenFromRequest(req);

  if (!token) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const session = validateSession(token);
  if (!session) {
    res.status(401).json({ success: false, error: 'Session expired' });
    return;
  }

  if (session.role !== 'dm') {
    res.status(403).json({ success: false, error: 'DM access required' });
    return;
  }

  req.sessionData = session;
  next();
}

/** Middleware: allows both DM and player roles through */
export function requirePlayer(req: Request, res: Response, next: NextFunction): void {
  const token = getTokenFromRequest(req);

  if (!token) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const session = validateSession(token);
  if (!session) {
    res.status(401).json({ success: false, error: 'Session expired' });
    return;
  }

  // Both DM and player can access player routes
  req.sessionData = session;
  next();
}

// ── Auth Factory ───────────────────────────────────────────────────────

/**
 * Creates auth middleware configured for the current environment.
 * When no passwords or players are configured, returns no-op middleware so the
 * app works without any authentication (convenient for local development).
 */
export function createAuthMiddleware(
  dmPassword?: string,
  players?: string[]
) {
  const authEnabled = Boolean(dmPassword || (players && players.length > 0));

  const noopMiddleware = (req: Request, _res: Response, next: NextFunction) => {
    req.sessionData = { role: 'dm' };
    next();
  };

  return {
    requireDm: authEnabled ? requireDm : noopMiddleware,
    requirePlayer: authEnabled ? requirePlayer : noopMiddleware,
    authEnabled,
  };
}

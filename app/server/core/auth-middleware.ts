/**
 * Auth middleware for DM/player role-based access control.
 *
 * Uses in-memory sessions with Bearer tokens or cookies.
 * When no passwords are configured, auth is bypassed entirely
 * to keep local development frictionless.
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// ── Session Store ──────────────────────────────────────────────────────
// In-memory store is sufficient here because CampaignHub runs as a
// single-process local server; no need for Redis or a DB-backed store.
const sessions = new Map<string, { role: 'dm' | 'player'; expires: number }>();

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
 * Verify password against configured DM and player passwords.
 * DM password is checked first, so if both are the same the user gets DM role.
 */
export function login(
  password: string,
  dmPassword: string | undefined,
  playerPassword: string | undefined
): { success: true; token: string; role: 'dm' | 'player' } | { success: false; error: string } {
  // Check DM password first
  if (dmPassword && secureCompare(password, dmPassword)) {
    const token = generateToken();
    sessions.set(token, {
      role: 'dm',
      expires: Date.now() + SESSION_DURATION,
    });
    return { success: true, token, role: 'dm' };
  }

  // Check player password
  if (playerPassword && secureCompare(password, playerPassword)) {
    const token = generateToken();
    sessions.set(token, {
      role: 'player',
      expires: Date.now() + SESSION_DURATION,
    });
    return { success: true, token, role: 'player' };
  }

  return { success: false, error: 'Invalid password' };
}

/**
 * Validate a session token
 */
export function validateSession(token: string): { role: 'dm' | 'player' } | null {
  const session = sessions.get(token);
  if (!session) return null;

  if (session.expires < Date.now()) {
    sessions.delete(token);
    return null;
  }

  // Extend session on use
  session.expires = Date.now() + SESSION_DURATION;
  return { role: session.role };
}

/**
 * Logout - invalidate session
 */
export function logout(token: string): void {
  sessions.delete(token);
}

// ── Token Extraction ───────────────────────────────────────────────────

/** Extract session token from Authorization header (Bearer) or cookie */
function getTokenFromRequest(req: Request): string | null {
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
  next();
}

// ── Auth Factory ───────────────────────────────────────────────────────

/**
 * Creates auth middleware configured for the current environment.
 * When neither password is set, returns no-op middleware so the app
 * works without any authentication (convenient for local development).
 */
export function createAuthMiddleware(dmPassword?: string, playerPassword?: string) {
  const authEnabled = Boolean(dmPassword || playerPassword);

  return {
    requireDm: authEnabled
      ? requireDm
      : (_req: Request, _res: Response, next: NextFunction) => next(),
    requirePlayer: authEnabled
      ? requirePlayer
      : (_req: Request, _res: Response, next: NextFunction) => next(),
    authEnabled,
  };
}

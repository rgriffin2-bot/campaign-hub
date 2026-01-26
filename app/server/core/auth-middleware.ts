import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Simple in-memory session store (fine for single-server local use)
const sessions = new Map<string, { role: 'dm' | 'player'; expires: number }>();

// Session duration: 24 hours
const SESSION_DURATION = 24 * 60 * 60 * 1000;

// Clean up expired sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of sessions) {
    if (session.expires < now) {
      sessions.delete(token);
    }
  }
}, 60 * 60 * 1000); // Every hour

/**
 * Generate a secure random token
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do the comparison to maintain constant time
    crypto.timingSafeEqual(Buffer.from(a), Buffer.from(a));
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Verify password and create a session
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

/**
 * Extract token from request (cookie or Authorization header)
 */
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

/**
 * Middleware to require DM authentication
 */
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

/**
 * Middleware to require player OR DM authentication
 */
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

/**
 * Middleware to check if auth is enabled
 * If no passwords are set, allow access (for easy local development)
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

/**
 * In-memory async mutex to prevent concurrent writes to the same file.
 *
 * Uses a per-path Promise chain so that callers queue up automatically.
 * This is sufficient for a single-process server; if CampaignHub ever
 * runs multi-process, this would need to be replaced with an OS-level
 * advisory lock.
 */

// Map of file paths to their pending lock promise
const locks = new Map<string, Promise<void>>();

// ── Public API ─────────────────────────────────────────────────────────

/**
 * Acquire an exclusive lock for `filePath`, run `callback`, then release.
 * If another operation already holds the lock, this will wait for it first.
 */
export async function withFileLock<T>(
  filePath: string,
  callback: () => Promise<T>
): Promise<T> {
  // Wait for any existing lock on this file
  const existingLock = locks.get(filePath);
  if (existingLock) {
    await existingLock;
  }

  // Create a new promise whose resolve function acts as the release trigger
  let releaseLock: () => void;
  const lockPromise = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });
  locks.set(filePath, lockPromise);

  try {
    return await callback();
  } finally {
    releaseLock!();
    // Only delete if no one else has replaced our lock in the meantime
    if (locks.get(filePath) === lockPromise) {
      locks.delete(filePath);
    }
  }
}

/** Check whether a file currently has a pending write lock */
export function isLocked(filePath: string): boolean {
  return locks.has(filePath);
}

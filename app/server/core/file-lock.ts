/**
 * Simple file-based locking mechanism to prevent concurrent writes
 * Uses in-memory locks with async mutex pattern
 */

// Map of file paths to their lock state
const locks = new Map<string, Promise<void>>();

/**
 * Acquires a lock for the given file path and executes the callback
 * Ensures only one write operation per file at a time
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

  // Create a new lock
  let releaseLock: () => void;
  const lockPromise = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });
  locks.set(filePath, lockPromise);

  try {
    // Execute the callback while holding the lock
    return await callback();
  } finally {
    // Release the lock
    releaseLock!();
    // Clean up if this is still our lock
    if (locks.get(filePath) === lockPromise) {
      locks.delete(filePath);
    }
  }
}

/**
 * Checks if a file is currently locked
 */
export function isLocked(filePath: string): boolean {
  return locks.has(filePath);
}

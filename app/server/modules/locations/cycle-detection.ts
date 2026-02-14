/**
 * Cycle detection for the location parent-child hierarchy.
 *
 * Locations form a tree (each location has at most one parent).
 * Before setting a parent we walk up the ancestor chain to make sure
 * we won't accidentally create a loop (A -> B -> ... -> A).
 */

import type { FileMetadata } from '../../../shared/types/file.js';

// ── Cycle Check ────────────────────────────────────────────────────────

/**
 * Returns true if assigning `proposedParentId` as the parent of `childId`
 * would create a circular reference in the location tree.
 */
export function wouldCreateCycle(
  locations: FileMetadata[],
  childId: string,
  proposedParentId: string
): boolean {
  // Can't be your own parent
  if (childId === proposedParentId) {
    return true;
  }

  // Index locations by ID for O(1) lookups during ancestor walk
  const locationMap = new Map<string, FileMetadata>();
  for (const loc of locations) {
    locationMap.set(loc.id, loc);
  }

  // Walk the ancestor chain starting from the proposed parent.
  // If we encounter `childId`, assigning this parent would form a cycle.
  let current: string | undefined = proposedParentId;
  const visited = new Set<string>(); // guards against pre-existing cycles in data

  while (current) {
    // If we find the child in the ancestor chain, it would create a cycle
    if (current === childId) {
      return true;
    }

    // Detect existing cycles in the data
    if (visited.has(current)) {
      return true;
    }
    visited.add(current);

    // Move to the parent
    const location = locationMap.get(current);
    current = location?.parent as string | undefined;
  }

  return false;
}

// ── Validation Wrapper ─────────────────────────────────────────────────

/**
 * Validate a proposed parent assignment.
 * @returns A human-readable error string, or null if the assignment is safe.
 */
export function validateParentAssignment(
  locations: FileMetadata[],
  childId: string,
  proposedParentId: string | undefined
): string | null {
  // No parent is always valid
  if (!proposedParentId) {
    return null;
  }

  // Check if parent exists
  const parentExists = locations.some((loc) => loc.id === proposedParentId);
  if (!parentExists) {
    return 'Parent location not found';
  }

  // Check for cycles
  if (wouldCreateCycle(locations, childId, proposedParentId)) {
    return 'Cannot set parent: would create a circular reference';
  }

  return null;
}

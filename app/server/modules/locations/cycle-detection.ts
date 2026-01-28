import type { FileMetadata } from '../../../shared/types/file.js';

/**
 * Checks if setting a proposed parent would create a cycle in the location hierarchy.
 *
 * A cycle would occur if the proposed parent is actually a descendant of the child,
 * meaning we'd have A -> B -> ... -> A.
 *
 * @param locations - All locations in the campaign
 * @param childId - The location being edited
 * @param proposedParentId - The ID of the proposed parent location
 * @returns true if setting this parent would create a cycle
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

  // Build a map for efficient lookup
  const locationMap = new Map<string, FileMetadata>();
  for (const loc of locations) {
    locationMap.set(loc.id, loc);
  }

  // Walk up from proposed parent, checking if we ever reach the child
  let current: string | undefined = proposedParentId;
  const visited = new Set<string>();

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

/**
 * Validates that a parent assignment is valid.
 * Returns an error message if invalid, or null if valid.
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

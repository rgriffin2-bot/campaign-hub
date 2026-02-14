/**
 * DM-only content filtering utilities.
 *
 * Content can be marked DM-only in two ways depending on the module:
 *   - `hidden: true`          — used by lore, NPCs, locations
 *   - `playerVisible: false`  — used by the rules module
 *
 * These helpers strip those flags (and the `dmOnly` field) before
 * returning data to player-facing endpoints.
 */

import type { ParsedFile, FileMetadata } from '../../shared/types/file.js';

// ── Visibility Checks ──────────────────────────────────────────────────

/** Determine whether a file should be hidden from the player view */
export function isHiddenFromPlayers(item: FileMetadata | ParsedFile['frontmatter']): boolean {
  const record = item as Record<string, unknown>;
  if (record.hidden === true) return true;
  if (record.playerVisible === false) return true;
  return false;
}

// ── Sanitization for Player-Facing Responses ───────────────────────────

/** Strip DM-only frontmatter fields from a single parsed file */
export function filterDmOnlyContent(file: ParsedFile): ParsedFile {
  const { dmOnly, hidden, playerVisible, ...cleanedFrontmatter } = file.frontmatter as Record<string, unknown>;

  return {
    ...file,
    frontmatter: cleanedFrontmatter as ParsedFile['frontmatter'],
  };
}

/** Strip DM-only fields from a single metadata entry (list view) */
export function filterDmOnlyMetadata(metadata: FileMetadata): FileMetadata {
  const { dmOnly, hidden, playerVisible, ...cleaned } = metadata as Record<string, unknown>;
  return cleaned as FileMetadata;
}

/**
 * Filter a metadata array for player view: exclude hidden items,
 * then strip DM-only fields from the remaining entries.
 */
export function filterDmOnlyMetadataList(metadataList: FileMetadata[]): FileMetadata[] {
  return metadataList
    .filter((item) => !isHiddenFromPlayers(item))
    .map(filterDmOnlyMetadata);
}

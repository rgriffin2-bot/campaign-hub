import type { ParsedFile, FileMetadata } from '../../shared/types/file.js';

/**
 * Check if a file/metadata is hidden from players.
 */
export function isHiddenFromPlayers(item: FileMetadata | ParsedFile['frontmatter']): boolean {
  return (item as Record<string, unknown>).hidden === true;
}

/**
 * Filter out DM-only content from a parsed file.
 * This removes the `dmOnly` and `hidden` fields from frontmatter.
 */
export function filterDmOnlyContent(file: ParsedFile): ParsedFile {
  const { dmOnly, hidden, ...cleanedFrontmatter } = file.frontmatter as Record<string, unknown>;

  return {
    ...file,
    frontmatter: cleanedFrontmatter as ParsedFile['frontmatter'],
  };
}

/**
 * Filter out DM-only content from file metadata (list view).
 * Removes dmOnly and hidden fields from the metadata.
 */
export function filterDmOnlyMetadata(metadata: FileMetadata): FileMetadata {
  const { dmOnly, hidden, ...cleaned } = metadata as Record<string, unknown>;
  return cleaned as FileMetadata;
}

/**
 * Filter an array of file metadata for player view:
 * - Excludes items marked as hidden
 * - Removes dmOnly and hidden fields from each item
 */
export function filterDmOnlyMetadataList(metadataList: FileMetadata[]): FileMetadata[] {
  return metadataList
    .filter((item) => !isHiddenFromPlayers(item))
    .map(filterDmOnlyMetadata);
}

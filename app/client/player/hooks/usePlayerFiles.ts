/**
 * usePlayerFiles.ts
 *
 * React Query hook that wraps the player (read-only) API endpoints.
 * Returns `list` (all files for a module) and `get` (a single file).
 * Used by every player-mode list and detail page.
 */
import { useQuery } from '@tanstack/react-query';
import { useCampaign } from '../../hooks/useCampaign';
import type { FileMetadata, ParsedFile } from '@shared/types/file';
import type { ApiResponse } from '@shared/types/api';

// --- Fetch helpers ---

/**
 * Fetch all file metadata for a given module via the player API.
 * The server filters out DM-only entries before returning.
 */
async function fetchPlayerFiles(
  campaignId: string,
  moduleId: string
): Promise<FileMetadata[]> {
  const res = await fetch(`/api/player/campaigns/${campaignId}/files/${moduleId}`);
  const data: ApiResponse<FileMetadata[]> = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data || [];
}

/** Fetch a single parsed file (frontmatter + markdown content) via the player API. */
async function fetchPlayerFile(
  campaignId: string,
  moduleId: string,
  fileId: string
): Promise<ParsedFile> {
  const res = await fetch(
    `/api/player/campaigns/${campaignId}/files/${moduleId}/${fileId}`
  );
  const data: ApiResponse<ParsedFile> = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data!;
}

// --- Hook ---

/**
 * React Query hook for player-mode file access.
 * @param moduleId  The module slug (e.g. "npcs", "lore", "ships").
 * @returns `list` query for all files, and `get(fileId)` for a single file.
 */
export function usePlayerFiles(moduleId: string) {
  const { campaign } = useCampaign();
  const campaignId = campaign?.id || '';

  // Query for the full file list (metadata only)
  const listQuery = useQuery({
    queryKey: ['player-files', campaignId, moduleId],
    queryFn: () => fetchPlayerFiles(campaignId, moduleId),
    enabled: !!campaignId,
  });

  // Factory returning a query for a single file by ID
  const useFileQuery = (fileId: string) =>
    useQuery({
      queryKey: ['player-file', campaignId, moduleId, fileId],
      queryFn: () => fetchPlayerFile(campaignId, moduleId, fileId),
      enabled: !!campaignId && !!fileId,
    });

  return {
    list: listQuery,
    get: useFileQuery,
  };
}

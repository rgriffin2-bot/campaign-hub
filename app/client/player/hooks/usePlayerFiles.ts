import { useQuery } from '@tanstack/react-query';
import { useCampaign } from '../../hooks/useCampaign';
import type { FileMetadata, ParsedFile } from '@shared/types/file';
import type { ApiResponse } from '@shared/types/api';

/**
 * Fetch files using the player API (filtered, read-only)
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

/**
 * Fetch a single file using the player API (filtered, read-only)
 */
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

/**
 * Read-only hook for player mode - uses filtered API endpoints
 */
export function usePlayerFiles(moduleId: string) {
  const { campaign } = useCampaign();
  const campaignId = campaign?.id || '';

  const listQuery = useQuery({
    queryKey: ['player-files', campaignId, moduleId],
    queryFn: () => fetchPlayerFiles(campaignId, moduleId),
    enabled: !!campaignId,
  });

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

import { useQuery } from '@tanstack/react-query';
import { useCampaign } from './useCampaign';
import type { FileMetadata } from '@shared/types/file';
import type { ApiResponse } from '@shared/types/api';

interface RelationshipResult {
  references: FileMetadata[];
  referencedBy: FileMetadata[];
}

async function fetchRelationships(
  campaignId: string,
  fileId: string
): Promise<RelationshipResult> {
  const res = await fetch(`/api/campaigns/${campaignId}/relationships/${fileId}`);
  const data: ApiResponse<RelationshipResult> = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data || { references: [], referencedBy: [] };
}

export function useRelationships(fileId: string) {
  const { campaign } = useCampaign();
  const campaignId = campaign?.id || '';

  return useQuery({
    queryKey: ['relationships', campaignId, fileId],
    queryFn: () => fetchRelationships(campaignId, fileId),
    enabled: !!campaignId && !!fileId,
  });
}

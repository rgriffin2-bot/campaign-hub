import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCampaign } from './useCampaign';
import type { FileMetadata, ParsedFile, CreateFileInput, UpdateFileInput } from '@shared/types/file';
import type { ApiResponse } from '@shared/types/api';

async function fetchFiles(
  campaignId: string,
  moduleId: string
): Promise<FileMetadata[]> {
  const res = await fetch(`/api/campaigns/${campaignId}/files/${moduleId}`);
  const data: ApiResponse<FileMetadata[]> = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data || [];
}

async function fetchFile(
  campaignId: string,
  moduleId: string,
  fileId: string
): Promise<ParsedFile> {
  const res = await fetch(
    `/api/campaigns/${campaignId}/files/${moduleId}/${fileId}`
  );
  const data: ApiResponse<ParsedFile> = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data!;
}

async function createFile(
  campaignId: string,
  moduleId: string,
  input: CreateFileInput
): Promise<ParsedFile> {
  const res = await fetch(`/api/campaigns/${campaignId}/files/${moduleId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data: ApiResponse<ParsedFile> = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data!;
}

async function updateFile(
  campaignId: string,
  moduleId: string,
  fileId: string,
  input: UpdateFileInput
): Promise<ParsedFile> {
  const res = await fetch(
    `/api/campaigns/${campaignId}/files/${moduleId}/${fileId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }
  );
  const data: ApiResponse<ParsedFile> = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data!;
}

async function deleteFile(
  campaignId: string,
  moduleId: string,
  fileId: string
): Promise<void> {
  const res = await fetch(
    `/api/campaigns/${campaignId}/files/${moduleId}/${fileId}`,
    { method: 'DELETE', credentials: 'include' }
  );
  const data: ApiResponse<void> = await res.json();
  if (!data.success) throw new Error(data.error);
}

async function toggleVisibility(
  campaignId: string,
  moduleId: string,
  fileId: string,
  hidden: boolean
): Promise<ParsedFile> {
  const res = await fetch(
    `/api/campaigns/${campaignId}/files/${moduleId}/${fileId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frontmatter: { hidden } }),
      credentials: 'include',
    }
  );
  const data: ApiResponse<ParsedFile> = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data!;
}

export function useFiles(moduleId: string) {
  const { campaign } = useCampaign();
  const queryClient = useQueryClient();

  const campaignId = campaign?.id || '';

  const listQuery = useQuery({
    queryKey: ['files', campaignId, moduleId],
    queryFn: () => fetchFiles(campaignId, moduleId),
    enabled: !!campaignId,
  });

  const useFileQuery = (fileId: string) =>
    useQuery({
      queryKey: ['file', campaignId, moduleId, fileId],
      queryFn: () => fetchFile(campaignId, moduleId, fileId),
      enabled: !!campaignId && !!fileId,
    });

  const createMutation = useMutation({
    mutationFn: (input: CreateFileInput) =>
      createFile(campaignId, moduleId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', campaignId, moduleId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ fileId, input }: { fileId: string; input: UpdateFileInput }) =>
      updateFile(campaignId, moduleId, fileId, input),
    onSuccess: (_, { fileId }) => {
      queryClient.invalidateQueries({ queryKey: ['files', campaignId, moduleId] });
      queryClient.invalidateQueries({
        queryKey: ['file', campaignId, moduleId, fileId],
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (fileId: string) => deleteFile(campaignId, moduleId, fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', campaignId, moduleId] });
    },
  });

  const toggleVisibilityMutation = useMutation({
    mutationFn: ({ fileId, hidden }: { fileId: string; hidden: boolean }) =>
      toggleVisibility(campaignId, moduleId, fileId, hidden),
    onSuccess: (_, { fileId }) => {
      queryClient.invalidateQueries({ queryKey: ['files', campaignId, moduleId] });
      queryClient.invalidateQueries({
        queryKey: ['file', campaignId, moduleId, fileId],
      });
    },
  });

  return {
    list: listQuery,
    get: useFileQuery,
    create: createMutation,
    update: updateMutation,
    delete: deleteMutation,
    toggleVisibility: toggleVisibilityMutation,
  };
}

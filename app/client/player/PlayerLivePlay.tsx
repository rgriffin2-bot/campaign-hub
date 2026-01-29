import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Play, LayoutGrid, LayoutList, Columns, Lock } from 'lucide-react';
import { useCampaign } from '../core/providers/CampaignProvider';
import { PCPanel } from '../modules/live-play/components/PCPanel';
import type { PlayerCharacterFrontmatter } from '@shared/schemas/player-character';
import type { FileMetadata } from '@shared/types/file';
import type { ApiResponse } from '@shared/types/api';

type LayoutMode = 'grid' | 'list' | 'compact';

// Polling interval for live updates (3 seconds)
const POLL_INTERVAL = 3000;

export function PlayerLivePlay() {
  const { campaign } = useCampaign();
  const queryClient = useQueryClient();
  const [layout, setLayout] = useState<LayoutMode>('grid');

  // For now, we'll allow editing of any PC in player mode
  // In a full implementation, you'd check the logged-in player against pc.player
  // and only allow editing if they match
  const [editablePCId, setEditablePCId] = useState<string | null>(null);

  // Use a query with polling for live play
  const { data: characters = [], isLoading, error } = useQuery({
    queryKey: ['player-live-play', campaign?.id, 'player-characters'],
    queryFn: async () => {
      if (!campaign) return [];
      const res = await fetch(`/api/player/campaigns/${campaign.id}/files/player-characters`, {
        credentials: 'include',
      });
      const data: ApiResponse<FileMetadata[]> = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data || [];
    },
    enabled: !!campaign,
    refetchInterval: POLL_INTERVAL, // Poll every 3 seconds for live updates
    refetchIntervalInBackground: true, // Keep polling even when tab is not focused
    retry: false, // Don't retry on auth errors
  });

  // Mutation for updating trackers (uses player endpoint)
  const updateTrackers = useMutation({
    mutationFn: async ({
      pcId,
      updates,
    }: {
      pcId: string;
      updates: Partial<PlayerCharacterFrontmatter>;
    }) => {
      if (!campaign) throw new Error('No active campaign');

      // Use the player API endpoint for tracker updates
      const res = await fetch(
        `/api/player/campaigns/${campaign.id}/files/player-characters/${pcId}/trackers`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
          credentials: 'include',
        }
      );

      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    onSuccess: () => {
      // Invalidate live-play query to refresh data immediately
      queryClient.invalidateQueries({
        queryKey: ['player-live-play', campaign?.id, 'player-characters'],
      });
    },
  });

  const handleUpdatePC = (pcId: string, updates: Partial<PlayerCharacterFrontmatter>) => {
    updateTrackers.mutate({ pcId, updates });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 p-12 text-center">
        <Play className="h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold text-foreground">
          Unable to load characters
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {error instanceof Error ? error.message : 'An error occurred'}
        </p>
      </div>
    );
  }

  const layoutClasses = {
    grid: 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3',
    list: 'flex flex-col gap-4',
    compact: 'flex flex-wrap gap-2',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Play className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Live Play</h1>
        </div>

        {/* Layout Toggle */}
        <div className="flex rounded-md border border-border">
          <button
            onClick={() => setLayout('grid')}
            className={`flex items-center gap-1 px-3 py-1.5 text-sm ${
              layout === 'grid'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Grid layout"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setLayout('list')}
            className={`flex items-center gap-1 border-x border-border px-3 py-1.5 text-sm ${
              layout === 'list'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="List layout"
          >
            <LayoutList className="h-4 w-4" />
          </button>
          <button
            onClick={() => setLayout('compact')}
            className={`flex items-center gap-1 px-3 py-1.5 text-sm ${
              layout === 'compact'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Compact layout"
          >
            <Columns className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-center gap-2 rounded-lg bg-secondary/50 px-4 py-2 text-sm text-muted-foreground">
        <Lock className="h-4 w-4" />
        <span>Click on a character panel to enable editing. Other panels are read-only.</span>
      </div>

      {/* Party Tracker */}
      {characters.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 p-12 text-center">
          <Play className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            No characters yet
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            The DM hasn't added any player characters yet.
          </p>
        </div>
      ) : (
        <div className={layoutClasses[layout]}>
          {characters.map((pc) => {
            const isEditable = editablePCId === pc.id;

            return (
              <div
                key={pc.id}
                onClick={() => setEditablePCId(pc.id)}
                className={`cursor-pointer transition-all ${
                  layout === 'compact' ? 'flex-1 min-w-[180px] max-w-[240px]' : ''
                } ${
                  isEditable ? 'ring-2 ring-primary' : 'opacity-80 hover:opacity-100'
                }`}
              >
                <PCPanel
                  pc={{
                    id: pc.id,
                    frontmatter: pc as unknown as PlayerCharacterFrontmatter,
                  }}
                  editable={isEditable}
                  compact={layout === 'compact'}
                  onUpdate={(updates) => handleUpdatePC(pc.id, updates)}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

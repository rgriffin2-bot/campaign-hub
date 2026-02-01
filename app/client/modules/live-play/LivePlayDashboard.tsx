import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Play, LayoutGrid, LayoutList, Columns, Users, Trash2, Rocket } from 'lucide-react';
import { useCampaign } from '../../core/providers/CampaignProvider';
import { PCPanel } from './components/PCPanel';
import { SceneNPCPanel } from './components/SceneNPCPanel';
import { SceneShipPanel } from './components/SceneShipPanel';
import { CrewShipPanel } from './components/CrewShipPanel';
import { useSceneNPCs } from '../../core/providers/SceneNPCsProvider';
import { useSceneShips, type SceneShip } from '../../core/providers/SceneShipsProvider';
import type { PlayerCharacterFrontmatter } from '@shared/schemas/player-character';
import type { ShipDamage, ShipDisposition } from '@shared/schemas/ship';
import type { FileMetadata } from '@shared/types/file';
import type { ApiResponse } from '@shared/types/api';

type LayoutMode = 'grid' | 'list' | 'compact';

// Polling interval for live updates (3 seconds)
const POLL_INTERVAL = 3000;

// Define disposition order for sorting (hostile first, then neutral, then friendly)
const dispositionOrder = { hostile: 0, neutral: 1, friendly: 2 };

export function LivePlayDashboard() {
  const { campaign } = useCampaign();
  const queryClient = useQueryClient();
  const [layout, setLayout] = useState<LayoutMode>('compact');
  const { sceneNPCs, removeFromScene: removeNPCFromScene, clearScene: clearNPCScene, updateNPCStats, updateDisposition: updateNPCDisposition, toggleVisibility: toggleNPCVisibility } = useSceneNPCs();
  const { sceneShips, removeFromScene: removeShipFromScene, clearScene: clearShipScene, updateShip, updateDisposition: updateShipDisposition, toggleVisibility: toggleShipVisibility } = useSceneShips();

  // Separate crew ships from other ships
  const crewShips = sceneShips.filter((ship: SceneShip) => ship.isCrewShip);
  const nonCrewShips = sceneShips.filter((ship: SceneShip) => !ship.isCrewShip);

  // Combine NPCs and non-crew ships, sorted by disposition
  type SceneEntity =
    | { type: 'npc'; data: typeof sceneNPCs[0] }
    | { type: 'ship'; data: SceneShip };

  const sceneEntities: SceneEntity[] = [
    ...sceneNPCs.map(npc => ({ type: 'npc' as const, data: npc })),
    ...nonCrewShips.map(ship => ({ type: 'ship' as const, data: ship })),
  ].sort((a, b) => {
    const aDisp = (a.data.disposition || 'neutral') as keyof typeof dispositionOrder;
    const bDisp = (b.data.disposition || 'neutral') as keyof typeof dispositionOrder;
    return dispositionOrder[aDisp] - dispositionOrder[bDisp];
  });

  // Use a separate query with polling for live play
  const { data: characters = [], isLoading, error } = useQuery({
    queryKey: ['live-play', campaign?.id, 'player-characters'],
    queryFn: async () => {
      if (!campaign) return [];
      const res = await fetch(`/api/campaigns/${campaign.id}/files/player-characters`, {
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

  // Mutation for updating trackers
  const updateTrackers = useMutation({
    mutationFn: async ({
      pcId,
      updates,
    }: {
      pcId: string;
      updates: Partial<PlayerCharacterFrontmatter>;
    }) => {
      if (!campaign) throw new Error('No active campaign');

      const res = await fetch(
        `/api/modules/player-characters/${pcId}/trackers`,
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
        queryKey: ['live-play', campaign?.id, 'player-characters'],
      });
    },
  });

  const handleUpdatePC = (pcId: string, updates: Partial<PlayerCharacterFrontmatter>) => {
    updateTrackers.mutate({ pcId, updates });
  };

  const handleClearScene = () => {
    clearNPCScene();
    clearShipScene();
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

      {/* Crew Ship Section - Spans full width above party */}
      {crewShips.length > 0 && (
        <div className="space-y-2">
          {crewShips.map((ship: SceneShip) => (
            <CrewShipPanel
              key={ship.id}
              ship={ship}
              editable
              onUpdatePressure={(pressure) => updateShip(ship.id, { pressure })}
              onUpdateDamage={(damage: ShipDamage) => updateShip(ship.id, { damage })}
            />
          ))}
        </div>
      )}

      {/* Party Tracker */}
      {characters.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 p-12 text-center">
          <Play className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            No characters yet
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Add player characters to use the Live Play tracker.
          </p>
        </div>
      ) : (
        <div className={layoutClasses[layout]}>
          {characters.map((pc) => (
            <div key={pc.id} className={layout === 'compact' ? 'flex-1 min-w-[180px] max-w-[240px]' : ''}>
              <PCPanel
                pc={{
                  id: pc.id,
                  frontmatter: pc as unknown as PlayerCharacterFrontmatter,
                }}
                editable
                compact={layout === 'compact'}
                onUpdate={(updates) => handleUpdatePC(pc.id, updates)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Scene Entities (NPCs + Non-Crew Ships) - Sorted by disposition */}
      {sceneEntities.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Users className="h-4 w-4" />
              <Rocket className="h-4 w-4" />
              <span>NPCs & Entities in Scene ({sceneEntities.length})</span>
            </div>
            <button
              onClick={handleClearScene}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              title="Clear all from scene"
            >
              <Trash2 className="h-3 w-3" />
              Clear Scene
            </button>
          </div>

          <div className={layoutClasses[layout]}>
            {sceneEntities.map((entity) => {
              if (entity.type === 'npc') {
                const npc = entity.data;
                return (
                  <div key={`npc-${npc.id}`} className={layout === 'compact' ? 'flex-1 min-w-[180px] max-w-[240px]' : ''}>
                    <SceneNPCPanel
                      npc={npc}
                      onRemove={() => removeNPCFromScene(npc.id)}
                      onUpdateStats={(updates) => updateNPCStats(npc.id, updates)}
                      onUpdateDisposition={(disposition) => updateNPCDisposition(npc.id, disposition)}
                      onToggleVisibility={() => toggleNPCVisibility(npc.id)}
                      compact={layout === 'compact'}
                    />
                  </div>
                );
              } else {
                const ship = entity.data;
                return (
                  <div key={`ship-${ship.id}`} className={layout === 'compact' ? 'flex-1 min-w-[180px] max-w-[240px]' : ''}>
                    <SceneShipPanel
                      ship={ship}
                      onRemove={() => removeShipFromScene(ship.id)}
                      onUpdateDisposition={(disposition: ShipDisposition) => updateShipDisposition(ship.id, disposition)}
                      onToggleVisibility={() => toggleShipVisibility(ship.id)}
                      compact={layout === 'compact'}
                    />
                  </div>
                );
              }
            })}
          </div>
        </div>
      )}
    </div>
  );
}

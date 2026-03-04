/**
 * LivePlayDashboard.tsx
 *
 * Top-level orchestration component for a live play session. Brings together:
 *   - Player character panels (polled for real-time updates)
 *   - Scene NPCs and ships (hostile/neutral/friendly)
 *   - Crew ships / vehicles
 *   - Combat tools: dice roller + initiative tracker
 *
 * PC data is polled every 3 seconds so that changes made by players
 * (e.g. tracker updates) appear in near-real-time for the DM.
 */
import { useState, useCallback } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Play, LayoutGrid, LayoutList, Columns, Users, Trash2, Rocket, ChevronDown, ChevronRight, Swords } from 'lucide-react';
import { useCampaign } from '../../core/providers/CampaignProvider';
import { PCPanel } from './components/PCPanel';
import { SceneNPCPanel } from './components/SceneNPCPanel';
import { SceneShipPanel } from './components/SceneShipPanel';
import { CrewShipPanel } from './components/CrewShipPanel';
import { DiceRoller } from './components/DiceRoller';
import { InitiativeTracker } from '../../components/InitiativeTracker';
import { useSceneNPCs } from '../../core/providers/SceneNPCsProvider';
import { useSceneShips, type SceneShip } from '../../core/providers/SceneShipsProvider';
import { useInitiative } from '../../core/providers/InitiativeProvider';
import type { PlayerCharacterFrontmatter } from '@shared/schemas/player-character';
import type { ShipDamage, ShipDisposition } from '@shared/schemas/ship';
import type { FileMetadata } from '@shared/types/file';
import type { ApiResponse } from '@shared/types/api';

// ─── Constants ────────────────────────────────────────────────────

type LayoutMode = 'grid' | 'list' | 'compact';

// How often to refetch PC data for near-real-time updates
const POLL_INTERVAL = 1000;

// Sort order for mixed NPC/ship lists: hostiles first so DM sees threats at the top
const dispositionOrder = { hostile: 0, neutral: 1, friendly: 2 };

export function LivePlayDashboard() {
  const { campaign } = useCampaign();
  const queryClient = useQueryClient();

  // ── UI state ──
  // On mobile (< 768px), default to compact layout and collapsed combat tools
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const [layout, setLayout] = useState<LayoutMode>('compact');
  const [combatToolsExpanded, setCombatToolsExpanded] = useState(!isMobile);

  // ── Scene providers ──
  const { sceneNPCs, removeFromScene: removeNPCFromScene, clearScene: clearNPCScene, updateNPCStats, updateDisposition: updateNPCDisposition, toggleVisibility: toggleNPCVisibility } = useSceneNPCs();
  const { sceneShips, removeFromScene: removeShipFromScene, clearScene: clearShipScene, updateShip, updateDisposition: updateShipDisposition, toggleVisibility: toggleShipVisibility } = useSceneShips();
  const {
    initiative,
    addEntry,
    addEntriesBatch,
    removeEntry,
    updateEntry,
    clearAllEntries,
    nextTurn,
    prevTurn,
    moveEntryUp,
    moveEntryDown,
  } = useInitiative();

  // ── Derived data ──
  // Crew ships get their own top-level section; all other entities are
  // merged and sorted by disposition for the scene panel.
  const crewShips = sceneShips.filter((ship: SceneShip) => ship.isCrewShip);
  const nonCrewShips = sceneShips.filter((ship: SceneShip) => !ship.isCrewShip);
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

  // ── Player character polling ──
  // Uses a dedicated query key so polling doesn't interfere with the
  // main file-list cache. Continues polling even when the tab loses focus.
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
    refetchInterval: POLL_INTERVAL, // Poll every 1 second for live updates
    refetchIntervalInBackground: true, // Keep polling even when tab is not focused
    retry: false, // Don't retry on auth errors
  });

  // PATCH a PC's tracker values (HP, stress, etc.) and refresh immediately
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

  // ── "Add In Scene" ──
  // Collects all PCs, scene NPCs, and scene ships into a single batch
  // request. The server handles duplicate prevention, so this is safe to
  // call repeatedly without clearing initiative first.
  const handleAddInScene = useCallback(() => {
    const entriesToAdd: Array<Omit<import('@shared/types/initiative').InitiativeEntry, 'id'>> = [];

    // Add all player characters (always considered "in scene")
    for (const pc of characters) {
      const frontmatter = pc as unknown as PlayerCharacterFrontmatter;
      entriesToAdd.push({
        sourceType: 'pc',
        sourceId: pc.id,
        name: frontmatter.name || 'Unknown PC',
        portrait: frontmatter.portrait,
        initiative: 0,
        isActive: false,
      });
    }

    // Add all scene NPCs
    for (const npc of sceneNPCs) {
      entriesToAdd.push({
        sourceType: 'npc',
        sourceId: npc.id,
        name: npc.name,
        portrait: npc.portrait,
        portraitPosition: npc.portraitPosition,
        initiative: 0,
        isActive: false,
      });
    }

    // Add all scene ships (including crew ships)
    for (const ship of sceneShips) {
      entriesToAdd.push({
        sourceType: 'ship',
        sourceId: ship.id,
        name: ship.name,
        portrait: ship.image,
        portraitPosition: ship.imagePosition,
        initiative: 0,
        isActive: false,
      });
    }

    // Send all entries in a single batch request - server handles duplicate prevention
    if (entriesToAdd.length > 0) {
      addEntriesBatch(entriesToAdd);
    }
  }, [characters, sceneNPCs, sceneShips, addEntriesBatch]);

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

  // CSS class map for the three layout modes
  // On mobile, compact uses a single-column grid instead of flex-wrap
  const layoutClasses = {
    grid: 'grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    list: 'flex flex-col gap-3 md:gap-4',
    compact: 'flex flex-col gap-2 md:flex-row md:flex-wrap',
  };

  // ── Render ──
  return (
    <div className="space-y-3 md:space-y-6">
      {/* Page header + layout toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-3">
          <Play className="h-5 w-5 md:h-6 md:w-6 text-primary" />
          <h1 className="text-lg md:text-2xl font-bold text-foreground">Live Play</h1>
        </div>

        {/* Layout Toggle — hidden on mobile (auto-compact) */}
        <div className="hidden md:flex rounded-md border border-border">
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

      {/* Combat Tools Section - Collapsible Dice Roller + Initiative */}
      <div className="rounded-lg border border-border bg-card">
        {/* Collapsible header */}
        <button
          type="button"
          onClick={() => setCombatToolsExpanded(!combatToolsExpanded)}
          className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-accent/50"
        >
          {combatToolsExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <Swords className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Combat Tools</span>
          <span className="text-xs text-muted-foreground">(Dice Roller + Initiative)</span>
        </button>

        {/* Collapsible content */}
        {combatToolsExpanded && (
          <div className="border-t border-border px-3 py-3 md:px-4 md:py-4">
            <div className="flex flex-col gap-4 md:gap-6 lg:flex-row lg:items-start">
              {/* Dice Roller */}
              <div className="shrink-0 lg:w-[300px]">
                <DiceRoller isDM />
              </div>

              {/* Initiative Tracker */}
              <div className="min-w-0 flex-1 rounded-lg border border-border bg-background p-3 md:p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Swords className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-medium text-foreground">Initiative Order</h3>
                </div>
                <InitiativeTracker
                  initiative={initiative}
                  isDm={true}
                  onAddEntry={addEntry}
                  onRemoveEntry={removeEntry}
                  onUpdateEntry={updateEntry}
                  onClearAllEntries={clearAllEntries}
                  onNextTurn={nextTurn}
                  onPrevTurn={prevTurn}
                  onMoveEntryUp={moveEntryUp}
                  onMoveEntryDown={moveEntryDown}
                  onAddInScene={handleAddInScene}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Crew Ships + Vehicles Section - Spans full width above party */}
      {crewShips.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Rocket className="h-4 w-4" />
            <span>Crew Ships + Vehicles</span>
          </div>
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
            <div key={pc.id} className={layout === 'compact' ? 'md:flex-shrink-0' : ''}>
              <PCPanel
                pc={{
                  id: pc.id,
                  frontmatter: pc as unknown as PlayerCharacterFrontmatter,
                }}
                editable
                compact={layout === 'compact'}
                collapsible
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
                  <div key={`npc-${npc.id}`} className={layout === 'compact' ? 'w-full md:flex-1 md:min-w-[180px] md:max-w-[240px]' : ''}>
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
                  <div key={`ship-${ship.id}`} className={layout === 'compact' ? 'w-full md:flex-1 md:min-w-[180px] md:max-w-[240px]' : ''}>
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

/**
 * PlayerLivePlay -- Player-side live play dashboard.
 *
 * Shows the player's party, scene NPCs/ships (read-only), crew ships
 * (editable), a dice roller, and the initiative tracker (if DM has made it
 * visible). Polls the server every 3 seconds for DM-side updates.
 */
import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Play, LayoutGrid, LayoutList, Columns, Lock, Users, Rocket, ChevronDown, ChevronRight, Swords } from 'lucide-react';
import { useAuth } from '../core/providers/AuthProvider';
import { useCampaign } from '../core/providers/CampaignProvider';
import { PCPanel } from '../modules/live-play/components/PCPanel';
import { SceneNPCPanel } from '../modules/live-play/components/SceneNPCPanel';
import { SceneShipPanel } from '../modules/live-play/components/SceneShipPanel';
import { CrewShipPanel } from '../modules/live-play/components/CrewShipPanel';
import { DiceRoller } from '../modules/live-play/components/DiceRoller';
import { InitiativeTracker } from '../components/InitiativeTracker';
import { useSceneNPCs, type SceneNPC } from '../core/providers/SceneNPCsProvider';
import { useSceneShips, type SceneShip } from '../core/providers/SceneShipsProvider';
import { useInitiative } from '../core/providers/InitiativeProvider';
import type { PlayerCharacterFrontmatter } from '@shared/schemas/player-character';
import type { FileMetadata } from '@shared/types/file';
import type { ApiResponse } from '@shared/types/api';
import type { ShipDamage } from '@shared/schemas/ship';

type LayoutMode = 'grid' | 'list' | 'compact';

// Polling interval for live updates (1 second)
const POLL_INTERVAL = 1000;

// Sort hostile entities first so threats are prominent in the player view
const dispositionOrder = { hostile: 0, neutral: 1, friendly: 2 } as const;

// Discriminated union so NPCs and ships can share one sorted list
type SceneEntity =
  | { type: 'npc'; data: SceneNPC }
  | { type: 'ship'; data: SceneShip };

export function PlayerLivePlay() {
  const { playerName } = useAuth();
  const { campaign } = useCampaign();
  const queryClient = useQueryClient();
  // On mobile (< 768px), default to collapsed combat tools
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const [layout, setLayout] = useState<LayoutMode>('compact');
  const [combatToolsExpanded, setCombatToolsExpanded] = useState(!isMobile);
  const [sceneExpanded, setSceneExpanded] = useState(true);
  const { sceneNPCs } = useSceneNPCs();
  const { sceneShips, updateShip } = useSceneShips();
  const { initiative } = useInitiative();

  // When per-player auth is active, auto-lock editing to the player's own character.
  // Otherwise fall back to click-to-select behaviour.
  const [selectedPCId, setSelectedPCId] = useState<string | null>(null);

  // ── Character data (polled) ────────────────────────────────────────
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
    refetchInterval: POLL_INTERVAL, // Poll every 1 second for live updates
    refetchIntervalInBackground: true, // Keep polling even when tab is not focused
    retry: false, // Don't retry on auth errors
  });

  // If per-player auth is active, find the character that belongs to this player
  const ownPCId = playerName
    ? characters.find((pc) => (pc as Record<string, unknown>).player === playerName)?.id ?? null
    : null;
  const editablePCId = ownPCId ?? selectedPCId;

  // ── Tracker mutation ────────────────────────────────────────────────
  // PATCH-only mutation for tracker fields (pressure, harm, etc.)
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

  // ── Loading / error states ──────────────────────────────────────────
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

  // ── Render ──────────────────────────────────────────────────────────
  // CSS grid/flex classes per layout mode
  const layoutClasses = {
    grid: 'grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    list: 'flex flex-col gap-3 md:gap-4',
    compact: 'flex flex-col gap-2 md:flex-row md:flex-wrap md:items-stretch',
  };

  return (
    <div className="space-y-3 md:space-y-6">
      {/* Header */}
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
                <DiceRoller />
              </div>

              {/* Initiative Tracker (read-only for players, only shows if DM has made it visible) */}
              {initiative.visibleToPlayers && (
                <div className="min-w-0 flex-1 rounded-lg border border-border bg-background p-3 md:p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Swords className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-medium text-foreground">Initiative Order</h3>
                  </div>
                  <InitiativeTracker
                    initiative={initiative}
                    isDm={false}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Crew Ships + Vehicles Section (editable for players) - appears above party */}
      {sceneShips.filter(s => s.isCrewShip).length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Rocket className="h-4 w-4" />
            <span>Crew Ships + Vehicles</span>
          </div>

          {sceneShips
            .filter(s => s.isCrewShip)
            .map(ship => (
              <CrewShipPanel
                key={ship.id}
                ship={ship}
                editable={true}
                onUpdatePressure={(pressure) => updateShip(ship.id, { pressure })}
                onUpdateDamage={(damage) => updateShip(ship.id, { damage: damage as ShipDamage })}
              />
            ))}
        </div>
      )}

      {/* Info banner - directly above character row */}
      <div className="flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm text-muted-foreground">
        <Lock className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0" />
        <span>
          {ownPCId
            ? `Editing ${characters.find(c => c.id === ownPCId)?.name ?? 'your character'}`
            : 'Tap a character to edit. Others are read-only.'}
        </span>
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
          {characters.map((pc, i) => {
            const isEditable = editablePCId === pc.id;
            const canSelect = !ownPCId; // Click-to-select only when no per-player auth

            return layout === 'compact' ? (
                <PCPanel
                  key={pc.id}
                  pc={{
                    id: pc.id,
                    frontmatter: pc as unknown as PlayerCharacterFrontmatter,
                  }}
                  editable={isEditable}
                  compact
                  collapsible
                  defaultExpanded={isEditable || !ownPCId}
                  index={i}
                  className={`transition-all ${
                    canSelect ? 'cursor-pointer' : ''
                  } ${
                    isEditable ? 'ring-2 ring-primary' : 'opacity-80' + (canSelect ? ' hover:opacity-100' : '')
                  }`}
                  onClick={() => canSelect && setSelectedPCId(pc.id)}
                  onUpdate={(updates) => handleUpdatePC(pc.id, updates)}
                />
            ) : (
              <div
                key={pc.id}
                onClick={() => canSelect && setSelectedPCId(pc.id)}
                className={`transition-all ${
                  canSelect ? 'cursor-pointer' : ''
                } ${
                  isEditable ? 'ring-2 ring-primary' : 'opacity-80' + (canSelect ? ' hover:opacity-100' : '')
                }`}
              >
                <PCPanel
                  pc={{
                    id: pc.id,
                    frontmatter: pc as unknown as PlayerCharacterFrontmatter,
                  }}
                  editable={isEditable}
                  collapsible
                  defaultExpanded={isEditable || !ownPCId}
                  index={i}
                  onUpdate={(updates) => handleUpdatePC(pc.id, updates)}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Scene NPCs & Ships -- read-only for players, sorted hostile-first */}
      {(() => {
        // Crew ships are shown separately above; only non-crew ships appear here
        const nonCrewShips = sceneShips.filter(s => !s.isCrewShip);

        // Merge NPCs and ships into a single disposition-sorted list
        const sceneEntities: SceneEntity[] = [
          ...sceneNPCs.map(npc => ({ type: 'npc' as const, data: npc })),
          ...nonCrewShips.map(ship => ({ type: 'ship' as const, data: ship })),
        ].sort((a, b) => {
          const aDisp = (a.data.disposition || 'neutral') as keyof typeof dispositionOrder;
          const bDisp = (b.data.disposition || 'neutral') as keyof typeof dispositionOrder;
          return dispositionOrder[aDisp] - dispositionOrder[bDisp];
        });

        if (sceneEntities.length === 0) return null;

        return (
          <div className="rounded-lg border border-border bg-card">
            {/* Collapsible header */}
            <button
              type="button"
              onClick={() => setSceneExpanded(!sceneExpanded)}
              className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-accent/50"
            >
              {sceneExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">NPCs & Entities in Scene</span>
              <span className="text-xs text-muted-foreground">({sceneEntities.length})</span>
            </button>

            {/* Collapsible content */}
            {sceneExpanded && (
              <div className="border-t border-border px-3 py-3 md:px-4 md:py-4">
                <div className={layoutClasses[layout]}>
                  {sceneEntities.map(entity => (
                    <div
                      key={`${entity.type}-${entity.data.id}`}
                      className={layout === 'compact' ? 'w-full md:flex-1 md:min-w-[180px] md:max-w-[240px]' : ''}
                    >
                      {entity.type === 'npc' ? (
                        <SceneNPCPanel
                          npc={entity.data}
                          compact={layout === 'compact'}
                          showStats={false}
                        />
                      ) : (
                        <SceneShipPanel
                          ship={entity.data}
                          compact={layout === 'compact'}
                          showControls={false}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

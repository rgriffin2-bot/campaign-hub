/**
 * LivePlayDashboard.tsx
 *
 * Unified live play dashboard for both DM and player views.
 * Brings together:
 *   - Player character panels (polled for real-time updates)
 *   - Scene NPCs and ships (hostile/neutral/friendly)
 *   - Crew ships / vehicles
 *   - Combat tools: dice roller + initiative tracker
 *
 * The `isDm` prop controls which features are available:
 *   - DM: full editing, scene management, initiative controls, per-player selector
 *   - Player: read-only scene, editable own PC only, dice roller
 */
import { useState, useCallback } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Play, Users, Trash2, Rocket, ChevronDown, ChevronRight, Swords, Plus, Eye, EyeOff } from 'lucide-react';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useAuth } from '../../core/providers/AuthProvider';
import { useCampaign } from '../../core/providers/CampaignProvider';
import { PCPanel } from './components/PCPanel';
import { SceneNPCPanel } from './components/SceneNPCPanel';
import { SceneShipPanel } from './components/SceneShipPanel';
import { CrewShipPanel } from './components/CrewShipPanel';
import { DiceRoller } from './components/DiceRoller';
import { AddToSceneDialog } from './components/AddToSceneDialog';
import { InitiativeTracker } from '../../components/InitiativeTracker';
import { useSceneNPCs, type SceneNPC } from '../../core/providers/SceneNPCsProvider';
import { useSceneShips, type SceneShip } from '../../core/providers/SceneShipsProvider';
import { useInitiative } from '../../core/providers/InitiativeProvider';
import type { PlayerCharacterFrontmatter } from '@shared/schemas/player-character';
import type { ShipDamage, ShipDisposition } from '@shared/schemas/ship';
import type { FileMetadata } from '@shared/types/file';
import type { ApiResponse } from '@shared/types/api';

// ─── Constants ────────────────────────────────────────────────────

const POLL_INTERVAL = 3000;

const dispositionOrder = { hostile: 0, neutral: 1, friendly: 2 };

type SceneEntity =
  | { type: 'npc'; data: SceneNPC }
  | { type: 'ship'; data: SceneShip };

interface LivePlayDashboardProps {
  isDm?: boolean;
}

export function LivePlayDashboard({ isDm = true }: LivePlayDashboardProps) {
  const { playerName } = useAuth();
  const { campaign } = useCampaign();
  const queryClient = useQueryClient();

  // ── UI state ──
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const [combatToolsExpanded, setCombatToolsExpanded] = useState(!isMobile);
  const [sceneExpanded, setSceneExpanded] = useState(true);
  const [crewShipsExpanded, setCrewShipsExpanded] = useState(true);
  const [partyExpanded, setPartyExpanded] = useState(true);
  const [addToSceneOpen, setAddToSceneOpen] = useState(false);
  // Per-player visibility (DM only): which PC cards are shown. null = show all.
  const [visiblePCIds, setVisiblePCIds] = useState<Set<string> | null>(null);
  // Player click-to-select (when no per-player auth)
  const [selectedPCId, setSelectedPCId] = useState<string | null>(null);
  // Confirm dialog for clear scene
  const [confirmClearScene, setConfirmClearScene] = useState(false);

  // ── Scene providers ──
  const {
    sceneNPCs,
    removeFromScene: removeNPCFromScene,
    clearScene: clearNPCScene,
    updateNPCStats,
    updateDisposition: updateNPCDisposition,
    toggleVisibility: toggleNPCVisibility,
  } = useSceneNPCs();
  const {
    sceneShips,
    removeFromScene: removeShipFromScene,
    clearScene: clearShipScene,
    updateShip,
    updateDisposition: updateShipDisposition,
    toggleVisibility: toggleShipVisibility,
  } = useSceneShips();
  const {
    initiative,
    addEntry,
    addEntriesBatch,
    removeEntry,
    updateEntry,
    clearAllEntries,
    nextTurn,
    prevTurn,
    reorderList,
    toggleVisibility: toggleInitiativeVisibility,
  } = useInitiative();

  // ── Derived data ──
  const crewShips = sceneShips.filter((ship: SceneShip) => ship.isCrewShip);
  const nonCrewShips = sceneShips.filter((ship: SceneShip) => !ship.isCrewShip);

  const sceneEntities: SceneEntity[] = [
    ...sceneNPCs.map(npc => ({ type: 'npc' as const, data: npc })),
    ...nonCrewShips.map(ship => ({ type: 'ship' as const, data: ship })),
  ].sort((a, b) => {
    const aDisp = (a.data.disposition || 'neutral') as keyof typeof dispositionOrder;
    const bDisp = (b.data.disposition || 'neutral') as keyof typeof dispositionOrder;
    return dispositionOrder[aDisp] - dispositionOrder[bDisp];
  });

  // ── Player character polling ──
  // DM and player use different API endpoints
  const apiBase = isDm
    ? `/api/campaigns/${campaign?.id}/files/player-characters`
    : `/api/player/campaigns/${campaign?.id}/files/player-characters`;
  const queryKeyPrefix = isDm ? 'live-play' : 'player-live-play';

  const { data: characters = [], isLoading, error } = useQuery({
    queryKey: [queryKeyPrefix, campaign?.id, 'player-characters'],
    queryFn: async () => {
      if (!campaign) return [];
      const res = await fetch(apiBase, { credentials: 'include' });
      const data: ApiResponse<FileMetadata[]> = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data || [];
    },
    enabled: !!campaign,
    refetchInterval: POLL_INTERVAL,
    refetchIntervalInBackground: true,
    retry: false,
  });

  // ── Player-side: auto-lock to own character ──
  const ownPCId = !isDm && playerName
    ? characters.find((pc) => (pc as Record<string, unknown>).player === playerName)?.id ?? null
    : null;
  const editablePCId = isDm ? null : (ownPCId ?? selectedPCId);

  // ── Tracker mutation ──
  const updateTrackers = useMutation({
    mutationFn: async ({
      pcId,
      updates,
    }: {
      pcId: string;
      updates: Partial<PlayerCharacterFrontmatter>;
    }) => {
      if (!campaign) throw new Error('No active campaign');

      const url = isDm
        ? `/api/modules/player-characters/${pcId}/trackers`
        : `/api/player/campaigns/${campaign.id}/files/player-characters/${pcId}/trackers`;

      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
        credentials: 'include',
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [queryKeyPrefix, campaign?.id, 'player-characters'],
      });
    },
  });

  const handleUpdatePC = (pcId: string, updates: Partial<PlayerCharacterFrontmatter>) => {
    updateTrackers.mutate({ pcId, updates });
  };

  const handleClearScene = () => {
    setConfirmClearScene(true);
  };

  const executeClearScene = () => {
    clearNPCScene();
    clearShipScene();
    setConfirmClearScene(false);
  };

  // ── "Add In Scene" (DM only) ──
  const handleAddInScene = useCallback(() => {
    const entriesToAdd: Array<Omit<import('@shared/types/initiative').InitiativeEntry, 'id'>> = [];

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

    if (entriesToAdd.length > 0) {
      addEntriesBatch(entriesToAdd);
    }
  }, [characters, sceneNPCs, sceneShips, addEntriesBatch]);

  // ── Per-player visibility helpers (DM only) ──
  const shownCharacters = visiblePCIds === null
    ? characters
    : characters.filter(pc => visiblePCIds.has(pc.id));

  const togglePC = (pcId: string) => {
    setVisiblePCIds(prev => {
      if (prev === null) {
        const allIds = new Set(characters.map(c => c.id));
        allIds.delete(pcId);
        return allIds;
      }
      const next = new Set(prev);
      if (next.has(pcId)) {
        next.delete(pcId);
      } else {
        next.add(pcId);
      }
      return next;
    });
  };

  const showAllPCs = () => setVisiblePCIds(null);
  const hideAllPCs = () => setVisiblePCIds(new Set());

  // ── Loading / error states ──
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

  // For player view, characters to render are all of them (no per-player selector)
  const displayedCharacters = isDm ? shownCharacters : characters;

  // ── Render ──
  return (
    <div className="space-y-3 md:space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-2 md:gap-3">
        <Play className="h-5 w-5 md:h-6 md:w-6 text-primary" />
        <h1 className="text-lg md:text-2xl font-bold text-foreground">Live Play</h1>
      </div>

      {/* Combat Tools Section - Collapsible Dice Roller + Initiative */}
      <div className="rounded-lg border border-border bg-card">
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

        {combatToolsExpanded && (
          <div className="border-t border-border px-3 py-3 md:px-4 md:py-4">
            <div className="flex flex-col gap-4 md:gap-6 lg:flex-row lg:items-start">
              <div className="shrink-0 lg:w-[300px]">
                <DiceRoller isDM={isDm} />
              </div>

              {/* Initiative Tracker — DM gets full controls; players see read-only if visible */}
              {(isDm || initiative.visibleToPlayers) && (
                <div className="min-w-0 flex-1 rounded-lg border border-border bg-background p-3 md:p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Swords className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-medium text-foreground">Initiative Order</h3>
                    {isDm && (
                      <button
                        onClick={toggleInitiativeVisibility}
                        className={`ml-auto flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                          initiative.visibleToPlayers
                            ? 'text-muted-foreground hover:bg-accent'
                            : 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
                        }`}
                        title={initiative.visibleToPlayers ? 'Visible to players' : 'Hidden from players'}
                      >
                        {initiative.visibleToPlayers ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                        {initiative.visibleToPlayers ? 'Visible' : 'Hidden'}
                      </button>
                    )}
                  </div>
                  <InitiativeTracker
                    initiative={initiative}
                    isDm={isDm}
                    {...(isDm ? {
                      onAddEntry: addEntry,
                      onRemoveEntry: removeEntry,
                      onUpdateEntry: updateEntry,
                      onClearAllEntries: clearAllEntries,
                      onNextTurn: nextTurn,
                      onPrevTurn: prevTurn,
                      onReorderList: reorderList,
                      onAddInScene: handleAddInScene,
                    } : {})}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Crew Ships + Vehicles Section - Collapsible */}
      {crewShips.length > 0 && (
        <div className="rounded-lg border border-border bg-card">
          <button
            type="button"
            onClick={() => setCrewShipsExpanded(!crewShipsExpanded)}
            className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-accent/50"
          >
            {crewShipsExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <Rocket className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Crew Ships + Vehicles</span>
            <span className="text-xs text-muted-foreground">({crewShips.length})</span>
          </button>
          {crewShipsExpanded && (
            <div className="border-t border-border px-3 py-3 md:px-4 md:py-4 space-y-2">
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
        </div>
      )}

      {/* Party Tracker - Collapsible with per-player selector (DM) or click-to-select (Player) */}
      {characters.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 p-12 text-center">
          <Play className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            No characters yet
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {isDm
              ? 'Add player characters to use the Live Play tracker.'
              : "The DM hasn't added any player characters yet."}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card">
          {/* Collapsible header */}
          <button
            type="button"
            onClick={() => setPartyExpanded(!partyExpanded)}
            className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-accent/50"
          >
            {partyExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <Users className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Player Characters</span>
            <span className="text-xs text-muted-foreground">({characters.length})</span>
            {!isDm && (
              <span className="ml-auto text-xs text-muted-foreground italic">
                {ownPCId
                  ? `Editing ${characters.find(c => c.id === ownPCId)?.name ?? 'your character'}`
                  : 'Tap a character to edit. Others are read-only.'}
              </span>
            )}
          </button>

          {partyExpanded && (
            <div className="border-t border-border">
              {/* Per-player selector bar (DM only) */}
              {isDm && (
                <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 md:px-4 border-b border-border bg-muted/30">
                  <button
                    onClick={showAllPCs}
                    className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                      visiblePCIds === null
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={hideAllPCs}
                    className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                      visiblePCIds !== null && visiblePCIds.size === 0
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    }`}
                  >
                    None
                  </button>
                  <div className="mx-1 h-4 w-px bg-border" />
                  {characters.map((pc) => {
                    const fm = pc as unknown as PlayerCharacterFrontmatter;
                    const isVisible = visiblePCIds === null || visiblePCIds.has(pc.id);
                    return (
                      <button
                        key={pc.id}
                        onClick={() => togglePC(pc.id)}
                        className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                          isVisible
                            ? 'bg-primary/15 text-primary ring-1 ring-primary/30'
                            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                        }`}
                      >
                        {fm.name || pc.id}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* PC cards */}
              <div className="px-3 py-3 md:px-4 md:py-4">
                {displayedCharacters.length === 0 ? (
                  <div className="py-4 text-center text-sm text-muted-foreground">
                    No characters selected
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-stretch">
                    {displayedCharacters.map((pc, i) => {
                      const isEditable = isDm || editablePCId === pc.id;
                      const canSelect = !isDm && !ownPCId;

                      return (
                        <PCPanel
                          key={pc.id}
                          pc={{
                            id: pc.id,
                            frontmatter: pc as unknown as PlayerCharacterFrontmatter,
                          }}
                          editable={isEditable}
                          compact
                          collapsible
                          defaultExpanded={isDm || isEditable || !ownPCId}
                          index={i}
                          className={!isDm ? `transition-all ${
                            canSelect ? 'cursor-pointer' : ''
                          } ${
                            isEditable ? 'ring-2 ring-primary' : 'opacity-80' + (canSelect ? ' hover:opacity-100' : '')
                          }` : ''}
                          onClick={canSelect ? () => setSelectedPCId(pc.id) : undefined}
                          onUpdate={(updates) => handleUpdatePC(pc.id, updates)}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Scene Entities (NPCs + Non-Crew Ships) - Collapsible, sorted by disposition */}
      {isDm && sceneEntities.length === 0 && (
        <button
          onClick={() => setAddToSceneOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-card/50 px-4 py-6 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
          Add NPCs or ships to the scene
        </button>
      )}
      {sceneEntities.length > 0 && (
        <div className="rounded-lg border border-border bg-card">
          {/* Collapsible header */}
          <div className="flex items-center justify-between px-4 py-3">
            <button
              type="button"
              onClick={() => setSceneExpanded(!sceneExpanded)}
              className="flex items-center gap-2 text-left transition-colors hover:text-foreground"
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
            {isDm && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setAddToSceneOpen(true)}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-primary/10 hover:text-primary"
                  title="Add NPC or ship to scene"
                >
                  <Plus className="h-3 w-3" />
                  Add
                </button>
                <button
                  onClick={handleClearScene}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  title="Clear all from scene"
                >
                  <Trash2 className="h-3 w-3" />
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Collapsible content */}
          {sceneExpanded && (
            <div className="border-t border-border px-3 py-3 md:px-4 md:py-4">
              <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-stretch">
                {sceneEntities.map((entity) => {
                  if (entity.type === 'npc') {
                    const npc = entity.data;
                    return (
                      <div key={`npc-${npc.id}`} className="w-full md:flex-1 md:min-w-[180px] md:max-w-[240px]">
                        <SceneNPCPanel
                          npc={npc}
                          compact
                          {...(isDm ? {
                            onRemove: () => removeNPCFromScene(npc.id),
                            onUpdateStats: (updates: Parameters<typeof updateNPCStats>[1]) => updateNPCStats(npc.id, updates),
                            onUpdateDisposition: (disposition: Parameters<typeof updateNPCDisposition>[1]) => updateNPCDisposition(npc.id, disposition),
                            onToggleVisibility: () => toggleNPCVisibility(npc.id),
                          } : {
                            showStats: false,
                          })}
                        />
                      </div>
                    );
                  } else {
                    const ship = entity.data;
                    return (
                      <div key={`ship-${ship.id}`} className="w-full md:flex-1 md:min-w-[180px] md:max-w-[240px]">
                        <SceneShipPanel
                          ship={ship}
                          compact
                          {...(isDm ? {
                            onRemove: () => removeShipFromScene(ship.id),
                            onUpdateDisposition: (disposition: ShipDisposition) => updateShipDisposition(ship.id, disposition),
                            onToggleVisibility: () => toggleShipVisibility(ship.id),
                          } : {
                            showControls: false,
                          })}
                        />
                      </div>
                    );
                  }
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add to Scene Dialog (DM only) */}
      {isDm && <AddToSceneDialog open={addToSceneOpen} onClose={() => setAddToSceneOpen(false)} />}

      {/* Clear Scene Confirmation */}
      <ConfirmDialog
        open={confirmClearScene}
        title="Clear Scene"
        message="Remove all NPCs and ships from the scene? This won't delete them from your campaign."
        confirmLabel="Clear All"
        onConfirm={executeClearScene}
        onCancel={() => setConfirmClearScene(false)}
      />
    </div>
  );
}

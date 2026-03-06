/**
 * AddToSceneDialog -- Modal for quickly adding NPCs and ships from module data
 * to the live play scene. DM-only. Shows a searchable list with tabs for
 * NPCs and Ships, with already-in-scene items greyed out.
 */
import { useState } from 'react';
import { X, Search, User, Rocket, Plus, Check } from 'lucide-react';
import { useFiles } from '../../../hooks/useFiles';
import { useSceneNPCs } from '../../../core/providers/SceneNPCsProvider';
import { useSceneShips } from '../../../core/providers/SceneShipsProvider';
import type { FileMetadata } from '@shared/types/file';
import type { SceneNPC } from '@shared/types/scene';
import type { SceneShip } from '@shared/types/scene';
import type { ShipDamage } from '@shared/schemas/ship';

type Tab = 'npcs' | 'ships';

interface AddToSceneDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AddToSceneDialog({ open, onClose }: AddToSceneDialogProps) {
  const [tab, setTab] = useState<Tab>('npcs');
  const [search, setSearch] = useState('');

  const { list: npcList } = useFiles('npcs');
  const { list: shipList } = useFiles('ships');
  const { addToScene: addNPC, isInScene: npcInScene } = useSceneNPCs();
  const { addToScene: addShip, isInScene: shipInScene } = useSceneShips();

  if (!open) return null;

  const npcs = npcList.data || [];
  const ships = shipList.data || [];

  const filterBySearch = (items: FileMetadata[]) =>
    search.trim()
      ? items.filter(item => item.name.toLowerCase().includes(search.toLowerCase()))
      : items;

  const handleAddNPC = (npc: FileMetadata) => {
    const sceneNPC: SceneNPC = {
      id: npc.id,
      name: npc.name,
      occupation: npc.occupation as string | undefined,
      portrait: npc.portrait as string | undefined,
      portraitPosition: npc.portraitPosition as { x: number; y: number; scale: number } | undefined,
      hasStats: (npc.hasStats ?? npc.isAntagonist) as boolean | undefined,
      stats: (npc.stats ?? npc.antagonistStats) as SceneNPC['stats'],
      disposition: (npc.disposition as SceneNPC['disposition']) || 'neutral',
      visibleToPlayers: true,
    };
    addNPC(sceneNPC);
  };

  const handleAddShip = (ship: FileMetadata) => {
    const sceneShip: SceneShip = {
      id: ship.id,
      name: ship.name,
      type: ship.type as string | undefined,
      class: ship.class as string | undefined,
      image: ship.image as string | undefined,
      isCrewShip: (ship.isCrewShip as boolean) || false,
      pressure: (ship.pressure as number) || 0,
      damage: ship.damage as ShipDamage | undefined,
      disposition: (ship.disposition as SceneShip['disposition']) || 'neutral',
      visibleToPlayers: true,
    };
    addShip(sceneShip);
  };

  const filteredNPCs = filterBySearch(npcs);
  const filteredShips = filterBySearch(ships);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Dialog */}
      <div className="relative z-10 w-[95vw] max-w-md rounded-lg border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Add to Scene</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setTab('npcs')}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
              tab === 'npcs'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <User className="h-3.5 w-3.5" />
            NPCs ({npcs.length})
          </button>
          <button
            onClick={() => setTab('ships')}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
              tab === 'ships'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Rocket className="h-3.5 w-3.5" />
            Ships ({ships.length})
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2">
          <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${tab}...`}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              autoFocus
            />
          </div>
        </div>

        {/* List */}
        <div className="max-h-[300px] overflow-y-auto px-2 pb-2">
          {tab === 'npcs' ? (
            filteredNPCs.length === 0 ? (
              <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                {npcs.length === 0 ? 'No NPCs in this campaign' : 'No matches'}
              </p>
            ) : (
              filteredNPCs.map(npc => {
                const inScene = npcInScene(npc.id);
                return (
                  <button
                    key={npc.id}
                    onClick={() => !inScene && handleAddNPC(npc)}
                    disabled={inScene}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                      inScene
                        ? 'opacity-50 cursor-default'
                        : 'hover:bg-accent cursor-pointer'
                    }`}
                  >
                    <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-foreground">{npc.name}</div>
                      {npc.occupation && (
                        <div className="truncate text-xs text-muted-foreground">{npc.occupation as string}</div>
                      )}
                    </div>
                    {inScene ? (
                      <Check className="h-4 w-4 shrink-0 text-green-500" />
                    ) : (
                      <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                  </button>
                );
              })
            )
          ) : (
            filteredShips.length === 0 ? (
              <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                {ships.length === 0 ? 'No ships in this campaign' : 'No matches'}
              </p>
            ) : (
              filteredShips.map(ship => {
                const inScene = shipInScene(ship.id);
                return (
                  <button
                    key={ship.id}
                    onClick={() => !inScene && handleAddShip(ship)}
                    disabled={inScene}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                      inScene
                        ? 'opacity-50 cursor-default'
                        : 'hover:bg-accent cursor-pointer'
                    }`}
                  >
                    <Rocket className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-foreground">{ship.name}</div>
                      {ship.type && (
                        <div className="truncate text-xs text-muted-foreground">{ship.type as string}</div>
                      )}
                    </div>
                    {inScene ? (
                      <Check className="h-4 w-4 shrink-0 text-green-500" />
                    ) : (
                      <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                  </button>
                );
              })
            )
          )}
        </div>
      </div>
    </div>
  );
}

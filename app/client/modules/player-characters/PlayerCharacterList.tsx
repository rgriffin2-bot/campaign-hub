import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Users, Heart, Coins, Sparkles } from 'lucide-react';
import { useFiles } from '../../hooks/useFiles';
import { useCampaign } from '../../core/providers/CampaignProvider';
import type { FileMetadata } from '@shared/types/file';
import type { ResourceLevel, HarmState } from '@shared/schemas/player-character';

const resourceColors: Record<ResourceLevel, string> = {
  screwed: 'bg-red-500',
  dry: 'bg-orange-500',
  light: 'bg-yellow-500',
  covered: 'bg-green-500',
  flush: 'bg-blue-500',
  swimming: 'bg-purple-500',
};

function PressurePips({ value }: { value: number }) {
  return (
    <div className="flex gap-1">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className={`h-2 w-2 rounded-full ${
            i < value ? 'bg-amber-500' : 'bg-muted'
          }`}
        />
      ))}
    </div>
  );
}

function HarmIndicator({ harm }: { harm?: HarmState }) {
  if (!harm) return null;

  const hasHarm = harm.oldWounds || harm.mild || harm.moderate || harm.severe;
  if (!hasHarm) return null;

  const severity = harm.severe ? 'Severe' : harm.moderate ? 'Moderate' : harm.mild ? 'Mild' : 'Old Wounds';
  const color = harm.severe ? 'text-red-500' : harm.moderate ? 'text-orange-500' : harm.mild ? 'text-yellow-500' : 'text-muted-foreground';

  return (
    <div className={`flex items-center gap-1 text-xs ${color}`}>
      <Heart className="h-3 w-3" />
      {severity}
    </div>
  );
}

function PlayerCharacterCard({ item }: { item: FileMetadata }) {
  const { campaign } = useCampaign();
  const portrait = item.portrait as string | undefined;
  const playbook = item.playbook as string | undefined;
  const player = item.player as string | undefined;
  const pressure = (item.pressure as number) || 0;
  const resources = (item.resources as ResourceLevel) || 'covered';
  const harm = item.harm as HarmState | undefined;

  return (
    <Link
      to={`/modules/player-characters/${item.id}`}
      className="group rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-accent"
    >
      <div className="flex gap-4">
        {/* Portrait */}
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
          {portrait && campaign ? (
            <img
              src={`/api/campaigns/${campaign.id}/assets/${portrait.replace('assets/', '')}`}
              alt={item.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-foreground group-hover:text-primary">
            {item.name}
          </h3>
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {playbook && (
              <span className="rounded bg-primary/10 px-2 py-0.5 text-primary">
                {playbook}
              </span>
            )}
            {player && <span>Player: {player}</span>}
          </div>

          {/* Status row */}
          <div className="mt-2 flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" />
              <PressurePips value={pressure} />
            </div>
            <div className="flex items-center gap-1">
              <Coins className="h-3 w-3 text-muted-foreground" />
              <div className={`h-2 w-2 rounded-full ${resourceColors[resources]}`} />
            </div>
            <HarmIndicator harm={harm} />
          </div>
        </div>
      </div>
    </Link>
  );
}

export function PlayerCharacterList() {
  const { list } = useFiles('player-characters');
  const [search, setSearch] = useState('');

  const characters = list.data || [];

  const filteredItems = characters.filter((item) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      item.name.toLowerCase().includes(searchLower) ||
      (item.player as string)?.toLowerCase().includes(searchLower) ||
      (item.playbook as string)?.toLowerCase().includes(searchLower)
    );
  });

  if (list.isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Player Characters</h1>
        </div>
        <Link
          to="/modules/player-characters/new"
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Character
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search characters..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-input bg-background py-2 pl-10 pr-4 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Character Grid */}
      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 p-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            {characters.length === 0 ? 'No characters yet' : 'No matches found'}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {characters.length === 0
              ? 'Add your first player character to get started.'
              : 'Try adjusting your search.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <PlayerCharacterCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

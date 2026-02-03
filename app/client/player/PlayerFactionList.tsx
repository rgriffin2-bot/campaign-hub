import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Users } from 'lucide-react';
import { usePlayerFiles } from './hooks/usePlayerFiles';
import { affinityLabels, FACTION_TYPE_LABELS, type FactionType } from '@shared/schemas/faction';

export function PlayerFactionList() {
  const { list } = usePlayerFiles('factions');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<FactionType | 'all'>('all');

  const factions = list.data || [];

  const filteredFactions = factions.filter((faction) => {
    const matchesSearch =
      search === '' ||
      faction.name.toLowerCase().includes(search.toLowerCase()) ||
      (faction.description as string | undefined)?.toLowerCase().includes(search.toLowerCase()) ||
      (faction.tags as string[] | undefined)?.some((tag: string) =>
        tag.toLowerCase().includes(search.toLowerCase())
      );

    const matchesType = filterType === 'all' || faction.type === filterType;

    return matchesSearch && matchesType;
  });

  // Sort by affinity (highest first), then by name
  const sortedFactions = [...filteredFactions].sort((a, b) => {
    const affinityA = (a.affinity as number | undefined) ?? 0;
    const affinityB = (b.affinity as number | undefined) ?? 0;
    if (affinityA !== affinityB) return affinityB - affinityA;
    return a.name.localeCompare(b.name);
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
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Factions</h1>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search factions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-input bg-background py-2 pl-10 pr-4 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as FactionType | 'all')}
          className="rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="all">All Types</option>
          {Object.entries(FACTION_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Affinity Legend */}
      <div className="flex flex-wrap gap-2 text-xs">
        {Object.entries(affinityLabels).map(([value, label]) => {
          const affinity = parseInt(value);
          return (
            <div key={value} className="flex items-center gap-1">
              <span
                className={`inline-block h-3 w-3 rounded-full ${getAffinityColor(affinity)}`}
              />
              <span className="text-muted-foreground">
                {affinity > 0 ? `+${affinity}` : affinity} {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Factions Grid */}
      {sortedFactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 p-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            {factions.length === 0 ? 'No factions yet' : 'No matches found'}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {factions.length === 0
              ? 'The DM hasn\'t added any factions yet.'
              : 'Try adjusting your search or filter.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedFactions.map((faction) => {
            const affinity = (faction.affinity as number | undefined) ?? 0;
            const factionType = faction.type as FactionType | undefined;
            const description = faction.description as string | undefined;

            return (
              <Link
                key={faction.id}
                to={`/player/modules/factions/${faction.id}`}
                className="group rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50"
              >
                {/* Name and affinity */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground group-hover:text-primary truncate">
                      {faction.name}
                    </h3>
                    {factionType && (
                      <p className="text-xs text-muted-foreground">
                        {FACTION_TYPE_LABELS[factionType]}
                      </p>
                    )}
                  </div>

                  {/* Affinity badge */}
                  <div
                    className={`flex h-6 min-w-[2.5rem] items-center justify-center rounded px-2 text-sm font-medium shrink-0 ${getAffinityBgColor(affinity)}`}
                    title={affinityLabels[affinity]}
                  >
                    {affinity > 0 ? `+${affinity}` : affinity}
                  </div>
                </div>

                {/* Affinity label */}
                <p className={`mt-1 text-xs font-medium ${getAffinityTextColor(affinity)}`}>
                  {affinityLabels[affinity]}
                </p>

                {/* Description */}
                {description && (
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                    {description}
                  </p>
                )}

                {/* Tags */}
                {(faction.tags as string[] | undefined)?.length ? (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {(faction.tags as string[]).slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-secondary px-2 py-0.5 text-xs text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </Link>
            );
          })}
        </div>
      )}

      {/* Count */}
      {sortedFactions.length > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          Showing {sortedFactions.length} of {factions.length} factions
        </p>
      )}
    </div>
  );
}

function getAffinityColor(affinity: number): string {
  if (affinity >= 3) return 'bg-emerald-500';
  if (affinity === 2) return 'bg-green-500';
  if (affinity === 1) return 'bg-lime-500';
  if (affinity === 0) return 'bg-gray-400';
  if (affinity === -1) return 'bg-yellow-500';
  if (affinity === -2) return 'bg-orange-500';
  return 'bg-red-500'; // -3
}

function getAffinityBgColor(affinity: number): string {
  if (affinity >= 3) return 'bg-emerald-500/20 text-emerald-400';
  if (affinity === 2) return 'bg-green-500/20 text-green-400';
  if (affinity === 1) return 'bg-lime-500/20 text-lime-400';
  if (affinity === 0) return 'bg-gray-500/20 text-gray-400';
  if (affinity === -1) return 'bg-yellow-500/20 text-yellow-400';
  if (affinity === -2) return 'bg-orange-500/20 text-orange-400';
  return 'bg-red-500/20 text-red-400'; // -3
}

function getAffinityTextColor(affinity: number): string {
  if (affinity >= 3) return 'text-emerald-400';
  if (affinity === 2) return 'text-green-400';
  if (affinity === 1) return 'text-lime-400';
  if (affinity === 0) return 'text-gray-400';
  if (affinity === -1) return 'text-yellow-400';
  if (affinity === -2) return 'text-orange-400';
  return 'text-red-400'; // -3
}

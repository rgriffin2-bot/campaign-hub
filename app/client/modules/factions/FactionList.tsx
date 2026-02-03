import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Users } from 'lucide-react';
import { useFiles } from '../../hooks/useFiles';
import { FactionCard } from './components/FactionCard';
import { affinityLabels, FACTION_TYPE_LABELS, type FactionType } from '@shared/schemas/faction';

export function FactionList() {
  const { list } = useFiles('factions');
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Factions</h1>
        </div>
        <Link
          to="/modules/factions/new"
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Faction
        </Link>
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
              ? 'Create factions to track relationships with organizations and powers.'
              : 'Try adjusting your search or filter.'}
          </p>
          {factions.length === 0 && (
            <Link
              to="/modules/factions/new"
              className="mt-4 flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Add Faction
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedFactions.map((faction) => (
            <FactionCard key={faction.id} faction={faction} />
          ))}
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

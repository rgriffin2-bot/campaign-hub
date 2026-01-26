import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, BookOpen, Users, Clock, Sparkles, Globe, MoreHorizontal } from 'lucide-react';
import { usePlayerFiles } from './hooks/usePlayerFiles';
import type { LoreType } from '@shared/schemas/lore';

const typeIcons: Record<LoreType, React.ReactNode> = {
  world: <Globe className="h-4 w-4" />,
  faction: <Users className="h-4 w-4" />,
  history: <Clock className="h-4 w-4" />,
  religion: <Sparkles className="h-4 w-4" />,
  magic: <Sparkles className="h-4 w-4" />,
  other: <MoreHorizontal className="h-4 w-4" />,
};

const typeLabels: Record<LoreType, string> = {
  world: 'World',
  faction: 'Faction',
  history: 'History',
  religion: 'Religion',
  magic: 'Magic',
  other: 'Other',
};

export function PlayerLoreList() {
  const { list } = usePlayerFiles('lore');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<LoreType | 'all'>('all');

  const loreItems = list.data || [];

  const filteredItems = loreItems.filter((item) => {
    const matchesSearch =
      search === '' ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.tags as string[] | undefined)?.some((tag: string) =>
        tag.toLowerCase().includes(search.toLowerCase())
      );

    const matchesType = filterType === 'all' || item.type === filterType;

    return matchesSearch && matchesType;
  });

  // Group by type
  const groupedItems = filteredItems.reduce(
    (acc, item) => {
      const type = (item.type as LoreType) || 'other';
      if (!acc[type]) acc[type] = [];
      acc[type].push(item);
      return acc;
    },
    {} as Record<LoreType, typeof filteredItems>
  );

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
        <BookOpen className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Lore</h1>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search lore..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-input bg-background py-2 pl-10 pr-4 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as LoreType | 'all')}
          className="rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="all">All Types</option>
          {Object.entries(typeLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Lore Grid by Type */}
      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 p-12 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            {loreItems.length === 0 ? 'No lore yet' : 'No matches found'}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {loreItems.length === 0
              ? 'The DM hasn\'t added any lore entries yet.'
              : 'Try adjusting your search or filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {(Object.keys(typeLabels) as LoreType[]).map((type) => {
            const items = groupedItems[type];
            if (!items || items.length === 0) return null;

            return (
              <div key={type}>
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                  {typeIcons[type]}
                  {typeLabels[type]}
                  <span className="text-sm font-normal text-muted-foreground">
                    ({items.length})
                  </span>
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((item) => (
                    <Link
                      key={item.id}
                      to={`/player/modules/lore/${item.id}`}
                      className="group rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-accent"
                    >
                      <h3 className="font-medium text-foreground group-hover:text-primary">
                        {item.name}
                      </h3>
                      {(item.tags as string[] | undefined)?.length ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {(item.tags as string[]).slice(0, 3).map((tag) => (
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
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

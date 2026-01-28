import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, BookOpen, Globe, Hammer, Shield, Crown, Heart, Wind, Gem, Home, Eye, EyeOff } from 'lucide-react';
import { useFiles } from '../../hooks/useFiles';
import type { LoreType } from '@shared/schemas/lore';
import type { FileMetadata } from '@shared/types/file';

const typeIcons: Record<LoreType, React.ReactNode> = {
  'cosmology-and-origins': <Globe className="h-4 w-4" />,
  'makers': <Hammer className="h-4 w-4" />,
  'stewards': <Shield className="h-4 w-4" />,
  'human-polities-and-power': <Crown className="h-4 w-4" />,
  'faiths-and-ideologies': <Heart className="h-4 w-4" />,
  'the-breath-and-paraphysics': <Wind className="h-4 w-4" />,
  'relics-and-artifacts': <Gem className="h-4 w-4" />,
  'life-in-haven': <Home className="h-4 w-4" />,
};

const typeLabels: Record<LoreType, string> = {
  'cosmology-and-origins': 'Cosmology and Origins',
  'makers': 'Makers',
  'stewards': 'Stewards',
  'human-polities-and-power': 'Human Polities and Power',
  'faiths-and-ideologies': 'Faiths and Ideologies',
  'the-breath-and-paraphysics': 'The Breath and Paraphysics',
  'relics-and-artifacts': 'Relics and Artifacts',
  'life-in-haven': 'Life in Haven',
};

function LoreCard({ item }: { item: FileMetadata }) {
  const { toggleVisibility } = useFiles('lore');
  const isHidden = item.hidden === true;

  const handleToggleVisibility = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleVisibility.mutate({ fileId: item.id, hidden: !isHidden });
  };

  return (
    <Link
      to={`/modules/lore/${item.id}`}
      className={`group relative rounded-lg border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-accent ${
        isHidden ? 'border-amber-500/50 bg-amber-500/5' : 'border-border'
      }`}
    >
      {/* Hidden indicator badge */}
      {isHidden && (
        <div className="absolute -right-2 -top-2 flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-medium text-white shadow-sm">
          <EyeOff className="h-3 w-3" />
          <span>Hidden</span>
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <h3 className={`font-medium group-hover:text-primary ${isHidden ? 'text-muted-foreground' : 'text-foreground'}`}>
          {item.name}
        </h3>

        {/* Visibility toggle button */}
        <button
          onClick={handleToggleVisibility}
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${
            isHidden
              ? 'text-amber-500 hover:bg-amber-500/20'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
          title={isHidden ? 'Show to players' : 'Hide from players'}
        >
          {isHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

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
  );
}

export function LoreList() {
  const { list } = useFiles('lore');
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Lore</h1>
        </div>
        <Link
          to="/modules/lore/new"
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Lore
        </Link>
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
              ? 'Add your first lore entry to get started.'
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
                    <LoreCard key={item.id} item={item} />
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

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, BookOpen, Cog, Zap, Users, Sword, Clock, Heart, Package, Rocket, BookMarked } from 'lucide-react';
import { usePlayerFiles } from './hooks/usePlayerFiles';
import type { RuleCategory } from '@shared/schemas/rules';

const categoryIcons: Record<RuleCategory, React.ReactNode> = {
  'core-mechanic': <Cog className="h-4 w-4" />,
  'action': <Zap className="h-4 w-4" />,
  'general-move': <Users className="h-4 w-4" />,
  'playbook-move': <Sword className="h-4 w-4" />,
  'downtime': <Clock className="h-4 w-4" />,
  'harm-recovery': <Heart className="h-4 w-4" />,
  'gear': <Package className="h-4 w-4" />,
  'ship': <Rocket className="h-4 w-4" />,
  'gm-reference': <BookMarked className="h-4 w-4" />,
};

const categoryLabels: Record<RuleCategory, string> = {
  'core-mechanic': 'Core Mechanic',
  'action': 'Action',
  'general-move': 'General Move',
  'playbook-move': 'Playbook Move',
  'downtime': 'Downtime',
  'harm-recovery': 'Harm & Recovery',
  'gear': 'Gear',
  'ship': 'Ship',
  'gm-reference': 'GM Reference',
};

export function PlayerRulesList() {
  const { list } = usePlayerFiles('rules');
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<RuleCategory | 'all'>('all');

  const ruleItems = list.data || [];

  const filteredItems = ruleItems.filter((item) => {
    const matchesSearch =
      search === '' ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.tags as string[] | undefined)?.some((tag: string) =>
        tag.toLowerCase().includes(search.toLowerCase())
      );

    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;

    return matchesSearch && matchesCategory;
  });

  // Group by category
  const groupedItems = filteredItems.reduce(
    (acc, item) => {
      const category = (item.category as RuleCategory) || 'core-mechanic';
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    },
    {} as Record<RuleCategory, typeof filteredItems>
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
        <h1 className="text-2xl font-bold text-foreground">Rules</h1>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search rules..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-input bg-background py-2 pl-10 pr-4 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value as RuleCategory | 'all')}
          className="rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="all">All Categories</option>
          {Object.entries(categoryLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Rules Grid by Category */}
      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 p-12 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            {ruleItems.length === 0 ? 'No rules yet' : 'No matches found'}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {ruleItems.length === 0
              ? "The DM hasn't added any rules yet."
              : 'Try adjusting your search or filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {(Object.keys(categoryLabels) as RuleCategory[]).map((category) => {
            const items = groupedItems[category];
            if (!items || items.length === 0) return null;

            return (
              <div key={category}>
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                  {categoryIcons[category]}
                  {categoryLabels[category]}
                  <span className="text-sm font-normal text-muted-foreground">
                    ({items.length})
                  </span>
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((item) => (
                    <Link
                      key={item.id}
                      to={`/player/modules/rules/${item.id}`}
                      className="group rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-accent"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {categoryIcons[item.category as RuleCategory] || <BookOpen className="h-4 w-4" />}
                        </span>
                        <h3 className="font-medium text-foreground group-hover:text-primary">
                          {item.name}
                        </h3>
                      </div>
                      {item.subcategory && (
                        <p className="mt-1 text-xs text-muted-foreground">{item.subcategory}</p>
                      )}
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

import { useState } from 'react';
import { User, Skull, Ship, MapPin, Circle, Plus, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { useFiles } from '../../../hooks/useFiles';
import { useCampaign } from '../../../core/providers/CampaignProvider';
import type { TokenSourceType } from '@shared/schemas/tactical-board';

interface TokenPaletteProps {
  onAddToken: (
    sourceType: TokenSourceType,
    sourceId: string,
    label: string,
    image?: string
  ) => void;
}

interface SourceCategory {
  id: TokenSourceType;
  label: string;
  icon: typeof User;
  moduleId: string;
}

const SOURCE_CATEGORIES: SourceCategory[] = [
  { id: 'pc', label: 'Player Characters', icon: User, moduleId: 'player-characters' },
  { id: 'npc', label: 'NPCs', icon: Skull, moduleId: 'npcs' },
  { id: 'ship', label: 'Ships & Vehicles', icon: Ship, moduleId: 'ships' },
  { id: 'location', label: 'Locations', icon: MapPin, moduleId: 'locations' },
];

interface EntityItemProps {
  entity: { id: string; name: string; portrait?: string; image?: string };
  sourceType: TokenSourceType;
  onAdd: () => void;
}

function EntityItem({ entity, sourceType, onAdd }: EntityItemProps) {
  const { campaign } = useCampaign();
  const imagePath = entity.portrait || entity.image;
  const imageUrl = imagePath && campaign
    ? `/api/campaigns/${campaign.id}/assets/${imagePath.replace('assets/', '')}`
    : null;

  const Icon = SOURCE_CATEGORIES.find((c) => c.id === sourceType)?.icon || Circle;

  return (
    <button
      type="button"
      onClick={onAdd}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
    >
      {/* Thumbnail */}
      <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-border bg-secondary">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>
      {/* Name */}
      <span className="truncate">{entity.name}</span>
      {/* Add icon */}
      <Plus className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

interface CategorySectionProps {
  category: SourceCategory;
  search: string;
  onAddToken: TokenPaletteProps['onAddToken'];
}

function CategorySection({ category, search, onAddToken }: CategorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { list } = useFiles(category.moduleId);

  const entities = (list.data || []) as Array<{
    id: string;
    name: string;
    portrait?: string;
    image?: string;
    hidden?: boolean;
  }>;

  // Filter out hidden entities and apply search
  const filteredEntities = entities.filter((entity) => {
    if (entity.hidden) return false;
    if (search && !entity.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // If no entities in this category, don't render the section
  if (filteredEntities.length === 0 && !search) return null;

  const Icon = category.icon;
  const ChevronIcon = isExpanded ? ChevronDown : ChevronRight;

  return (
    <div className="space-y-1">
      {/* Category header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors hover:bg-accent"
      >
        <ChevronIcon className="h-4 w-4 text-muted-foreground" />
        <Icon className="h-4 w-4" />
        <span>{category.label}</span>
        <span className="ml-auto text-xs text-muted-foreground">
          {filteredEntities.length}
        </span>
      </button>

      {/* Entity list */}
      {isExpanded && (
        <div className="ml-4 space-y-0.5">
          {filteredEntities.length === 0 ? (
            <p className="px-2 py-1 text-xs text-muted-foreground">
              {search ? 'No matches' : 'None available'}
            </p>
          ) : (
            filteredEntities.map((entity) => (
              <EntityItem
                key={entity.id}
                entity={entity}
                sourceType={category.id}
                onAdd={() =>
                  onAddToken(
                    category.id,
                    entity.id,
                    entity.name,
                    entity.portrait || entity.image
                  )
                }
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function TokenPalette({ onAddToken }: TokenPaletteProps) {
  const [search, setSearch] = useState('');

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-border p-3">
        <h3 className="text-sm font-semibold text-foreground">Add Token</h3>
      </div>

      {/* Search */}
      <div className="border-b border-border p-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-input bg-background py-1.5 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      {/* Entity categories */}
      <div className="flex-1 overflow-auto p-2">
        <div className="space-y-2">
          {SOURCE_CATEGORIES.map((category) => (
            <CategorySection
              key={category.id}
              category={category}
              search={search}
              onAddToken={onAddToken}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

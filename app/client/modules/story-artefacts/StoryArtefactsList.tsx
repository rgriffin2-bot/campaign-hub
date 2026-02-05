import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Scroll, Eye, EyeOff } from 'lucide-react';
import { useFiles } from '../../hooks/useFiles';
import { useCampaign } from '../../core/providers/CampaignProvider';
import { SUGGESTED_ARTEFACT_TAGS } from '@shared/schemas/story-artefact';
import type { FileMetadata } from '@shared/types/file';
import type { ArtefactImage } from '@shared/schemas/story-artefact';

function ArtefactCard({ item }: { item: FileMetadata }) {
  const { toggleVisibility } = useFiles('story-artefacts');
  const { campaign } = useCampaign();
  const isHidden = item.hidden === true;

  // Get the primary image or first image for thumbnail
  const images = (item.images as ArtefactImage[] | undefined) || [];
  const primaryImage = images.find((img) => img.isPrimary) || images[0];
  const thumbnailPath = primaryImage?.thumbPath || primaryImage?.path;

  const handleToggleVisibility = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleVisibility.mutate({ fileId: item.id, hidden: !isHidden });
  };

  return (
    <Link
      to={`/modules/story-artefacts/${item.id}`}
      className={`group relative flex gap-4 rounded-lg border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-accent ${
        isHidden ? 'border-amber-500/50 bg-amber-500/5' : 'border-border'
      }`}
    >
      {/* Thumbnail */}
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
        {thumbnailPath && campaign ? (
          <img
            src={`/api/campaigns/${campaign.id}/assets/${thumbnailPath.replace('assets/', '')}`}
            alt={item.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Scroll className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col justify-between">
        <div>
          {/* Hidden indicator badge */}
          {isHidden && (
            <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-medium text-white">
              <EyeOff className="h-3 w-3" />
              <span>Hidden</span>
            </div>
          )}

          <h3
            className={`font-medium group-hover:text-primary ${isHidden ? 'text-muted-foreground' : 'text-foreground'}`}
          >
            {item.name}
          </h3>

          {/* Tags */}
          {(item.tags as string[] | undefined)?.length ? (
            <div className="mt-1 flex flex-wrap gap-1">
              {(item.tags as string[]).slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="rounded bg-secondary px-2 py-0.5 text-xs text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
              {(item.tags as string[]).length > 4 && (
                <span className="rounded bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                  +{(item.tags as string[]).length - 4}
                </span>
              )}
            </div>
          ) : null}
        </div>

        {/* Image count badge */}
        {images.length > 0 && (
          <div className="mt-2 text-xs text-muted-foreground">
            {images.length} image{images.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Visibility toggle button */}
      <button
        onClick={handleToggleVisibility}
        className={`absolute right-2 top-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${
          isHidden
            ? 'text-amber-500 hover:bg-amber-500/20'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
        }`}
        title={isHidden ? 'Show to players' : 'Hide from players'}
      >
        {isHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </Link>
  );
}

export function StoryArtefactsList() {
  const { list } = useFiles('story-artefacts');
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState<string>('all');

  const artefacts = list.data || [];

  // Collect all unique tags from artefacts
  const allTags = new Set<string>();
  artefacts.forEach((item) => {
    (item.tags as string[] | undefined)?.forEach((tag) => allTags.add(tag));
  });

  const filteredArtefacts = artefacts.filter((item) => {
    const matchesSearch =
      search === '' ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.tags as string[] | undefined)?.some((tag: string) =>
        tag.toLowerCase().includes(search.toLowerCase())
      );

    const matchesTag =
      filterTag === 'all' ||
      (item.tags as string[] | undefined)?.includes(filterTag);

    return matchesSearch && matchesTag;
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
          <Scroll className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Story Artefacts</h1>
        </div>
        <Link
          to="/modules/story-artefacts/new"
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Artefact
        </Link>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search artefacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-input bg-background py-2 pl-10 pr-4 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <select
          value={filterTag}
          onChange={(e) => setFilterTag(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="all">All Tags</option>
          {Array.from(allTags)
            .sort()
            .map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
        </select>
      </div>

      {/* Suggested tags (for filtering) */}
      {artefacts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground">Quick filter:</span>
          {SUGGESTED_ARTEFACT_TAGS.filter((tag) => allTags.has(tag))
            .slice(0, 8)
            .map((tag) => (
              <button
                key={tag}
                onClick={() => setFilterTag(filterTag === tag ? 'all' : tag)}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  filterTag === tag
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:bg-accent'
                }`}
              >
                {tag}
              </button>
            ))}
        </div>
      )}

      {/* Artefacts List */}
      {filteredArtefacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 p-12 text-center">
          <Scroll className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            {artefacts.length === 0 ? 'No artefacts yet' : 'No matches found'}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {artefacts.length === 0
              ? 'Add your first story artefact to get started.'
              : 'Try adjusting your search or filter.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredArtefacts.map((item) => (
            <ArtefactCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Scroll } from 'lucide-react';
import { usePlayerFiles } from './hooks/usePlayerFiles';
import { useCampaign } from '../hooks/useCampaign';
import type { FileMetadata } from '@shared/types/file';
import type { ArtefactImage } from '@shared/schemas/story-artefact';

function ArtefactCard({ item }: { item: FileMetadata }) {
  const { campaign } = useCampaign();

  // Get the primary image or first image for thumbnail
  const images = (item.images as ArtefactImage[] | undefined) || [];
  const primaryImage = images.find((img) => img.isPrimary) || images[0];
  const thumbnailPath = primaryImage?.thumbPath || primaryImage?.path;

  return (
    <Link
      to={`/player/modules/story-artefacts/${item.id}`}
      className="group flex gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-accent"
    >
      {/* Thumbnail */}
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
        {thumbnailPath && campaign ? (
          <img
            src={`/api/campaigns/${campaign.id}/assets/${thumbnailPath.replace('assets/', '')}`}
            alt={item.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Scroll className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col justify-center">
        <h3 className="font-medium text-foreground group-hover:text-primary">
          {item.name}
        </h3>

        {/* Tags */}
        {(item.tags as string[] | undefined)?.length ? (
          <div className="mt-1 flex flex-wrap gap-1">
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
      </div>
    </Link>
  );
}

export function PlayerStoryArtefactList() {
  const { list } = usePlayerFiles('story-artefacts');
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
      <div className="flex items-center gap-3">
        <Scroll className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Story Artefacts</h1>
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
        {allTags.size > 0 && (
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
        )}
      </div>

      {/* Artefacts List */}
      {filteredArtefacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 p-12 text-center">
          <Scroll className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            {artefacts.length === 0 ? 'No artefacts available' : 'No matches found'}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {artefacts.length === 0
              ? 'Your DM hasn\'t revealed any artefacts yet.'
              : 'Try adjusting your search or filter.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredArtefacts.map((item) => (
            <ArtefactCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

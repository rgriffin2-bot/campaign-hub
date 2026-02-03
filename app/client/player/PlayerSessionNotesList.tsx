import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, StickyNote, Calendar, Plus } from 'lucide-react';
import { usePlayerFiles } from './hooks/usePlayerFiles';
import type { FileMetadata } from '@shared/types/file';

function SessionNotesCard({ item }: { item: FileMetadata }) {
  return (
    <Link
      to={`/player/modules/session-notes/${item.id}`}
      className="group rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-accent"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-medium text-foreground group-hover:text-primary">
            {item.name}
          </h3>
          {item.date && (
            <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {item.date as string}
            </div>
          )}
          {item.author && (
            <p className="mt-1 text-sm text-muted-foreground">
              by {item.author as string}
            </p>
          )}
        </div>
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

export function PlayerSessionNotesList() {
  const { list } = usePlayerFiles('session-notes');
  const [search, setSearch] = useState('');

  const items = list.data || [];

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      search === '' ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.tags as string[] | undefined)?.some((tag: string) =>
        tag.toLowerCase().includes(search.toLowerCase())
      ) ||
      (item.author as string | undefined)?.toLowerCase().includes(search.toLowerCase());

    return matchesSearch;
  });

  // Sort by date (most recent first) if available
  const sortedItems = [...filteredItems].sort((a, b) => {
    const dateA = a.date as string | undefined;
    const dateB = b.date as string | undefined;
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
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
          <StickyNote className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Session Notes</h1>
        </div>
        <Link
          to="/player/modules/session-notes/new"
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Notes
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search session notes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-input bg-background py-2 pl-10 pr-4 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Notes Grid */}
      {sortedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 p-12 text-center">
          <StickyNote className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            {items.length === 0 ? 'No session notes yet' : 'No matches found'}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {items.length === 0
              ? 'Add your first session notes to get started.'
              : 'Try adjusting your search.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedItems.map((item) => (
            <SessionNotesCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

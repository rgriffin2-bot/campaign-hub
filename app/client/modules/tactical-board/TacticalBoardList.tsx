import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, LayoutGrid, Layers } from 'lucide-react';
import { useFiles } from '../../hooks/useFiles';
import type { FileMetadata } from '@shared/types/file';
import type { BoardToken } from '@shared/schemas/tactical-board';

// Board metadata with optional extended fields
interface BoardMetadata extends FileMetadata {
  tokens?: BoardToken[];
  description?: string;
  canvasWidth?: number;
  canvasHeight?: number;
  gridEnabled?: boolean;
  hidden?: boolean;
  tags?: string[];
}

function BoardCard({ board }: { board: BoardMetadata }) {
  const tokens = (board.tokens || []) as BoardToken[];
  const tokenCount = tokens.length;

  return (
    <Link
      to={`/modules/tactical-board/${board.id}`}
      className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-all hover:border-primary/50 hover:shadow-md"
    >
      {/* Preview area */}
      <div className="relative aspect-video bg-neutral-800">
        {/* Simple token preview dots */}
        <div className="absolute inset-0 p-4">
          {tokens.slice(0, 12).map((token, i) => (
            <div
              key={token.id}
              className="absolute h-3 w-3 rounded-full bg-primary/60"
              style={{
                left: `${10 + (i % 4) * 25}%`,
                top: `${10 + Math.floor(i / 4) * 30}%`,
              }}
            />
          ))}
          {tokenCount > 12 && (
            <div className="absolute bottom-2 right-2 rounded bg-black/50 px-1.5 py-0.5 text-xs text-white">
              +{tokenCount - 12}
            </div>
          )}
        </div>

        {/* Grid overlay preview */}
        {board.gridEnabled && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px',
            }}
          />
        )}

        {/* Hidden badge */}
        {board.hidden && (
          <div className="absolute right-2 top-2 rounded bg-warning/80 px-1.5 py-0.5 text-xs font-medium text-warning-foreground">
            Hidden
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col p-3">
        <h3 className="font-semibold text-foreground group-hover:text-primary">
          {board.name}
        </h3>
        {board.description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {board.description}
          </p>
        )}
        <div className="mt-auto flex items-center gap-3 pt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Layers className="h-3 w-3" />
            {tokenCount} token{tokenCount !== 1 ? 's' : ''}
          </span>
          {(board.canvasWidth && board.canvasHeight) && (
            <span>
              {board.canvasWidth} x {board.canvasHeight}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function TacticalBoardList() {
  const { list } = useFiles('tactical-board');
  const [search, setSearch] = useState('');

  const boards = (list.data || []) as BoardMetadata[];

  const filteredBoards = boards.filter((board) => {
    if (search === '') return true;
    const searchLower = search.toLowerCase();
    return (
      board.name.toLowerCase().includes(searchLower) ||
      board.description?.toLowerCase().includes(searchLower) ||
      board.tags?.some((tag) => tag.toLowerCase().includes(searchLower))
    );
  });

  // Sort by name
  const sortedBoards = [...filteredBoards].sort((a, b) =>
    a.name.localeCompare(b.name)
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
          <LayoutGrid className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Tactical Boards</h1>
        </div>
        <Link
          to="/modules/tactical-board/new"
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Board
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search boards..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-input bg-background py-2 pl-10 pr-4 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Boards Grid */}
      {sortedBoards.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 p-12 text-center">
          <LayoutGrid className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            {boards.length === 0 ? 'No tactical boards yet' : 'No matches found'}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {boards.length === 0
              ? 'Create a board to set up encounter maps with tokens.'
              : 'Try adjusting your search.'}
          </p>
          {boards.length === 0 && (
            <Link
              to="/modules/tactical-board/new"
              className="mt-4 flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              New Board
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedBoards.map((board) => (
            <BoardCard key={board.id} board={board} />
          ))}
        </div>
      )}

      {/* Count */}
      {sortedBoards.length > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          Showing {sortedBoards.length} of {boards.length} boards
        </p>
      )}
    </div>
  );
}

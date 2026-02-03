import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, LayoutGrid } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { BoardCanvas } from '../modules/tactical-board/components/BoardCanvas';
import type { TacticalBoard, BoardToken } from '@shared/schemas/tactical-board';

// Fetch board for players (read-only, filters hidden tokens)
async function fetchPlayerBoard(boardId: string): Promise<TacticalBoard | null> {
  const res = await fetch(`/api/player/tactical-boards/${boardId}`, {
    credentials: 'include',
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.data || null;
}

// Fetch list of boards for players (filters hidden boards)
async function fetchPlayerBoards(): Promise<TacticalBoard[]> {
  const res = await fetch('/api/player/tactical-boards', {
    credentials: 'include',
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.data || []).filter((b: TacticalBoard) => !b.hidden);
}

// Board list for players
export function PlayerTacticalBoardList() {
  const { data: boards = [], isLoading } = useQuery({
    queryKey: ['player', 'tactical-boards'],
    queryFn: fetchPlayerBoards,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <LayoutGrid className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Tactical Boards</h1>
      </div>

      {boards.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 p-12 text-center">
          <LayoutGrid className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            No boards available
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            The DM hasn't shared any tactical boards yet.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => (
            <Link
              key={board.id}
              to={`/player/tactical-board/${board.id}`}
              className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-all hover:border-primary/50 hover:shadow-md"
            >
              <div className="relative aspect-video bg-neutral-800">
                {board.tokens
                  ?.filter((t) => t.visibleToPlayers)
                  .slice(0, 12)
                  .map((token, i) => (
                    <div
                      key={token.id}
                      className="absolute h-3 w-3 rounded-full bg-primary/60"
                      style={{
                        left: `${10 + (i % 4) * 25}%`,
                        top: `${10 + Math.floor(i / 4) * 30}%`,
                      }}
                    />
                  ))}
              </div>
              <div className="p-3">
                <h3 className="font-semibold text-foreground group-hover:text-primary">
                  {board.name}
                </h3>
                {board.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {board.description}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// Board detail view for players (read-only)
export function PlayerTacticalBoardDetail() {
  const { boardId } = useParams<{ boardId: string }>();

  const { data: board, isLoading } = useQuery({
    queryKey: ['player', 'tactical-board', boardId],
    queryFn: () => fetchPlayerBoard(boardId!),
    enabled: !!boardId,
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <LayoutGrid className="h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold text-foreground">
          Board not found
        </h3>
        <Link
          to="/player/tactical-board"
          className="mt-4 text-sm text-primary hover:underline"
        >
          Back to boards
        </Link>
      </div>
    );
  }

  // Filter to only show visible tokens
  const playerBoard: TacticalBoard = {
    ...board,
    tokens: (board.tokens || []).filter((t: BoardToken) => t.visibleToPlayers !== false),
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-border bg-card px-4 py-3">
        <Link
          to="/player/tactical-board"
          className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="Back to boards"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-lg font-semibold text-foreground">{board.name}</h1>
      </div>

      {/* Canvas (read-only) */}
      <div className="flex-1">
        <BoardCanvas
          board={playerBoard}
          isEditable={false}
          selectedTokenId={null}
          onSelectToken={() => {}}
          onUpdateToken={() => {}}
        />
      </div>
    </div>
  );
}

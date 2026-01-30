import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';

interface PlaybookMoveCardProps {
  moveId: string;
  moveName: string;
  characterId: string;
  playerMode?: boolean;
}

export function PlaybookMoveCard({
  moveId,
  moveName,
  characterId,
  playerMode = false,
}: PlaybookMoveCardProps) {
  const basePath = playerMode ? '/player' : '';

  return (
    <Link
      to={`${basePath}/modules/player-characters/${characterId}/moves/${moveId}`}
      className="group flex flex-col items-center justify-center rounded-lg border border-border bg-secondary/30 p-4 text-center transition-all hover:border-primary hover:bg-secondary/50"
    >
      <BookOpen className="mb-2 h-6 w-6 text-primary opacity-70 group-hover:opacity-100" />
      <span className="text-sm font-medium text-foreground">{moveName}</span>
    </Link>
  );
}

interface PlaybookMoveGridProps {
  moves: Array<{ frontmatter: { id: string; name: string }; content: string }>;
  characterId: string;
  playerMode?: boolean;
}

export function PlaybookMoveGrid({ moves, characterId, playerMode = false }: PlaybookMoveGridProps) {
  if (!moves || moves.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <BookOpen className="h-4 w-4" />
        Playbook Moves
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {moves.map((move) => (
          <PlaybookMoveCard
            key={move.frontmatter.id}
            moveId={move.frontmatter.id}
            moveName={move.frontmatter.name}
            characterId={characterId}
            playerMode={playerMode}
          />
        ))}
      </div>
    </div>
  );
}

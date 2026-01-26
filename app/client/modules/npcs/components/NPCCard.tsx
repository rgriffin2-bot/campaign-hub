import { Link } from 'react-router-dom';
import { User } from 'lucide-react';
import type { FileMetadata } from '@shared/types/file';

interface NPCCardProps {
  npc: FileMetadata;
}

export function NPCCard({ npc }: NPCCardProps) {
  return (
    <Link
      to={`/modules/npcs/${npc.id}`}
      className="group flex flex-col rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-accent"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <User className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium text-foreground group-hover:text-primary">
            {npc.name}
          </h3>
          {npc.occupation ? (
            <p className="truncate text-sm text-muted-foreground">
              {String(npc.occupation)}
            </p>
          ) : null}
        </div>
      </div>

      {npc.personality ? (
        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
          {String(npc.personality)}
        </p>
      ) : null}

      {(npc.tags as string[] | undefined)?.length ? (
        <div className="mt-3 flex flex-wrap gap-1">
          {(npc.tags as string[]).slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded bg-secondary px-2 py-0.5 text-xs text-muted-foreground"
            >
              {tag}
            </span>
          ))}
          {(npc.tags as string[]).length > 3 && (
            <span className="text-xs text-muted-foreground">
              +{(npc.tags as string[]).length - 3}
            </span>
          )}
        </div>
      ) : null}
    </Link>
  );
}

import { Link } from 'react-router-dom';
import { useFiles } from '../../../hooks/useFiles';

interface RelatedNPCsProps {
  npcIds: string[];
}

export function RelatedNPCs({ npcIds }: RelatedNPCsProps) {
  const { list } = useFiles('npcs');
  const allNPCs = list.data || [];

  const relatedNPCs = allNPCs.filter((npc) => npcIds.includes(npc.id));

  if (relatedNPCs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        No related characters linked.
      </p>
    );
  }

  return (
    <ul className="space-y-1">
      {relatedNPCs.map((npc) => (
        <li key={npc.id}>
          <Link
            to={`/modules/npcs/${npc.id}`}
            className="text-primary hover:underline"
          >
            {npc.name}
          </Link>
          {npc.occupation ? (
            <span className="text-muted-foreground">
              {' '}
              — {String(npc.occupation)}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

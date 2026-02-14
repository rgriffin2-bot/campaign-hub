/**
 * RelatedNPCs -- Renders a list of linked NPC relationships.
 * Characters can be stored as plain IDs (legacy) or {id, description} objects;
 * both formats are normalised before display.
 */
import { Link } from 'react-router-dom';
import { useFiles } from '../../../hooks/useFiles';
import type { RelatedCharacter } from '@shared/schemas/npc';

interface RelatedNPCsProps {
  characters: (string | RelatedCharacter)[];
}

// Normalize legacy plain-string entries into {id, description} objects
function normalizeCharacter(char: string | RelatedCharacter): RelatedCharacter {
  if (typeof char === 'string') {
    return { id: char, description: undefined };
  }
  return char;
}

export function RelatedNPCs({ characters }: RelatedNPCsProps) {
  const { list } = useFiles('npcs');
  const allNPCs = list.data || [];

  const normalizedChars = characters.map(normalizeCharacter);

  // Resolve each related character ID to a name; mark missing ones for strikethrough display
  const relatedData = normalizedChars.map((char) => {
    const npc = allNPCs.find((n) => n.id === char.id);
    return {
      ...char,
      name: npc?.name || char.id,
      found: !!npc,
    };
  });

  if (relatedData.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        No related characters linked.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {relatedData.map((char) => (
        <li key={char.id} className="flex items-start gap-2">
          {char.found ? (
            <Link
              to={`/modules/npcs/${char.id}`}
              className="text-primary hover:underline font-medium shrink-0"
            >
              {char.name}
            </Link>
          ) : (
            <span className="text-muted-foreground font-medium shrink-0 line-through" title="Character no longer exists">
              {char.name}
            </span>
          )}
          {char.description && (
            <span className="text-muted-foreground">
              — {char.description}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { useCampaign } from '../core/providers/CampaignProvider';
import { MarkdownContent } from '../components/MarkdownContent';
import { useQuery } from '@tanstack/react-query';
import { usePlayerFiles } from './hooks/usePlayerFiles';

export function PlayerPlaybookMoveDetail() {
  const { fileId: characterId, moveId } = useParams<{ fileId: string; moveId: string }>();
  const { campaign } = useCampaign();
  const { get: getCharacter } = usePlayerFiles('player-characters');

  // Fetch character to get their name for the back link
  const { data: character } = getCharacter(characterId || '');

  // Fetch the specific move using player endpoint
  const { data: move, isLoading } = useQuery({
    queryKey: ['player-move-detail', campaign?.id, moveId],
    queryFn: async () => {
      if (!campaign || !moveId) return null;
      const res = await fetch(`/api/player/campaigns/${campaign.id}/files/rules/${moveId}`, {
        credentials: 'include',
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.success ? data.data : null;
    },
    enabled: !!campaign && !!moveId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!move) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <BookOpen className="h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold text-foreground">Move not found</h3>
        <Link
          to={`/player/modules/player-characters/${characterId}`}
          className="mt-4 text-primary hover:underline"
        >
          Back to Character
        </Link>
      </div>
    );
  }

  const characterName = character?.frontmatter?.name || 'Character';

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Back link */}
      <Link
        to={`/player/modules/player-characters/${characterId}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {characterName}
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3">
        <BookOpen className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">{move.frontmatter.name}</h1>
      </div>

      {/* Move Content */}
      <div className="rounded-lg border border-border bg-card p-6">
        {move.content ? (
          <MarkdownContent content={move.content} />
        ) : (
          <p className="text-muted-foreground">No description available for this move.</p>
        )}
      </div>
    </div>
  );
}

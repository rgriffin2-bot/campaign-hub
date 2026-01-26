import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, User, MapPin } from 'lucide-react';
import { usePlayerFiles } from './hooks/usePlayerFiles';
import { useCampaign } from '../core/providers/CampaignProvider';
import { MarkdownContent } from '../components/MarkdownContent';
import { PlayerRelatedNPCs } from './components/PlayerRelatedNPCs';
import type { NPCFrontmatter } from '@shared/schemas/npc';

export function PlayerNPCDetail() {
  const { fileId } = useParams<{ fileId: string }>();
  const { campaign } = useCampaign();
  const { get } = usePlayerFiles('npcs');

  const { data: npc, isLoading } = get(fileId || '');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!npc) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <User className="h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold text-foreground">
          NPC not found
        </h3>
        <Link
          to="/player/modules/npcs"
          className="mt-4 text-primary hover:underline"
        >
          Back to NPCs
        </Link>
      </div>
    );
  }

  const { content } = npc;
  const frontmatter = npc.frontmatter as unknown as NPCFrontmatter;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Back link */}
      <Link
        to="/player/modules/npcs"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to NPCs
      </Link>

      {/* Header Card */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-start gap-4">
          {/* Portrait */}
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-primary/10">
            {frontmatter.portrait && campaign ? (
              <div
                className="absolute h-full w-full"
                style={{
                  backgroundImage: `url(/api/campaigns/${campaign.id}/assets/${frontmatter.portrait.replace('assets/', '')})`,
                  backgroundSize: frontmatter.portraitPosition
                    ? `${100 * frontmatter.portraitPosition.scale}%`
                    : '100%',
                  backgroundPosition: frontmatter.portraitPosition
                    ? `${50 + frontmatter.portraitPosition.x}% ${50 + frontmatter.portraitPosition.y}%`
                    : 'center',
                  backgroundRepeat: 'no-repeat',
                }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-primary">
                <User className="h-10 w-10" />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground">
              {frontmatter.name}
            </h1>
            {frontmatter.occupation && (
              <p className="text-lg text-muted-foreground">
                {frontmatter.occupation}
              </p>
            )}
            {frontmatter.location && (
              <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                <span>{frontmatter.location}</span>
              </div>
            )}
            {frontmatter.tags && frontmatter.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {frontmatter.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Related Characters */}
      {frontmatter.relatedCharacters && frontmatter.relatedCharacters.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 font-medium text-foreground">Related Characters</h3>
          <PlayerRelatedNPCs characters={frontmatter.relatedCharacters} />
        </div>
      )}

      {/* Goals, Personality, Appearance - Three columns */}
      {(frontmatter.goals || frontmatter.personality || frontmatter.appearance) && (
        <div className="grid gap-4 md:grid-cols-3">
          {frontmatter.goals && (
            <div className="rounded-lg border border-border bg-card p-4">
              <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Goals
              </h4>
              <p className="mt-2 text-sm text-foreground">{frontmatter.goals}</p>
            </div>
          )}

          {frontmatter.personality && (
            <div className="rounded-lg border border-border bg-card p-4">
              <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Personality
              </h4>
              <p className="mt-2 text-sm text-foreground">{frontmatter.personality}</p>
            </div>
          )}

          {frontmatter.appearance && (
            <div className="rounded-lg border border-border bg-card p-4">
              <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Appearance
              </h4>
              <p className="mt-2 text-sm text-foreground">{frontmatter.appearance}</p>
            </div>
          )}
        </div>
      )}

      {/* Additional Notes */}
      {content && (
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 font-medium text-foreground">Additional Notes</h3>
          <MarkdownContent content={content} linkBasePath="/player/modules" />
        </div>
      )}
    </div>
  );
}

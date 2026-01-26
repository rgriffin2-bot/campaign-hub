import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { usePlayerFiles } from './hooks/usePlayerFiles';
import { useCampaign } from '../core/providers/CampaignProvider';
import { MarkdownContent } from '../components/MarkdownContent';
import type { LoreType, LoreFrontmatter } from '@shared/schemas/lore';

const typeLabels: Record<LoreType, string> = {
  world: 'World',
  faction: 'Faction',
  history: 'History',
  religion: 'Religion',
  magic: 'Magic',
  other: 'Other',
};

export function PlayerLoreDetail() {
  const { fileId } = useParams<{ fileId: string }>();
  const { campaign } = useCampaign();
  const { get } = usePlayerFiles('lore');

  const { data: lore, isLoading } = get(fileId || '');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!lore) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <BookOpen className="h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold text-foreground">
          Lore not found
        </h3>
        <Link
          to="/player/modules/lore"
          className="mt-4 text-primary hover:underline"
        >
          Back to Lore
        </Link>
      </div>
    );
  }

  const { content } = lore;
  const frontmatter = lore.frontmatter as unknown as LoreFrontmatter;
  const type = frontmatter.type;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back link */}
      <Link
        to="/player/modules/lore"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Lore
      </Link>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="rounded bg-secondary px-2 py-1 text-xs font-medium text-muted-foreground">
            {typeLabels[type] || type}
          </span>
        </div>
        <h1 className="mt-2 text-2xl font-bold text-foreground">
          {frontmatter.name}
        </h1>
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

      {/* Header Image */}
      {frontmatter.image && campaign && (
        <div className="overflow-hidden rounded-lg border border-border">
          <img
            src={`/api/campaigns/${campaign.id}/assets/${frontmatter.image.replace('assets/', '')}`}
            alt={frontmatter.name}
            className="h-64 w-full object-cover"
          />
        </div>
      )}

      {/* Content */}
      <div className="rounded-lg border border-border bg-card p-6">
        {content ? (
          <MarkdownContent content={content} linkBasePath="/player/modules" />
        ) : (
          <p className="text-muted-foreground italic">No content yet.</p>
        )}
      </div>
    </div>
  );
}

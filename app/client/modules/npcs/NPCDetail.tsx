import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, User, MapPin, Lock, Eye, EyeOff, Swords, Shield, Heart } from 'lucide-react';
import { useFiles } from '../../hooks/useFiles';
import { useCampaign } from '../../core/providers/CampaignProvider';
import { MarkdownContent } from '../../components/MarkdownContent';
import { CopyableId } from '../../components/CopyableId';
import { RelatedNPCs } from './components/RelatedNPCs';
import type { NPCFrontmatter } from '@shared/schemas/npc';

export function NPCDetail() {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const { campaign } = useCampaign();
  const { get, delete: deleteMutation, toggleVisibility } = useFiles('npcs');

  const { data: npc, isLoading } = get(fileId || '');

  const handleDelete = async () => {
    if (!fileId) return;
    if (!confirm('Are you sure you want to delete this NPC?')) return;

    await deleteMutation.mutateAsync(fileId);
    navigate('/modules/npcs');
  };

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
          to="/modules/npcs"
          className="mt-4 text-primary hover:underline"
        >
          Back to NPCs
        </Link>
      </div>
    );
  }

  const { content } = npc;
  const frontmatter = npc.frontmatter as unknown as NPCFrontmatter;
  const dmOnly = frontmatter.dmOnly;
  const isHidden = frontmatter.hidden === true;

  const handleToggleVisibility = () => {
    if (!fileId) return;
    toggleVisibility.mutate({ fileId, hidden: !isHidden });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Back link */}
      <Link
        to="/modules/npcs"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to NPCs
      </Link>

      {/* Header Card - Name, Occupation, Location, Tags, ID */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-start justify-between">
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
              <div className="mt-3">
                <CopyableId moduleType="npcs" id={fileId || ''} />
              </div>
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            {/* Visibility toggle */}
            <button
              onClick={handleToggleVisibility}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isHidden
                  ? 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30'
                  : 'bg-secondary text-foreground hover:bg-accent'
              }`}
              title={isHidden ? 'Show to players' : 'Hide from players'}
            >
              {isHidden ? (
                <>
                  <EyeOff className="h-4 w-4" />
                  Hidden
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  Visible
                </>
              )}
            </button>
            <Link
              to={`/modules/npcs/${fileId}/edit`}
              className="flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Link>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Related Characters */}
      {frontmatter.relatedCharacters && frontmatter.relatedCharacters.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 font-medium text-foreground">Related Characters</h3>
          <RelatedNPCs characters={frontmatter.relatedCharacters} />
        </div>
      )}

      {/* Antagonist Stats Section */}
      {frontmatter.isAntagonist && frontmatter.antagonistStats && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-red-500">
            <Swords className="h-4 w-4" />
            Antagonist / Combat Stats
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {/* Damage */}
            <div className="rounded-lg border border-red-500/20 bg-background p-3">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Heart className="h-3.5 w-3.5" />
                Damage
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-red-500">
                  {frontmatter.antagonistStats.damage || 0}
                </span>
                <span className="text-muted-foreground">
                  / {frontmatter.antagonistStats.maxDamage || 10}
                </span>
              </div>
              {/* Damage bar */}
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-red-500 transition-all"
                  style={{
                    width: `${Math.min(100, ((frontmatter.antagonistStats.damage || 0) / (frontmatter.antagonistStats.maxDamage || 10)) * 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* Armor */}
            <div className="rounded-lg border border-border bg-background p-3">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Shield className="h-3.5 w-3.5" />
                Armor
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold text-foreground">
                  {frontmatter.antagonistStats.armor || 0}
                </span>
              </div>
            </div>

            {/* Status */}
            <div className="rounded-lg border border-border bg-background p-3">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Status
              </div>
              <div className="mt-2">
                {(frontmatter.antagonistStats.damage || 0) >= (frontmatter.antagonistStats.maxDamage || 10) ? (
                  <span className="text-lg font-bold text-red-500">Defeated</span>
                ) : (frontmatter.antagonistStats.damage || 0) >= ((frontmatter.antagonistStats.maxDamage || 10) * 0.5) ? (
                  <span className="text-lg font-bold text-amber-500">Wounded</span>
                ) : (
                  <span className="text-lg font-bold text-green-500">Active</span>
                )}
              </div>
            </div>
          </div>

          {/* Moves / Abilities */}
          {frontmatter.antagonistStats.moves && (
            <div className="mt-4">
              <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Moves / Abilities
              </h4>
              <div className="mt-2 rounded-lg border border-border bg-background p-3">
                <MarkdownContent content={frontmatter.antagonistStats.moves} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* DM Only Section */}
      {dmOnly && (dmOnly.secrets || dmOnly.voice || dmOnly.notes) && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-500">
            <Lock className="h-4 w-4" />
            DM Only
          </div>

          {dmOnly.voice && (
            <div className="mt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Voice & Mannerisms
              </p>
              <p className="mt-1 text-foreground">{dmOnly.voice}</p>
            </div>
          )}

          {dmOnly.secrets && (
            <div className="mt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Secrets
              </p>
              <p className="mt-1 text-foreground">{dmOnly.secrets}</p>
            </div>
          )}

          {dmOnly.notes && (
            <div className="mt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                DM Notes
              </p>
              <p className="mt-1 text-foreground">{dmOnly.notes}</p>
            </div>
          )}
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
          <MarkdownContent content={content} />
        </div>
      )}
    </div>
  );
}

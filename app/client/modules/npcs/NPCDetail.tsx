import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, User, MapPin, Target, Eye, MessageSquare, Lock } from 'lucide-react';
import { useFiles } from '../../hooks/useFiles';
import { MarkdownContent } from '../../components/MarkdownContent';
import { RelatedNPCs } from './components/RelatedNPCs';
import type { NPCFrontmatter } from '@shared/schemas/npc';

export function NPCDetail() {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const { get, delete: deleteMutation } = useFiles('npcs');

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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back link */}
      <Link
        to="/modules/npcs"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to NPCs
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {frontmatter.name}
            </h1>
            {frontmatter.occupation && (
              <p className="text-lg text-muted-foreground">
                {frontmatter.occupation}
              </p>
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

        <div className="flex gap-2">
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

      {/* Main Info Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {frontmatter.location && (
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <MapPin className="h-4 w-4" />
              Location
            </div>
            <p className="mt-1 text-foreground">{frontmatter.location}</p>
          </div>
        )}

        {frontmatter.goals && (
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Target className="h-4 w-4" />
              Goals
            </div>
            <p className="mt-1 text-foreground">{frontmatter.goals}</p>
          </div>
        )}
      </div>

      {/* Appearance */}
      {frontmatter.appearance && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Eye className="h-4 w-4" />
            Appearance
          </div>
          <p className="mt-2 text-foreground">{frontmatter.appearance}</p>
        </div>
      )}

      {/* Personality */}
      {frontmatter.personality && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <MessageSquare className="h-4 w-4" />
            Personality
          </div>
          <p className="mt-2 text-foreground">{frontmatter.personality}</p>
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

      {/* Related Characters */}
      {frontmatter.relatedCharacters && frontmatter.relatedCharacters.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 font-medium text-foreground">Related Characters</h3>
          <RelatedNPCs npcIds={frontmatter.relatedCharacters} />
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

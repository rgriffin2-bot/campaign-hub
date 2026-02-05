import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Scroll, Eye, EyeOff } from 'lucide-react';
import { useFiles } from '../../hooks/useFiles';
import { useCampaign } from '../../core/providers/CampaignProvider';
import { MarkdownContent } from '../../components/MarkdownContent';
import { CopyableId } from '../../components/CopyableId';
import { ImageGallery } from './components/ImageGallery';
import type { StoryArtefactFrontmatter, ArtefactImage } from '@shared/schemas/story-artefact';

export function StoryArtefactDetail() {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const { campaign } = useCampaign();
  const { get, delete: deleteMutation, toggleVisibility } = useFiles('story-artefacts');

  const { data: artefact, isLoading } = get(fileId || '');

  const handleDelete = async () => {
    if (!fileId) return;
    if (!confirm('Are you sure you want to delete this artefact? This will also delete all associated images.')) return;

    await deleteMutation.mutateAsync(fileId);
    navigate('/modules/story-artefacts');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!artefact) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <Scroll className="h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold text-foreground">
          Artefact not found
        </h3>
        <Link
          to="/modules/story-artefacts"
          className="mt-4 text-primary hover:underline"
        >
          Back to Story Artefacts
        </Link>
      </div>
    );
  }

  const { content } = artefact;
  const frontmatter = artefact.frontmatter as unknown as StoryArtefactFrontmatter;
  const isHidden = frontmatter.hidden === true;
  const images = (frontmatter.images || []) as ArtefactImage[];

  const handleToggleVisibility = () => {
    if (!fileId) return;
    toggleVisibility.mutate({ fileId, hidden: !isHidden });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back link */}
      <Link
        to="/modules/story-artefacts"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Story Artefacts
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
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
          <div className="mt-3">
            <CopyableId moduleType="story-artefacts" id={fileId || ''} />
          </div>
        </div>

        <div className="flex gap-2">
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
            to={`/modules/story-artefacts/${fileId}/edit`}
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

      {/* Image Gallery */}
      {images.length > 0 && campaign && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            Images ({images.length})
          </h2>
          <ImageGallery images={images} campaignId={campaign.id} />
        </div>
      )}

      {/* Content */}
      <div className="rounded-lg border border-border bg-card p-6">
        {content ? (
          <MarkdownContent content={content} />
        ) : (
          <p className="text-muted-foreground italic">No content yet.</p>
        )}
      </div>

      {/* DM-only secrets */}
      {frontmatter.dmOnly?.secrets && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/5 p-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-500">
            <EyeOff className="h-4 w-4" />
            DM Secrets
          </h2>
          <MarkdownContent content={frontmatter.dmOnly.secrets} />
        </div>
      )}

      {/* DM notes */}
      {frontmatter.dmOnly?.notes && (
        <div className="rounded-lg border border-border bg-muted/50 p-6">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
            DM Notes
          </h2>
          <MarkdownContent content={frontmatter.dmOnly.notes} />
        </div>
      )}
    </div>
  );
}

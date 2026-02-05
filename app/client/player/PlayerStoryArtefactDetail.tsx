import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Scroll } from 'lucide-react';
import { usePlayerFiles } from './hooks/usePlayerFiles';
import { useCampaign } from '../hooks/useCampaign';
import { MarkdownContent } from '../components/MarkdownContent';
import { ImageGallery } from '../modules/story-artefacts/components/ImageGallery';
import type { StoryArtefactFrontmatter, ArtefactImage } from '@shared/schemas/story-artefact';

export function PlayerStoryArtefactDetail() {
  const { fileId } = useParams<{ fileId: string }>();
  const { campaign } = useCampaign();
  const { get } = usePlayerFiles('story-artefacts');

  const { data: artefact, isLoading } = get(fileId || '');

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
          to="/player/modules/story-artefacts"
          className="mt-4 text-primary hover:underline"
        >
          Back to Story Artefacts
        </Link>
      </div>
    );
  }

  const { content } = artefact;
  const frontmatter = artefact.frontmatter as unknown as StoryArtefactFrontmatter;
  const images = (frontmatter.images || []) as ArtefactImage[];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back link */}
      <Link
        to="/player/modules/story-artefacts"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Story Artefacts
      </Link>

      {/* Header */}
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
          <p className="text-muted-foreground italic">No content available.</p>
        )}
      </div>
    </div>
  );
}

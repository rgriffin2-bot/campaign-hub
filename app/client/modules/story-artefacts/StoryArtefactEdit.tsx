import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, Upload, Plus } from 'lucide-react';
import { useFiles } from '../../hooks/useFiles';
import { useCampaign } from '../../core/providers/CampaignProvider';
import { ImageGallery } from './components/ImageGallery';
import {
  SUGGESTED_ARTEFACT_TAGS,
  type StoryArtefactFrontmatter,
  type ArtefactImage,
} from '@shared/schemas/story-artefact';

export function StoryArtefactEdit() {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const { campaign } = useCampaign();
  const { get, create, update } = useFiles('story-artefacts');

  const isNew = fileId === 'new';
  const { data: existingArtefact, isLoading, refetch } = get(isNew ? '' : fileId || '');

  const [name, setName] = useState('');
  const [tags, setTags] = useState('');
  const [content, setContent] = useState('');
  const [secrets, setSecrets] = useState('');
  const [notes, setNotes] = useState('');
  const [images, setImages] = useState<ArtefactImage[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (existingArtefact && !isNew) {
      const fm = existingArtefact.frontmatter as unknown as StoryArtefactFrontmatter;
      setName(fm.name);
      setTags((fm.tags || []).join(', '));
      setContent(existingArtefact.content);
      setSecrets(fm.dmOnly?.secrets || '');
      setNotes(fm.dmOnly?.notes || '');
      setImages(fm.images || []);
    }
  }, [existingArtefact, isNew]);

  const handleSave = async () => {
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      const tagsArray = tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const dmOnly =
        secrets.trim() || notes.trim()
          ? {
              secrets: secrets.trim() || undefined,
              notes: notes.trim() || undefined,
            }
          : undefined;

      if (isNew) {
        const newArtefact = await create.mutateAsync({
          name: name.trim(),
          content,
          frontmatter: {
            tags: tagsArray,
            images: [],
            dmOnly,
          },
        });
        navigate(`/modules/story-artefacts/${newArtefact.frontmatter.id}/edit`);
      } else {
        await update.mutateAsync({
          fileId: fileId!,
          input: {
            name: name.trim(),
            content,
            frontmatter: {
              tags: tagsArray,
              images, // Preserve current images
              dmOnly,
            },
          },
        });
        navigate(`/modules/story-artefacts/${fileId}`);
      }
    } catch (error) {
      console.error('Failed to save artefact:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || !campaign || !fileId || isNew) return;

      const file = e.target.files[0];
      if (!file) return;

      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch(
          `/api/campaigns/${campaign.id}/artefact-images/${fileId}`,
          {
            method: 'POST',
            body: formData,
          }
        );

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        // Refetch to get updated image list
        await refetch();
      } catch (error) {
        console.error('Failed to upload image:', error);
        alert('Failed to upload image. Please try again.');
      } finally {
        setIsUploading(false);
        // Reset the input
        e.target.value = '';
      }
    },
    [campaign, fileId, isNew, refetch]
  );

  const handleSetPrimary = useCallback(
    async (imageId: string) => {
      if (!campaign || !fileId) return;

      try {
        const response = await fetch(
          `/api/campaigns/${campaign.id}/artefact-images/${fileId}/${imageId}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isPrimary: true }),
          }
        );

        if (!response.ok) {
          throw new Error('Failed to set primary image');
        }

        await refetch();
      } catch (error) {
        console.error('Failed to set primary image:', error);
      }
    },
    [campaign, fileId, refetch]
  );

  const handleDeleteImage = useCallback(
    async (imageId: string) => {
      if (!campaign || !fileId) return;

      try {
        const response = await fetch(
          `/api/campaigns/${campaign.id}/artefact-images/${fileId}/${imageId}`,
          {
            method: 'DELETE',
          }
        );

        if (!response.ok) {
          throw new Error('Failed to delete image');
        }

        await refetch();
      } catch (error) {
        console.error('Failed to delete image:', error);
      }
    },
    [campaign, fileId, refetch]
  );

  const addSuggestedTag = (tag: string) => {
    const currentTags = tags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    if (!currentTags.includes(tag)) {
      setTags([...currentTags, tag].join(', '));
    }
  };

  if (!isNew && isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Get current images from the fetched data (more up-to-date than local state for images)
  const currentImages = existingArtefact
    ? ((existingArtefact.frontmatter as unknown as StoryArtefactFrontmatter).images || [])
    : images;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back link */}
      <Link
        to={isNew ? '/modules/story-artefacts' : `/modules/story-artefacts/${fileId}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {isNew ? 'Back to Story Artefacts' : 'Back to Artefact'}
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">
          {isNew ? 'New Story Artefact' : 'Edit Story Artefact'}
        </h1>
        <button
          onClick={handleSave}
          disabled={!name.trim() || isSaving}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Images Section (only for existing artefacts) */}
      {!isNew && fileId && campaign && (
        <div className="space-y-4 rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">
              Images ({currentImages.length})
            </h2>
            <label className="flex cursor-pointer items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent">
              {isUploading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
                  Uploading...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add Image
                </>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={isUploading}
                className="hidden"
              />
            </label>
          </div>

          {currentImages.length > 0 ? (
            <ImageGallery
              images={currentImages}
              campaignId={campaign.id}
              editable
              onSetPrimary={handleSetPrimary}
              onDelete={handleDeleteImage}
            />
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-8 text-center">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                No images yet. Click "Add Image" to upload.
              </p>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            The first image (or the one marked with a star) will be used as the thumbnail.
          </p>
        </div>
      )}

      {isNew && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/5 p-4 text-sm text-amber-500">
          Save the artefact first to enable image uploads.
        </div>
      )}

      {/* Form */}
      <div className="space-y-4 rounded-lg border border-border bg-card p-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Ancient Star Map, Letter from Captain Vex"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Tags
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g., letter, evidence, quest-item"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Separate tags with commas
          </p>

          {/* Suggested tags */}
          <div className="mt-2 flex flex-wrap gap-1">
            {SUGGESTED_ARTEFACT_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => addSuggestedTag(tag)}
                className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                + {tag}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Content
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
            placeholder="Describe the artefact. What does it look like? What's written on it? You can use Markdown formatting and link to other entries with [[module:id]] syntax."
            className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Supports Markdown. Link to other entries: [[npc:character-id]] or [[lore:entry-id]]
          </p>
        </div>
      </div>

      {/* DM-Only Section */}
      <div className="space-y-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-6">
        <h2 className="text-sm font-semibold text-amber-500">
          DM-Only Content (Hidden from Players)
        </h2>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Secrets
          </label>
          <textarea
            value={secrets}
            onChange={(e) => setSecrets(e.target.value)}
            rows={4}
            placeholder="Hidden information about this artefact that players shouldn't see..."
            className="w-full rounded-md border border-amber-500/30 bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            DM Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Your personal notes about this artefact..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>
    </div>
  );
}

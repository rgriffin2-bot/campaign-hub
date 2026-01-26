import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { useFiles } from '../../hooks/useFiles';
import { ImageUpload } from '../../components/ImageUpload';
import { loreTypes, type LoreType, type LoreFrontmatter } from '@shared/schemas/lore';

const typeLabels: Record<LoreType, string> = {
  world: 'World',
  faction: 'Faction',
  history: 'History',
  religion: 'Religion',
  magic: 'Magic',
  other: 'Other',
};

export function LoreEdit() {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const { get, create, update } = useFiles('lore');

  const isNew = fileId === 'new';
  const { data: existingLore, isLoading } = get(isNew ? '' : fileId || '');

  const [name, setName] = useState('');
  const [type, setType] = useState<LoreType>('world');
  const [tags, setTags] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (existingLore && !isNew) {
      const fm = existingLore.frontmatter as unknown as LoreFrontmatter;
      setName(fm.name);
      setType(fm.type);
      setTags((fm.tags || []).join(', '));
      setContent(existingLore.content);
      setImage(fm.image);
    }
  }, [existingLore, isNew]);

  const handleSave = async () => {
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      const tagsArray = tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      if (isNew) {
        const newLore = await create.mutateAsync({
          name: name.trim(),
          content,
          frontmatter: {
            type,
            tags: tagsArray,
            image: image || undefined,
          },
        });
        navigate(`/modules/lore/${newLore.frontmatter.id}`);
      } else {
        await update.mutateAsync({
          fileId: fileId!,
          input: {
            name: name.trim(),
            content,
            frontmatter: {
              type,
              tags: tagsArray,
              image: image || undefined,
            },
          },
        });
        navigate(`/modules/lore/${fileId}`);
      }
    } catch (error) {
      console.error('Failed to save lore:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isNew && isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back link */}
      <Link
        to={isNew ? '/modules/lore' : `/modules/lore/${fileId}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {isNew ? 'Back to Lore' : 'Back to Entry'}
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">
          {isNew ? 'New Lore Entry' : 'Edit Lore Entry'}
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

      {/* Header Image */}
      {!isNew && fileId && (
        <div className="space-y-4 rounded-lg border border-border bg-card p-6">
          <h2 className="font-semibold text-foreground">Header Image</h2>
          <ImageUpload
            currentImage={image}
            entityId={fileId}
            uploadEndpoint="lore-images"
            onUploadComplete={(path) => setImage(path)}
            onRemove={() => setImage(undefined)}
          />
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
            placeholder="e.g., The Kingdom of Valdris"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Type
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as LoreType)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {loreTypes.map((t) => (
              <option key={t} value={t}>
                {typeLabels[t]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Tags
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g., politics, nobility, western-region"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Separate tags with commas
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Content
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={15}
            placeholder="Write your lore content here. You can use Markdown formatting and link to other entries with [[module:id]] syntax."
            className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Supports Markdown. Link to other entries: [[npc:character-id]] or [[lore:entry-id]]
          </p>
        </div>
      </div>
    </div>
  );
}

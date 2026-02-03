import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, StickyNote } from 'lucide-react';
import { usePlayerFiles } from './hooks/usePlayerFiles';
import type { SessionNotesFrontmatter } from '@shared/schemas/session-notes';

export function PlayerSessionNotesEdit() {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const { get, create, update } = usePlayerFiles('session-notes');

  const isNew = fileId === 'new';
  const { data: existingNotes, isLoading } = get(isNew ? '' : fileId || '');

  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [author, setAuthor] = useState('');
  const [tags, setTags] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (existingNotes && !isNew) {
      const fm = existingNotes.frontmatter as unknown as SessionNotesFrontmatter;
      setName(fm.name);
      setDate(fm.date || '');
      setAuthor(fm.author || '');
      setTags((fm.tags || []).join(', '));
      setContent(existingNotes.content);
    }
  }, [existingNotes, isNew]);

  const handleSave = async () => {
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      const tagsArray = tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      if (isNew) {
        const newNotes = await create.mutateAsync({
          name: name.trim(),
          content,
          frontmatter: {
            date: date || undefined,
            author: author || undefined,
            tags: tagsArray,
          },
        });
        navigate(`/player/modules/session-notes/${newNotes.frontmatter.id}`);
      } else {
        await update.mutateAsync({
          fileId: fileId!,
          input: {
            name: name.trim(),
            content,
            frontmatter: {
              date: date || undefined,
              author: author || undefined,
              tags: tagsArray,
            },
          },
        });
        navigate(`/player/modules/session-notes/${fileId}`);
      }
    } catch (error) {
      console.error('Failed to save session notes:', error);
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
        to={isNew ? '/player/modules/session-notes' : `/player/modules/session-notes/${fileId}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {isNew ? 'Back to Session Notes' : 'Back to Entry'}
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StickyNote className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">
            {isNew ? 'New Session Notes' : 'Edit Session Notes'}
          </h1>
        </div>
        <button
          onClick={handleSave}
          disabled={!name.trim() || isSaving}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Form */}
      <div className="space-y-4 rounded-lg border border-border bg-card p-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Title *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Session 5: The Heist"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Session Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Author
            </label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="e.g., Your Name"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Tags
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g., combat, roleplay, major-plot"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Separate tags with commas
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Notes
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={20}
            placeholder="Write your session notes here. You can use Markdown formatting."
            className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Supports Markdown formatting.
          </p>
        </div>
      </div>
    </div>
  );
}

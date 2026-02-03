import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, StickyNote, Calendar, User } from 'lucide-react';
import { useFiles } from '../../hooks/useFiles';
import { MarkdownContent } from '../../components/MarkdownContent';
import { CopyableId } from '../../components/CopyableId';
import type { SessionNotesFrontmatter } from '@shared/schemas/session-notes';

export function SessionNotesDetail() {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const { get, delete: deleteMutation } = useFiles('session-notes');

  const { data: notes, isLoading } = get(fileId || '');

  const handleDelete = async () => {
    if (!fileId) return;
    if (!confirm('Are you sure you want to delete these session notes?')) return;

    await deleteMutation.mutateAsync(fileId);
    navigate('/modules/session-notes');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!notes) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <StickyNote className="h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold text-foreground">
          Session notes not found
        </h3>
        <Link
          to="/modules/session-notes"
          className="mt-4 text-primary hover:underline"
        >
          Back to Session Notes
        </Link>
      </div>
    );
  }

  const { content } = notes;
  const frontmatter = notes.frontmatter as unknown as SessionNotesFrontmatter;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back link */}
      <Link
        to="/modules/session-notes"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Session Notes
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {frontmatter.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {frontmatter.date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {frontmatter.date}
              </span>
            )}
            {frontmatter.author && (
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {frontmatter.author}
              </span>
            )}
          </div>
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
            <CopyableId moduleType="session-notes" id={fileId || ''} />
          </div>
        </div>

        <div className="flex gap-2">
          <Link
            to={`/modules/session-notes/${fileId}/edit`}
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

      {/* Content */}
      <div className="rounded-lg border border-border bg-card p-6">
        {content ? (
          <MarkdownContent content={content} />
        ) : (
          <p className="text-muted-foreground italic">No content yet.</p>
        )}
      </div>
    </div>
  );
}

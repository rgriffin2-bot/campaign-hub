import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, BookOpen } from 'lucide-react';
import { useFiles } from '../../hooks/useFiles';
import { MarkdownContent } from '../../components/MarkdownContent';
import type { LoreType, LoreFrontmatter } from '@shared/schemas/lore';

const typeLabels: Record<LoreType, string> = {
  world: 'World',
  faction: 'Faction',
  history: 'History',
  religion: 'Religion',
  magic: 'Magic',
  other: 'Other',
};

export function LoreDetail() {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const { get, delete: deleteMutation } = useFiles('lore');

  const { data: lore, isLoading } = get(fileId || '');

  const handleDelete = async () => {
    if (!fileId) return;
    if (!confirm('Are you sure you want to delete this lore entry?')) return;

    await deleteMutation.mutateAsync(fileId);
    navigate('/modules/lore');
  };

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
          to="/modules/lore"
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
        to="/modules/lore"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Lore
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
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

        <div className="flex gap-2">
          <Link
            to={`/modules/lore/${fileId}/edit`}
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

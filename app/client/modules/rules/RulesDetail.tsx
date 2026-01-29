import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Eye, EyeOff, Cog, Zap, Users, Sword, Clock, Heart, Package, Rocket, BookMarked, Pencil } from 'lucide-react';
import { useFiles } from '../../hooks/useFiles';
import { MarkdownContent } from '../../components/MarkdownContent';
import { CopyableId } from '../../components/CopyableId';
import type { RuleCategory, RuleFrontmatter } from '@shared/schemas/rules';

const categoryIcons: Record<RuleCategory, React.ReactNode> = {
  'core-mechanic': <Cog className="h-5 w-5" />,
  'action': <Zap className="h-5 w-5" />,
  'general-move': <Users className="h-5 w-5" />,
  'playbook-move': <Sword className="h-5 w-5" />,
  'downtime': <Clock className="h-5 w-5" />,
  'harm-recovery': <Heart className="h-5 w-5" />,
  'gear': <Package className="h-5 w-5" />,
  'ship': <Rocket className="h-5 w-5" />,
  'gm-reference': <BookMarked className="h-5 w-5" />,
};

const categoryLabels: Record<RuleCategory, string> = {
  'core-mechanic': 'Core Mechanic',
  'action': 'Action',
  'general-move': 'General Move',
  'playbook-move': 'Playbook Move',
  'downtime': 'Downtime',
  'harm-recovery': 'Harm & Recovery',
  'gear': 'Gear',
  'ship': 'Ship',
  'gm-reference': 'GM Reference',
};

export function RulesDetail() {
  const { fileId } = useParams<{ fileId: string }>();
  const { get, list, toggleVisibility } = useFiles('rules');

  const { data: rule, isLoading } = get(fileId || '');
  const { data: allRules } = list;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!rule) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <BookOpen className="h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold text-foreground">
          Rule not found
        </h3>
        <Link
          to="/modules/rules"
          className="mt-4 text-primary hover:underline"
        >
          Back to Rules
        </Link>
      </div>
    );
  }

  const { content } = rule;
  const frontmatter = rule.frontmatter as unknown as RuleFrontmatter;
  const category = frontmatter.category;
  const isHidden = frontmatter.playerVisible === false;

  const handleToggleVisibility = () => {
    if (!fileId) return;
    // When isHidden (playerVisible=false), we want to show it (pass hidden=false to toggle to visible)
    // When visible (playerVisible=true), we want to hide it (pass hidden=true to toggle to hidden)
    toggleVisibility.mutate({ fileId, hidden: !isHidden });
  };

  // Find related rules (same category or shared tags)
  const relatedRules = allRules?.filter((r) => {
    if (r.id === fileId) return false;

    // Same category
    if (r.category === category) return true;

    // Shared tags
    const ruleTags = frontmatter.tags || [];
    const otherTags = (r.tags as string[]) || [];
    return ruleTags.some((tag) => otherTags.includes(tag));
  }).slice(0, 6) || [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back link */}
      <Link
        to="/modules/rules"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Rules
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-2 rounded bg-secondary px-2 py-1 text-sm font-medium text-muted-foreground">
              {categoryIcons[category]}
              {categoryLabels[category] || category}
            </span>
            {frontmatter.subcategory && (
              <span className="rounded bg-secondary/50 px-2 py-1 text-xs text-muted-foreground">
                {frontmatter.subcategory}
              </span>
            )}
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
          {frontmatter.source && (
            <p className="mt-2 text-xs text-muted-foreground">
              Source: {frontmatter.source}
            </p>
          )}
          <div className="mt-3">
            <CopyableId moduleType="rules" id={fileId || ''} />
          </div>
        </div>

        <div className="flex gap-2">
          {/* Edit button */}
          <Link
            to={`/modules/rules/${fileId}/edit`}
            className="flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Link>

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
                GM Only
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                Visible
              </>
            )}
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

      {/* Related Rules */}
      {relatedRules.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Related Rules</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {relatedRules.map((related) => (
              <Link
                key={related.id}
                to={`/modules/rules/${related.id}`}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/50 hover:bg-accent"
              >
                <span className="text-muted-foreground">
                  {categoryIcons[related.category as RuleCategory] || <BookOpen className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">
                    {related.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {categoryLabels[related.category as RuleCategory] || related.category}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

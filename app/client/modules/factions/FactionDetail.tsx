import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Users, Lock, Eye, EyeOff, MapPin, User } from 'lucide-react';
import { useFiles } from '../../hooks/useFiles';
import { MarkdownContent } from '../../components/MarkdownContent';
import { CopyableId } from '../../components/CopyableId';
import { affinityLabels, FACTION_TYPE_LABELS, type FactionType, type FactionFrontmatter } from '@shared/schemas/faction';

export function FactionDetail() {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const { get, delete: deleteMutation, toggleVisibility, update } = useFiles('factions');

  const { data: faction, isLoading } = get(fileId || '');

  const handleDelete = async () => {
    if (!fileId) return;
    if (!confirm('Are you sure you want to delete this faction?')) return;

    await deleteMutation.mutateAsync(fileId);
    navigate('/modules/factions');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!faction) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <Users className="h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold text-foreground">
          Faction not found
        </h3>
        <Link
          to="/modules/factions"
          className="mt-4 text-primary hover:underline"
        >
          Back to Factions
        </Link>
      </div>
    );
  }

  const { content } = faction;
  const frontmatter = faction.frontmatter as unknown as FactionFrontmatter;
  const dmOnly = frontmatter.dmOnly;
  const isHidden = frontmatter.hidden === true;
  const affinity = frontmatter.affinity ?? 0;

  const handleToggleVisibility = () => {
    if (!fileId) return;
    toggleVisibility.mutate({ fileId, hidden: !isHidden });
  };

  const handleAffinityChange = (delta: number) => {
    if (!fileId) return;
    const newAffinity = Math.max(-3, Math.min(3, affinity + delta));
    if (newAffinity !== affinity) {
      update.mutate({
        fileId,
        input: {
          frontmatter: { affinity: newAffinity },
        },
      });
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Back link */}
      <Link
        to="/modules/factions"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Factions
      </Link>

      {/* Header Card */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Users className="h-8 w-8" />
              </div>

              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-bold text-foreground">
                  {frontmatter.name}
                </h1>
                {frontmatter.type && (
                  <p className="text-lg text-muted-foreground">
                    {FACTION_TYPE_LABELS[frontmatter.type]}
                  </p>
                )}
                {frontmatter.location && (
                  <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{frontmatter.location}</span>
                  </div>
                )}
                {frontmatter.leader && (
                  <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                    <User className="h-3.5 w-3.5" />
                    <span>Led by {frontmatter.leader}</span>
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
                  <CopyableId moduleType="factions" id={fileId || ''} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            {/* Actions */}
            <div className="flex gap-2">
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
                to={`/modules/factions/${fileId}/edit`}
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
      </div>

      {/* Affinity Card */}
      <div className={`rounded-lg border-2 p-6 ${getAffinityBorderColor(affinity)}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Standing with the Crew
            </h3>
            <div className="mt-2 flex items-baseline gap-2">
              <span className={`text-4xl font-bold ${getAffinityTextColor(affinity)}`}>
                {affinity > 0 ? `+${affinity}` : affinity}
              </span>
              <span className={`text-xl font-medium ${getAffinityTextColor(affinity)}`}>
                {affinityLabels[affinity]}
              </span>
            </div>
          </div>

          {/* Affinity controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAffinityChange(-1)}
              disabled={affinity <= -3}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-lg font-bold text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
            >
              -
            </button>
            <button
              onClick={() => handleAffinityChange(1)}
              disabled={affinity >= 3}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-lg font-bold text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
            >
              +
            </button>
          </div>
        </div>

        {/* Affinity Scale */}
        <div className="mt-4 flex items-center gap-1">
          {[-3, -2, -1, 0, 1, 2, 3].map((value) => (
            <button
              key={value}
              onClick={() => handleAffinityChange(value - affinity)}
              className={`flex-1 rounded py-2 text-center text-xs font-medium transition-colors ${
                value === affinity
                  ? `${getAffinityBgColor(value)} text-white`
                  : 'bg-secondary text-muted-foreground hover:bg-accent'
              }`}
              title={affinityLabels[value]}
            >
              {value > 0 ? `+${value}` : value}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      {frontmatter.description && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-2 font-medium text-foreground">Description</h3>
          <p className="text-muted-foreground">{frontmatter.description}</p>
        </div>
      )}

      {/* DM Only Section */}
      {dmOnly && (dmOnly.secrets || dmOnly.notes) && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-500">
            <Lock className="h-4 w-4" />
            DM Only
          </div>

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

      {/* Notes / Content */}
      {content && (
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 font-medium text-foreground">Notes</h3>
          <MarkdownContent content={content} />
        </div>
      )}
    </div>
  );
}

function getAffinityBorderColor(affinity: number): string {
  if (affinity >= 3) return 'border-emerald-500/50 bg-emerald-500/5';
  if (affinity === 2) return 'border-green-500/50 bg-green-500/5';
  if (affinity === 1) return 'border-lime-500/50 bg-lime-500/5';
  if (affinity === 0) return 'border-gray-500/50 bg-gray-500/5';
  if (affinity === -1) return 'border-yellow-500/50 bg-yellow-500/5';
  if (affinity === -2) return 'border-orange-500/50 bg-orange-500/5';
  return 'border-red-500/50 bg-red-500/5'; // -3
}

function getAffinityBgColor(affinity: number): string {
  if (affinity >= 3) return 'bg-emerald-500';
  if (affinity === 2) return 'bg-green-500';
  if (affinity === 1) return 'bg-lime-500';
  if (affinity === 0) return 'bg-gray-500';
  if (affinity === -1) return 'bg-yellow-500';
  if (affinity === -2) return 'bg-orange-500';
  return 'bg-red-500'; // -3
}

function getAffinityTextColor(affinity: number): string {
  if (affinity >= 3) return 'text-emerald-500';
  if (affinity === 2) return 'text-green-500';
  if (affinity === 1) return 'text-lime-500';
  if (affinity === 0) return 'text-gray-500';
  if (affinity === -1) return 'text-yellow-500';
  if (affinity === -2) return 'text-orange-500';
  return 'text-red-500'; // -3
}

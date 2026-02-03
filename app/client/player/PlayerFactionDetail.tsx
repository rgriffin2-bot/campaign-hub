import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Users, MapPin, User } from 'lucide-react';
import { usePlayerFiles } from './hooks/usePlayerFiles';
import { MarkdownContent } from '../components/MarkdownContent';
import { affinityLabels, FACTION_TYPE_LABELS, type FactionFrontmatter } from '@shared/schemas/faction';

export function PlayerFactionDetail() {
  const { fileId } = useParams<{ fileId: string }>();
  const { get } = usePlayerFiles('factions');

  const { data: faction, isLoading } = get(fileId || '');

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
          to="/player/modules/factions"
          className="mt-4 text-primary hover:underline"
        >
          Back to Factions
        </Link>
      </div>
    );
  }

  const { content } = faction;
  const frontmatter = faction.frontmatter as unknown as FactionFrontmatter;
  const affinity = frontmatter.affinity ?? 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Back link */}
      <Link
        to="/player/modules/factions"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Factions
      </Link>

      {/* Header Card */}
      <div className="rounded-lg border border-border bg-card p-6">
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
          </div>
        </div>
      </div>

      {/* Affinity Card */}
      <div className={`rounded-lg border-2 p-6 ${getAffinityBorderColor(affinity)}`}>
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

        {/* Affinity Scale (read-only) */}
        <div className="mt-4 flex items-center gap-1">
          {[-3, -2, -1, 0, 1, 2, 3].map((value) => (
            <div
              key={value}
              className={`flex-1 rounded py-2 text-center text-xs font-medium ${
                value === affinity
                  ? `${getAffinityBgColor(value)} text-white`
                  : 'bg-secondary text-muted-foreground'
              }`}
              title={affinityLabels[value]}
            >
              {value > 0 ? `+${value}` : value}
            </div>
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

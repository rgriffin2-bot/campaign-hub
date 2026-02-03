import { Link } from 'react-router-dom';
import { EyeOff } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCampaign } from '../../../core/providers/CampaignProvider';
import { affinityLabels, FACTION_TYPE_LABELS, type FactionType } from '@shared/schemas/faction';
import type { FileMetadata } from '@shared/types/file';

interface FactionCardProps {
  faction: FileMetadata;
}

export function FactionCard({ faction }: FactionCardProps) {
  const { campaign } = useCampaign();
  const queryClient = useQueryClient();

  const affinity = (faction.affinity as number | undefined) ?? 0;
  const factionType = faction.type as FactionType | undefined;
  const description = faction.description as string | undefined;
  const isHidden = faction.hidden as boolean | undefined;

  // Mutation for updating affinity
  const updateAffinity = useMutation({
    mutationFn: async (newAffinity: number) => {
      if (!campaign) throw new Error('No active campaign');

      const res = await fetch(
        `/api/campaigns/${campaign.id}/files/factions/${faction.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            frontmatter: { affinity: newAffinity },
          }),
          credentials: 'include',
        }
      );

      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['files', campaign?.id, 'factions'],
      });
    },
  });

  const handleAffinityChange = (delta: number) => {
    const newAffinity = Math.max(-3, Math.min(3, affinity + delta));
    if (newAffinity !== affinity) {
      updateAffinity.mutate(newAffinity);
    }
  };

  return (
    <div
      className={`group relative rounded-lg border bg-card p-4 transition-colors hover:border-primary/50 ${
        isHidden ? 'border-dashed border-muted' : 'border-border'
      }`}
    >
      {/* Hidden indicator */}
      {isHidden && (
        <div className="absolute right-2 top-2">
          <EyeOff className="h-4 w-4 text-muted-foreground" />
        </div>
      )}

      {/* Top section: Name and affinity controls */}
      <div className="flex items-start justify-between gap-2">
        <Link to={`/modules/factions/${faction.id}`} className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground group-hover:text-primary truncate">
            {faction.name}
          </h3>
          {factionType && (
            <p className="text-xs text-muted-foreground">
              {FACTION_TYPE_LABELS[factionType]}
            </p>
          )}
        </Link>

        {/* Affinity controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={(e) => {
              e.preventDefault();
              handleAffinityChange(-1);
            }}
            disabled={affinity <= -3 || updateAffinity.isPending}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
          >
            -
          </button>
          <div
            className={`flex h-6 min-w-[2.5rem] items-center justify-center rounded px-2 text-sm font-medium ${getAffinityBgColor(affinity)}`}
            title={affinityLabels[affinity]}
          >
            {affinity > 0 ? `+${affinity}` : affinity}
          </div>
          <button
            onClick={(e) => {
              e.preventDefault();
              handleAffinityChange(1);
            }}
            disabled={affinity >= 3 || updateAffinity.isPending}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
          >
            +
          </button>
        </div>
      </div>

      {/* Affinity label */}
      <p className={`mt-1 text-xs font-medium ${getAffinityTextColor(affinity)}`}>
        {affinityLabels[affinity]}
      </p>

      {/* Description preview */}
      {description && (
        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
          {description}
        </p>
      )}

      {/* Tags */}
      {(faction.tags as string[] | undefined)?.length ? (
        <div className="mt-3 flex flex-wrap gap-1">
          {(faction.tags as string[]).slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded bg-secondary px-2 py-0.5 text-xs text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function getAffinityBgColor(affinity: number): string {
  if (affinity >= 3) return 'bg-emerald-500/20 text-emerald-400';
  if (affinity === 2) return 'bg-green-500/20 text-green-400';
  if (affinity === 1) return 'bg-lime-500/20 text-lime-400';
  if (affinity === 0) return 'bg-gray-500/20 text-gray-400';
  if (affinity === -1) return 'bg-yellow-500/20 text-yellow-400';
  if (affinity === -2) return 'bg-orange-500/20 text-orange-400';
  return 'bg-red-500/20 text-red-400'; // -3
}

function getAffinityTextColor(affinity: number): string {
  if (affinity >= 3) return 'text-emerald-400';
  if (affinity === 2) return 'text-green-400';
  if (affinity === 1) return 'text-lime-400';
  if (affinity === 0) return 'text-gray-400';
  if (affinity === -1) return 'text-yellow-400';
  if (affinity === -2) return 'text-orange-400';
  return 'text-red-400'; // -3
}

import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Users } from 'lucide-react';
import { usePlayerFiles } from './hooks/usePlayerFiles';
import { useCampaign } from '../core/providers/CampaignProvider';
import { MarkdownContent } from '../components/MarkdownContent';
import { StatsBlock } from '../modules/player-characters/components/StatsBlock';
import {
  PressureTracker,
  HarmTracker,
  ResourceTracker,
  ExperienceTracker,
  LuckTracker,
} from '../modules/player-characters/components/TrackerRow';
import { GearList } from '../modules/player-characters/components/GearList';
import { PlaybookMoveGrid } from '../modules/player-characters/components/PlaybookMoveCard';
import type { PlayerCharacterFrontmatter } from '@shared/schemas/player-character';
import { useQuery } from '@tanstack/react-query';

export function PlayerCharacterDetail() {
  const { fileId } = useParams<{ fileId: string }>();
  const { campaign } = useCampaign();
  const { get } = usePlayerFiles('player-characters');

  const { data: pc, isLoading } = get(fileId || '');

  // Fetch character's playbook moves (using player endpoint)
  const { data: moves } = useQuery({
    queryKey: ['player-pc-moves', campaign?.id, fileId],
    queryFn: async () => {
      if (!campaign || !fileId) return [];
      const res = await fetch(
        `/api/player/campaigns/${campaign.id}/files/player-characters/${fileId}/moves`,
        { credentials: 'include' }
      );
      // If the endpoint doesn't exist, return empty array
      if (!res.ok) return [];
      const data = await res.json();
      return data.success ? data.data : [];
    },
    enabled: !!campaign && !!fileId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!pc) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <Users className="h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold text-foreground">
          Character not found
        </h3>
        <Link
          to="/player/modules/player-characters"
          className="mt-4 text-primary hover:underline"
        >
          Back to Characters
        </Link>
      </div>
    );
  }

  const { content } = pc;
  const fm = pc.frontmatter as unknown as PlayerCharacterFrontmatter;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Back link */}
      <Link
        to="/player/modules/player-characters"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Characters
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex gap-4">
          {/* Portrait */}
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
            {fm.portrait && campaign ? (
              <img
                src={`/api/campaigns/${campaign.id}/assets/${fm.portrait.replace('assets/', '')}`}
                alt={fm.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Users className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Basic info */}
          <div>
            <h1 className="text-2xl font-bold text-foreground">{fm.name}</h1>
            <div className="mt-1 flex flex-wrap gap-2 text-sm text-muted-foreground">
              {fm.playbook && (
                <span className="rounded bg-primary/10 px-2 py-0.5 text-primary">
                  {fm.playbook}
                </span>
              )}
              {fm.pronouns && <span>{fm.pronouns}</span>}
              {fm.species && <span>• {fm.species}</span>}
              {fm.age && <span>• {fm.age}</span>}
            </div>
            {fm.player && (
              <p className="mt-1 text-sm text-muted-foreground">
                Player: <span className="text-foreground">{fm.player}</span>
              </p>
            )}
          </div>
        </div>

        <Link
          to={`/player/modules/player-characters/${fileId}/edit`}
          className="flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          <Edit className="h-4 w-4" />
          Edit
        </Link>
      </div>

      {/* Stats Block */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Stats</h2>
        <StatsBlock stats={fm.stats || { poise: 0, insight: 0, grit: 0, presence: 0, resonance: 0 }} />
      </div>

      {/* Trackers Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-lg border border-border bg-card p-3">
          <PressureTracker value={fm.pressure || 0} />
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <HarmTracker harm={fm.harm || {}} />
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <ResourceTracker value={fm.resources || 'covered'} />
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <ExperienceTracker value={fm.experience || 0} />
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <LuckTracker value={fm.luck ?? true} />
        </div>
      </div>

      {/* Gear */}
      <div className="rounded-lg border border-border bg-card p-4">
        <GearList gear={fm.gear || []} />
      </div>

      {/* Playbook Moves */}
      {moves && moves.length > 0 && (
        <PlaybookMoveGrid
          moves={moves}
          characterId={fileId || ''}
          playerMode
        />
      )}

      {/* Biography/Content */}
      {(fm.appearance || fm.background || content) && (
        <div className="rounded-lg border border-border bg-card p-6">
          {fm.appearance && (
            <div className="mb-4">
              <h2 className="text-sm font-medium text-muted-foreground">Appearance</h2>
              <p className="mt-1 text-foreground">{fm.appearance}</p>
            </div>
          )}
          {fm.background && (
            <div className="mb-4">
              <h2 className="text-sm font-medium text-muted-foreground">Background</h2>
              <p className="mt-1 text-foreground">{fm.background}</p>
            </div>
          )}
          {content && (
            <div>
              <h2 className="mb-2 text-sm font-medium text-muted-foreground">Notes</h2>
              <MarkdownContent content={content} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

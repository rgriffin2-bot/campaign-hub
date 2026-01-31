import { Link } from 'react-router-dom';
import { Users, ExternalLink, Clover } from 'lucide-react';
import { useCampaign } from '../../../core/providers/CampaignProvider';
import {
  PressureTracker,
  HarmTracker,
  ResourceTracker,
  ExperienceTracker,
  LuckTracker,
} from '../../player-characters/components/TrackerRow';
import { GearList } from '../../player-characters/components/GearList';
import type {
  PlayerCharacterFrontmatter,
  ResourceLevel,
  HarmState,
  GearItem,
} from '@shared/schemas/player-character';

interface PCPanelProps {
  pc: {
    id: string;
    frontmatter: PlayerCharacterFrontmatter;
  };
  editable?: boolean;
  compact?: boolean;
  onUpdate?: (updates: Partial<PlayerCharacterFrontmatter>) => void;
}

export function PCPanel({ pc, editable = true, compact = false, onUpdate }: PCPanelProps) {
  const { campaign } = useCampaign();
  const fm = pc.frontmatter;

  const handlePressureChange = (pressure: number) => {
    onUpdate?.({ pressure });
  };

  const handleHarmChange = (harm: HarmState) => {
    onUpdate?.({ harm });
  };

  const handleResourcesChange = (resources: ResourceLevel) => {
    onUpdate?.({ resources });
  };

  const handleExperienceChange = (experience: number) => {
    onUpdate?.({ experience });
  };

  const handleLuckChange = (luck: boolean) => {
    onUpdate?.({ luck });
  };

  const handleGearChange = (gear: GearItem[]) => {
    onUpdate?.({ gear });
  };

  // Compact layout for side-by-side view (5 players in one row)
  if (compact) {
    return (
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {/* Header with portrait, name below, and luck indicator */}
        <div className="flex items-start gap-2 border-b border-border p-2">
          {/* Portrait and name stacked vertically */}
          <div className="flex flex-col items-start gap-1">
            <div className="h-[120px] w-[120px] shrink-0 overflow-hidden rounded-md bg-muted">
              {fm.portrait && campaign ? (
                <img
                  src={`/api/campaigns/${campaign.id}/assets/${fm.portrait.replace('assets/', '')}`}
                  alt={fm.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Users className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <h3 className="text-[18px] font-semibold text-foreground">{fm.name}</h3>
              <Link
                to={`/modules/player-characters/${pc.id}`}
                className="shrink-0 text-muted-foreground hover:text-foreground"
                title="View full character sheet"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Luck indicator */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (editable) handleLuckChange(!(fm.luck ?? true));
            }}
            disabled={!editable}
            className={`shrink-0 rounded p-1 transition-colors ${
              (fm.luck ?? true)
                ? 'text-green-500 hover:bg-green-500/10'
                : 'text-muted-foreground hover:bg-muted'
            } ${!editable ? 'cursor-default' : 'cursor-pointer'}`}
            title={fm.luck ?? true ? 'Luck available' : 'Luck spent'}
          >
            <Clover className="h-4 w-4" />
          </button>
        </div>

        {/* Trackers - stacked vertically for compact mode */}
        <div className="space-y-2 p-2">
          {/* Pressure & Experience stacked */}
          <div className="space-y-1">
            <PressureTracker
              value={fm.pressure || 0}
              editable={editable}
              onChange={handlePressureChange}
              compact
            />
            <ExperienceTracker
              value={fm.experience || 0}
              editable={editable}
              onChange={handleExperienceChange}
              compact
            />
          </div>

          {/* Harm - allows wrapping */}
          <HarmTracker
            harm={fm.harm || {}}
            editable={editable}
            onChange={handleHarmChange}
            compact
          />

          {/* Resources */}
          <ResourceTracker
            value={fm.resources || 'covered'}
            editable={editable}
            onChange={handleResourcesChange}
            compact
          />

          {/* Gear - allows wrapping */}
          <GearList
            gear={fm.gear || []}
            editable={editable}
            onChange={handleGearChange}
            compact
          />
        </div>
      </div>
    );
  }

  // Standard layout
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border p-3">
        {/* Portrait */}
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
          {fm.portrait && campaign ? (
            <img
              src={`/api/campaigns/${campaign.id}/assets/${fm.portrait.replace('assets/', '')}`}
              alt={fm.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold text-foreground">{fm.name}</h3>
            <Link
              to={`/modules/player-characters/${pc.id}`}
              className="shrink-0 text-muted-foreground hover:text-foreground"
              title="View full character sheet"
            >
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
          <div className="flex gap-2 text-xs text-muted-foreground">
            {fm.playbook && (
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">
                {fm.playbook}
              </span>
            )}
            {fm.player && <span>Player: {fm.player}</span>}
          </div>
        </div>
      </div>

      {/* Trackers */}
      <div className="grid gap-3 p-3">
        {/* Pressure & Experience Row */}
        <div className="flex gap-4">
          <PressureTracker
            value={fm.pressure || 0}
            editable={editable}
            onChange={handlePressureChange}
          />
          <ExperienceTracker
            value={fm.experience || 0}
            editable={editable}
            onChange={handleExperienceChange}
          />
          <LuckTracker
            value={fm.luck ?? true}
            editable={editable}
            onChange={handleLuckChange}
          />
        </div>

        {/* Harm */}
        <HarmTracker
          harm={fm.harm || {}}
          editable={editable}
          onChange={handleHarmChange}
        />

        {/* Resources */}
        <ResourceTracker
          value={fm.resources || 'covered'}
          editable={editable}
          onChange={handleResourcesChange}
        />

        {/* Gear */}
        <GearList
          gear={fm.gear || []}
          editable={editable}
          onChange={handleGearChange}
        />
      </div>
    </div>
  );
}

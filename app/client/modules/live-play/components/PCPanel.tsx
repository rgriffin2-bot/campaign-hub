/**
 * PCPanel -- displays a single player character's trackers during live play.
 * When collapsible, panels can be horizontally collapsed to a narrow strip
 * showing just a small portrait and the character name displayed vertically.
 * All tracker values are editable when `editable` is true and propagated via onUpdate.
 */
import { useState } from 'react';
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
  collapsible?: boolean;
  defaultExpanded?: boolean;
  /** Index in the list, used for alternating background shading */
  index?: number;
  /** Extra classes applied to the outermost container (e.g. ring for selection) */
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  onUpdate?: (updates: Partial<PlayerCharacterFrontmatter>) => void;
}

export function PCPanel({ pc, editable = true, compact = false, collapsible = false, defaultExpanded = true, index = 0, className = '', onClick, onUpdate }: PCPanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const { campaign } = useCampaign();
  const fm = pc.frontmatter;

  // Alternating shade: even indices get normal card bg, odd indices get accent bg
  const cardBg = index % 2 === 0 ? 'bg-card' : 'bg-accent';

  // --- Tracker change handlers (each propagates a partial frontmatter update) ---

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

  // Portrait helper shared by both layouts
  const portrait = (size: string) => (
    <div className={`${size} shrink-0 overflow-hidden rounded-md bg-muted`}>
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
  );

  // ── Collapsed strip (horizontal collapse — narrow width) ─────────
  // Shown for both compact and standard layouts when collapsible && !expanded
  if (collapsible && !expanded) {
    return (
      <div
        className={`flex self-stretch w-14 shrink-0 grow-0 flex-col items-center gap-2 overflow-hidden rounded-lg border border-border ${cardBg} p-2 cursor-pointer hover:bg-accent/50 transition-colors ${className}`}
        onClick={(e) => { e.stopPropagation(); onClick?.(e); setExpanded(true); }}
        title={`Expand ${fm.name}`}
      >
        {portrait('h-10 w-10')}
        <span
          className="text-xs font-semibold text-foreground whitespace-nowrap"
          style={{ writingMode: 'vertical-lr' }}
        >
          {fm.name}
        </span>
        {/* Pressure pips as a vertical column */}
        <div className="flex flex-col items-center gap-0.5">
          {Array.from({ length: 5 }, (_, i) => (
            <div
              key={i}
              className={`h-1.5 w-1.5 rounded-full ${
                i < (fm.pressure || 0) ? 'bg-red-500' : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Compact layout (expanded) ────────────────────────────────────
  if (compact) {
    return (
      <div className={`overflow-hidden rounded-lg border border-border ${cardBg} md:flex-1 md:min-w-0 ${className}`} onClick={onClick}>
        {/* Header with portrait, name below, and luck indicator */}
        <div className="flex items-start gap-2 border-b border-border p-1.5 md:p-2">
          {/* Portrait and name stacked vertically */}
          <div className="flex flex-col items-start gap-1">
            {portrait('h-[80px] w-[80px] md:h-[120px] md:w-[120px]')}
            <div className="flex items-center gap-1">
              <h3 className="text-sm md:text-[18px] font-semibold text-foreground">{fm.name}</h3>
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

          {/* Collapse button + Luck indicator */}
          <div className="flex flex-col items-center gap-1">
            {collapsible && (
              <button
                onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
                className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                title="Collapse"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="11 17 6 12 11 7" /><polyline points="18 17 13 12 18 7" /></svg>
              </button>
            )}
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
        </div>

        {/* Trackers - stacked vertically for compact mode */}
        <div className="space-y-1.5 md:space-y-2 p-1.5 md:p-2">
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

  // ── Standard layout (expanded) ───────────────────────────────────
  return (
    <div className={`overflow-hidden rounded-lg border border-border ${cardBg} ${className}`} onClick={onClick}>
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border p-3">
        {/* Portrait */}
        {portrait('h-12 w-12')}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold text-foreground">{fm.name}</h3>
            <Link
              to={`/modules/player-characters/${pc.id}`}
              className="shrink-0 text-muted-foreground hover:text-foreground"
              title="View full character sheet"
              onClick={(e) => e.stopPropagation()}
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

        {collapsible && (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
            className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title="Collapse"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="11 17 6 12 11 7" /><polyline points="18 17 13 12 18 7" /></svg>
          </button>
        )}
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

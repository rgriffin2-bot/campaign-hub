import { memo } from 'react';
import {
  ChevronUp,
  ChevronDown,
  Trash2,
  User,
  Ship,
  Skull,
} from 'lucide-react';
import type { InitiativeEntry as InitiativeEntryType } from '@shared/types/initiative';
import { useCampaign } from '../core/providers/CampaignProvider';

// Simple classnames helper
function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

interface InitiativeEntryProps {
  entry: InitiativeEntryType;
  isDm: boolean;
  isFirst: boolean;
  isLast: boolean;
  compact?: boolean;
  tacticalBoardMode?: boolean; // Vertical sidebar layout
  onUpdate?: (entryId: string, updates: Partial<InitiativeEntryType>) => void;
  onRemove?: (entryId: string) => void;
  onMoveUp?: (entryId: string) => void;
  onMoveDown?: (entryId: string) => void;
}

export const InitiativeEntryComponent = memo(function InitiativeEntryComponent({
  entry,
  isDm,
  isFirst,
  isLast,
  compact = false,
  tacticalBoardMode = false,
  onRemove,
  onMoveUp,
  onMoveDown,
}: InitiativeEntryProps) {
  const { campaign } = useCampaign();

  // Build portrait URL
  const portraitUrl = entry.portrait && campaign
    ? `/api/campaigns/${campaign.id}/assets/${entry.portrait.replace('assets/', '')}`
    : null;

  // Get icon based on source type
  const getSourceIcon = (size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-8 w-8',
    };
    const className = sizeClasses[size];

    switch (entry.sourceType) {
      case 'pc':
        return <User className={className} />;
      case 'npc':
        return <Skull className={className} />;
      case 'ship':
        return <Ship className={className} />;
      default:
        return <User className={className} />;
    }
  };

  // Tactical board sidebar - portrait with name below, controls stacked vertically on side
  if (tacticalBoardMode) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border p-2 transition-all',
          entry.isActive
            ? 'border-primary bg-primary/10 ring-1 ring-primary'
            : 'border-border bg-card/50'
        )}
      >
        {/* Portrait and name column */}
        <div className="flex flex-1 flex-col items-center gap-1">
          {/* Portrait - larger */}
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
            {portraitUrl ? (
              <img
                src={portraitUrl}
                alt={entry.name}
                className="h-full w-full object-cover"
                style={
                  entry.portraitPosition
                    ? {
                        objectPosition: `${entry.portraitPosition.x}% ${entry.portraitPosition.y}%`,
                        transform: `scale(${entry.portraitPosition.scale || 1})`,
                      }
                    : undefined
                }
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                {getSourceIcon('md')}
              </div>
            )}
            {entry.isActive && (
              <div className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-card bg-primary" />
            )}
          </div>

          {/* Name below portrait */}
          <span className="max-w-full truncate text-xs font-medium text-foreground text-center">
            {entry.name}
          </span>
        </div>

        {/* Action buttons (DM only) - stacked vertically */}
        {isDm && (
          <div className="flex shrink-0 flex-col items-center gap-0.5">
            <button
              type="button"
              onClick={() => onMoveUp?.(entry.id)}
              disabled={isFirst}
              className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30"
              title="Move up"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onMoveDown?.(entry.id)}
              disabled={isLast}
              className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30"
              title="Move down"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onRemove?.(entry.id)}
              className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              title="Remove"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    );
  }

  if (compact) {
    // Compact horizontal layout for tactical board bottom bar - with larger portraits
    return (
      <div
        className={cn(
          'flex flex-col items-center gap-1 rounded-lg border px-3 py-2 transition-all',
          entry.isActive
            ? 'border-primary bg-primary/10 ring-2 ring-primary'
            : 'border-border bg-card/50'
        )}
      >
        {/* Portrait or icon - larger size */}
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
          {portraitUrl ? (
            <img
              src={portraitUrl}
              alt={entry.name}
              className="h-full w-full object-cover"
              style={
                entry.portraitPosition
                  ? {
                      objectPosition: `${entry.portraitPosition.x}% ${entry.portraitPosition.y}%`,
                      transform: `scale(${entry.portraitPosition.scale || 1})`,
                    }
                  : undefined
              }
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              {getSourceIcon('md')}
            </div>
          )}
          {entry.isActive && (
            <div className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-card bg-primary" />
          )}
        </div>

        {/* Name */}
        <span className="max-w-[80px] truncate text-xs font-medium text-foreground">
          {entry.name}
        </span>
      </div>
    );
  }

  // Full layout for Live Play - horizontal flow with larger portraits
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2 rounded-lg border p-3 transition-all min-w-[100px]',
        entry.isActive
          ? 'border-primary bg-primary/10 ring-2 ring-primary'
          : 'border-border bg-card'
      )}
    >
      {/* Portrait - much larger */}
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-muted">
        {portraitUrl ? (
          <img
            src={portraitUrl}
            alt={entry.name}
            className="h-full w-full object-cover"
            style={
              entry.portraitPosition
                ? {
                    objectPosition: `${entry.portraitPosition.x}% ${entry.portraitPosition.y}%`,
                    transform: `scale(${entry.portraitPosition.scale || 1})`,
                  }
                : undefined
            }
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            {getSourceIcon('lg')}
          </div>
        )}
        {entry.isActive && (
          <div className="absolute -right-0.5 -top-0.5 h-4 w-4 rounded-full border-2 border-card bg-primary" />
        )}
      </div>

      {/* Name */}
      <span className="max-w-[100px] truncate text-sm font-medium text-foreground text-center">
        {entry.name}
      </span>

      {/* Action buttons (DM only) */}
      {isDm && (
        <div className="flex items-center gap-1">
          {/* Reorder controls */}
          <button
            type="button"
            onClick={() => onMoveUp?.(entry.id)}
            disabled={isFirst}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30"
            title="Move up in order"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onMoveDown?.(entry.id)}
            disabled={isLast}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30"
            title="Move down in order"
          >
            <ChevronDown className="h-4 w-4" />
          </button>

          {/* Delete */}
          <button
            type="button"
            onClick={() => onRemove?.(entry.id)}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            title="Remove from initiative"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
});

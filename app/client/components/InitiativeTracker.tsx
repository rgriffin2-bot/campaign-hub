import { memo, useState, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Users,
} from 'lucide-react';
import { InitiativeEntryComponent } from './InitiativeEntry';
import type { InitiativeEntry, InitiativeState } from '@shared/types/initiative';

// Simple classnames helper
function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

interface InitiativeTrackerProps {
  // State (required)
  initiative: InitiativeState;
  isDm?: boolean;

  // Entry management callbacks
  onAddEntry?: (entry: Omit<InitiativeEntry, 'id'>) => void;
  onRemoveEntry?: (entryId: string) => void;
  onUpdateEntry?: (entryId: string, updates: Partial<InitiativeEntry>) => void;
  onClearAllEntries?: () => void;

  // Turn management
  onNextTurn?: () => void;
  onPrevTurn?: () => void;

  // Reordering
  onMoveEntryUp?: (entryId: string) => void;
  onMoveEntryDown?: (entryId: string) => void;

  // Populate from scene
  onAddInScene?: () => void;

  // Layout
  compact?: boolean; // For bottom bar horizontal layout
  tacticalBoardMode?: boolean; // For tactical board sidebar vertical layout
  className?: string;
}

export const InitiativeTracker = memo(function InitiativeTracker({
  initiative,
  isDm = true,
  onAddEntry,
  onRemoveEntry,
  onUpdateEntry,
  onClearAllEntries,
  onNextTurn,
  onPrevTurn,
  onMoveEntryUp,
  onMoveEntryDown,
  onAddInScene,
  compact = false,
  tacticalBoardMode = false,
  className,
}: InitiativeTrackerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEntryName, setNewEntryName] = useState('');

  // Handle adding a new custom entry
  const handleAddEntry = useCallback(() => {
    if (!newEntryName.trim() || !onAddEntry) return;

    onAddEntry({
      sourceType: 'custom',
      name: newEntryName.trim(),
      initiative: 0,
      isActive: false,
    });

    setNewEntryName('');
    setShowAddForm(false);
  }, [newEntryName, onAddEntry]);

  // If not visible to players and user is not DM, show minimal UI
  if (!initiative.visibleToPlayers && !isDm) {
    return null;
  }

  // Tactical Board sidebar vertical layout - compact controls, one entry per row
  if (tacticalBoardMode) {
    return (
      <div className={cn('flex flex-col gap-2', className)}>
        {/* Compact header - stacked layout to fit narrow sidebar */}
        <div className="flex flex-col gap-2">
          {/* Row 1: Round counter with turn controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Round</span>
              <span className="text-sm font-bold tabular-nums text-foreground">{initiative.currentRound}</span>
            </div>
            {isDm && onPrevTurn && onNextTurn && (
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={onPrevTurn}
                  className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  title="Previous turn"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={onNextTurn}
                  className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  title="Next turn"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Row 2: Action buttons - stacked */}
          {isDm && (
            <div className="flex items-center gap-1">
              {onAddInScene && (
                <button
                  type="button"
                  onClick={() => onAddInScene()}
                  className="flex flex-1 items-center justify-center gap-1 rounded border border-border bg-background px-1.5 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  title="Add all from board"
                >
                  <Users className="h-3 w-3" />
                  <span>+ In Scene</span>
                </button>
              )}
              {onAddEntry && (
                <button
                  type="button"
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="flex items-center justify-center gap-1 rounded border border-border bg-background px-1.5 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  title="Add custom entry"
                >
                  <Plus className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Add form */}
        {isDm && showAddForm && onAddEntry && (
          <div className="flex items-center gap-1 rounded border border-border bg-background p-1.5">
            <input
              type="text"
              value={newEntryName}
              onChange={(e) => setNewEntryName(e.target.value)}
              placeholder="Name"
              className="min-w-0 flex-1 rounded border border-border bg-card px-1.5 py-0.5 text-xs"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddEntry();
                if (e.key === 'Escape') setShowAddForm(false);
              }}
              autoFocus
            />
            <button
              type="button"
              onClick={handleAddEntry}
              disabled={!newEntryName.trim()}
              className="shrink-0 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        )}

        {/* Entry list - vertical, one per row */}
        <div className="flex flex-col gap-1.5">
          {initiative.entries.length === 0 ? (
            <div className="py-4 text-center text-xs text-muted-foreground">
              No entries
            </div>
          ) : (
            initiative.entries.map((entry, index) => (
              <InitiativeEntryComponent
                key={entry.id}
                entry={entry}
                isDm={isDm}
                isFirst={index === 0}
                isLast={index === initiative.entries.length - 1}
                onUpdate={onUpdateEntry}
                onRemove={onRemoveEntry}
                onMoveUp={onMoveEntryUp}
                onMoveDown={onMoveEntryDown}
                tacticalBoardMode={true}
              />
            ))
          )}
        </div>
      </div>
    );
  }

  // Compact horizontal layout for tactical board bottom bar
  if (compact) {
    return (
      <div className={cn('flex items-center gap-3 rounded-lg border border-border bg-card/80 px-3 py-2 backdrop-blur-sm', className)}>
        {/* Round counter (display only) */}
        <div className="flex items-center gap-1 text-xs">
          <span className="text-muted-foreground">Round</span>
          <span className="font-bold tabular-nums text-foreground">{initiative.currentRound}</span>
        </div>

        {/* Turn controls (DM only) */}
        {isDm && onPrevTurn && onNextTurn && (
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={onPrevTurn}
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Previous turn"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onNextTurn}
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Next turn"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Divider */}
        <div className="h-6 w-px bg-border" />

        {/* Entry list (horizontal scroll) */}
        <div className="flex flex-1 items-center gap-2 overflow-x-auto">
          {initiative.entries.length === 0 ? (
            <span className="text-xs text-muted-foreground">No entries</span>
          ) : (
            initiative.entries.map((entry, index) => (
              <InitiativeEntryComponent
                key={entry.id}
                entry={entry}
                isDm={isDm}
                isFirst={index === 0}
                isLast={index === initiative.entries.length - 1}
                compact={true}
              />
            ))
          )}
        </div>

        {/* DM controls */}
        {isDm && (
          <>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-1">
              {onAddInScene && (
                <button
                  type="button"
                  onClick={() => onAddInScene()}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  title="Add all from scene"
                >
                  <Users className="h-3.5 w-3.5" />
                  + In Scene
                </button>
              )}
              {onAddEntry && (
                <button
                  type="button"
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  title="Add custom entry"
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // Full horizontal layout for Live Play module
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Round counter (display only) */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Round</span>
            <span className="text-lg font-bold tabular-nums text-foreground">
              {initiative.currentRound}
            </span>
          </div>

          {/* Turn navigation (DM only) */}
          {isDm && onPrevTurn && onNextTurn && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onPrevTurn}
                disabled={initiative.entries.length === 0}
                className="rounded-md border border-border bg-background p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30"
                title="Previous turn"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onNextTurn}
                disabled={initiative.entries.length === 0}
                className="rounded-md border border-border bg-background p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30"
                title="Next turn"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* DM controls */}
        {isDm && (
          <div className="flex items-center gap-2">
            {onAddInScene && (
              <button
                type="button"
                onClick={() => onAddInScene()}
                className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Users className="h-3.5 w-3.5" />
                + In Scene
              </button>
            )}

            {onAddEntry && (
              <button
                type="button"
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            )}

            {onClearAllEntries && (
              <button
                type="button"
                onClick={onClearAllEntries}
                disabled={initiative.entries.length === 0}
                className="rounded-md border border-border bg-background p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
                title="Clear all entries"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add form (DM only) */}
      {isDm && showAddForm && onAddEntry && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-background p-2">
          <input
            type="text"
            value={newEntryName}
            onChange={(e) => setNewEntryName(e.target.value)}
            placeholder="Name"
            className="flex-1 rounded border border-border bg-card px-2 py-1 text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddEntry();
              if (e.key === 'Escape') setShowAddForm(false);
            }}
            autoFocus
          />
          <button
            type="button"
            onClick={handleAddEntry}
            disabled={!newEntryName.trim()}
            className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      )}

      {/* Entry list - horizontal layout (left to right) */}
      <div className="flex flex-row flex-wrap gap-3 overflow-x-auto">
        {initiative.entries.length === 0 ? (
          <div className="py-4 text-center text-sm text-muted-foreground w-full">
            No entries in initiative order
          </div>
        ) : (
          initiative.entries.map((entry, index) => (
            <InitiativeEntryComponent
              key={entry.id}
              entry={entry}
              isDm={isDm}
              isFirst={index === 0}
              isLast={index === initiative.entries.length - 1}
              onUpdate={onUpdateEntry}
              onRemove={onRemoveEntry}
              onMoveUp={onMoveEntryUp}
              onMoveDown={onMoveEntryDown}
            />
          ))
        )}
      </div>
    </div>
  );
});

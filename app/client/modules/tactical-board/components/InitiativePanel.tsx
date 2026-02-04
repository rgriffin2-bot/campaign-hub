import { memo } from 'react';
import { X, Swords } from 'lucide-react';
import { InitiativeTracker } from '../../../components/InitiativeTracker';
import type { InitiativePanelPosition } from '@shared/schemas/tactical-board';
import type { TacticalBoardInitiativeState } from '../hooks/useTacticalBoardInitiative';

// Simple classnames helper
function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

interface InitiativePanelProps {
  position: InitiativePanelPosition;
  onClose: () => void;
  initiativeState: TacticalBoardInitiativeState;
}

export const InitiativePanel = memo(function InitiativePanel({
  position,
  onClose,
  initiativeState,
}: InitiativePanelProps) {
  const {
    initiative,
    addEntry,
    removeEntry,
    updateEntry,
    clearAllEntries,
    nextTurn,
    prevTurn,
    moveEntryUp,
    moveEntryDown,
    addFromTokens,
  } = initiativeState;

  const isRight = position === 'right';

  return (
    <div
      className={cn(
        'flex flex-col border-border bg-card/95 backdrop-blur-sm',
        isRight
          ? 'h-full w-56 shrink-0 border-l'
          : 'w-full border-t'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <Swords className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Initiative</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="Close panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div
        className={cn(
          'overflow-auto p-2',
          isRight ? 'flex-1' : 'max-h-48'
        )}
      >
        <InitiativeTracker
          initiative={initiative}
          isDm={true}
          onAddEntry={addEntry}
          onRemoveEntry={removeEntry}
          onUpdateEntry={updateEntry}
          onClearAllEntries={clearAllEntries}
          onNextTurn={nextTurn}
          onPrevTurn={prevTurn}
          onMoveEntryUp={moveEntryUp}
          onMoveEntryDown={moveEntryDown}
          onAddInScene={addFromTokens}
          compact={!isRight}
          tacticalBoardMode={isRight}
        />
      </div>
    </div>
  );
});

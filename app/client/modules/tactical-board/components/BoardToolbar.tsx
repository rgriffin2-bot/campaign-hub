import { Link } from 'react-router-dom';
import {
  Grid3X3,
  Magnet,
  Settings,
  ArrowLeft,
  Sparkles,
  CloudFog,
  Trash2,
  Swords,
  PanelRight,
  PanelBottom,
} from 'lucide-react';
import type { TacticalBoard, InitiativePanelPosition } from '@shared/schemas/tactical-board';

interface BoardToolbarProps {
  board: TacticalBoard;
  isEditable: boolean;
  onToggleGrid: () => void;
  onToggleSnapToGrid: () => void;
  onToggleAnimations?: () => void;
  onToggleFog?: () => void;
  onClearAllFog?: () => void;
  onToggleInitiativePanel?: () => void;
  onSetInitiativePanelPosition?: (position: InitiativePanelPosition) => void;
}

export function BoardToolbar({
  board,
  isEditable,
  onToggleGrid,
  onToggleSnapToGrid,
  onToggleAnimations,
  onToggleFog,
  onClearAllFog,
  onToggleInitiativePanel,
  onSetInitiativePanelPosition,
}: BoardToolbarProps) {
  const animationsEnabled = board.animationsEnabled ?? true;
  const fogEnabled = board.fogEnabled ?? true;
  const hasFog = (board.fogCells?.length ?? 0) > 0;
  const showInitiativePanel = board.showInitiativePanel ?? false;
  const initiativePanelPosition = board.initiativePanelPosition ?? 'right';
  return (
    <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2">
      {/* Left section: Navigation and board name */}
      <div className="flex items-center gap-3">
        <Link
          to="/modules/tactical-board"
          className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="Back to boards"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-lg font-semibold text-foreground">{board.name}</h1>
        {isEditable && (
          <Link
            to={`/modules/tactical-board/${board.id}/edit`}
            className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Board settings"
          >
            <Settings className="h-4 w-4" />
          </Link>
        )}
      </div>

      {/* Right section: Grid controls */}
      <div className="flex items-center gap-1">
        {/* Grid toggle */}
        <button
          type="button"
          onClick={onToggleGrid}
          className={`rounded p-1.5 transition-colors ${
            board.gridEnabled
              ? 'bg-primary/20 text-primary'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
          title={board.gridEnabled ? 'Hide grid' : 'Show grid'}
        >
          <Grid3X3 className="h-4 w-4" />
        </button>

        {/* Snap to grid toggle */}
        {isEditable && (
          <button
            type="button"
            onClick={onToggleSnapToGrid}
            className={`rounded p-1.5 transition-colors ${
              board.snapToGrid
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
            title={board.snapToGrid ? 'Disable snap to grid' : 'Enable snap to grid'}
          >
            <Magnet className="h-4 w-4" />
          </button>
        )}

        {/* Animations toggle */}
        {onToggleAnimations && (
          <button
            type="button"
            onClick={onToggleAnimations}
            className={`rounded p-1.5 transition-colors ${
              animationsEnabled
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
            title={animationsEnabled ? 'Disable connection animations (better performance)' : 'Enable connection animations'}
          >
            <Sparkles className="h-4 w-4" />
          </button>
        )}

        {/* Fog toggle */}
        {onToggleFog && (
          <button
            type="button"
            onClick={onToggleFog}
            className={`rounded p-1.5 transition-colors ${
              fogEnabled
                ? 'bg-slate-500/20 text-slate-300'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
            title={fogEnabled ? 'Hide fog (DM preview)' : 'Show fog'}
          >
            <CloudFog className="h-4 w-4" />
          </button>
        )}

        {/* Clear all fog */}
        {isEditable && onClearAllFog && hasFog && (
          <button
            type="button"
            onClick={onClearAllFog}
            className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            title="Clear all fog"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}

        {/* Separator */}
        {onToggleInitiativePanel && (
          <div className="mx-1 h-5 w-px bg-border" />
        )}

        {/* Initiative panel toggle */}
        {onToggleInitiativePanel && (
          <button
            type="button"
            onClick={onToggleInitiativePanel}
            className={`rounded p-1.5 transition-colors ${
              showInitiativePanel
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
            title={showInitiativePanel ? 'Hide initiative panel' : 'Show initiative panel'}
          >
            <Swords className="h-4 w-4" />
          </button>
        )}

        {/* Initiative panel position toggle (only when panel is visible) */}
        {showInitiativePanel && onSetInitiativePanelPosition && (
          <button
            type="button"
            onClick={() =>
              onSetInitiativePanelPosition(
                initiativePanelPosition === 'right' ? 'bottom' : 'right'
              )
            }
            className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title={`Move initiative panel to ${initiativePanelPosition === 'right' ? 'bottom' : 'right'}`}
          >
            {initiativePanelPosition === 'right' ? (
              <PanelBottom className="h-4 w-4" />
            ) : (
              <PanelRight className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

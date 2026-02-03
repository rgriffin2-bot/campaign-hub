import { useState } from 'react';
import { Lock, Unlock, Eye, EyeOff, Trash2, MousePointer2, Hand, Type, Cable } from 'lucide-react';
import type { BoardToken } from '@shared/schemas/tactical-board';

export type InteractionMode = 'select' | 'pan' | 'connect';

interface FloatingToolbarProps {
  selectedToken: BoardToken | null;
  interactionMode: InteractionMode;
  onToggleLock: () => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
  onSetInteractionMode: (mode: InteractionMode) => void;
  onAddTextBox: () => void;
}

interface TooltipButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  tooltip: string;
  isActive?: boolean;
  activeClass?: string;
  hoverClass?: string;
}

function TooltipButton({
  onClick,
  icon,
  tooltip,
  isActive = false,
  activeClass = 'bg-primary/20 text-primary',
  hoverClass = 'hover:bg-accent',
}: TooltipButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`flex items-center justify-center rounded-md p-2 transition-colors ${
          isActive ? activeClass : `text-foreground ${hoverClass}`
        }`}
      >
        {icon}
      </button>
      {showTooltip && (
        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap rounded bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md border border-border z-50">
          {tooltip}
        </div>
      )}
    </div>
  );
}

export function FloatingToolbar({
  selectedToken,
  interactionMode,
  onToggleLock,
  onToggleVisibility,
  onDelete,
  onSetInteractionMode,
  onAddTextBox,
}: FloatingToolbarProps) {
  return (
    <div className="absolute left-4 top-4 z-50 flex flex-col gap-0.5 rounded-lg border border-border bg-card/95 p-1 shadow-lg backdrop-blur-sm">
      {/* Interaction Mode: Select */}
      <TooltipButton
        onClick={() => onSetInteractionMode('select')}
        icon={<MousePointer2 className="h-4 w-4" />}
        tooltip="Select"
        isActive={interactionMode === 'select'}
      />

      {/* Interaction Mode: Pan */}
      <TooltipButton
        onClick={() => onSetInteractionMode('pan')}
        icon={<Hand className="h-4 w-4" />}
        tooltip="Pan"
        isActive={interactionMode === 'pan'}
      />

      {/* Interaction Mode: Connect */}
      <TooltipButton
        onClick={() => onSetInteractionMode('connect')}
        icon={<Cable className="h-4 w-4" />}
        tooltip="Connect"
        isActive={interactionMode === 'connect'}
        activeClass="bg-cyan-500/20 text-cyan-400"
      />

      {/* Divider */}
      <div className="my-1 h-px bg-border" />

      {/* Add Text Box */}
      <TooltipButton
        onClick={onAddTextBox}
        icon={<Type className="h-4 w-4" />}
        tooltip="Text"
        hoverClass="hover:bg-accent"
      />

      {/* Token-specific actions - only show when token is selected */}
      {selectedToken && (
        <>
          {/* Divider */}
          <div className="my-1 h-px bg-border" />

          {/* Lock/Unlock */}
          <TooltipButton
            onClick={onToggleLock}
            icon={selectedToken.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
            tooltip={selectedToken.locked ? 'Unlock' : 'Lock'}
            isActive={selectedToken.locked}
            activeClass="bg-amber-500/20 text-amber-500"
          />

          {/* Toggle visibility */}
          <TooltipButton
            onClick={onToggleVisibility}
            icon={selectedToken.visibleToPlayers ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            tooltip={selectedToken.visibleToPlayers ? 'Hide' : 'Show'}
            isActive={!selectedToken.visibleToPlayers}
            activeClass="bg-warning/20 text-warning"
          />

          {/* Delete */}
          <TooltipButton
            onClick={onDelete}
            icon={<Trash2 className="h-4 w-4" />}
            tooltip="Delete"
            hoverClass="hover:bg-destructive/10 hover:text-destructive"
          />
        </>
      )}
    </div>
  );
}

import { useState } from 'react';
import { Lock, Unlock, Eye, EyeOff, Trash2, MousePointer2, Hand, Type, Cable, CloudFog, Eraser, Plus, Minus, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import type { BoardToken, TextAlignment } from '@shared/schemas/tactical-board';

export type InteractionMode = 'select' | 'pan' | 'connect' | 'addFog' | 'clearFog';

interface FloatingToolbarProps {
  selectedToken: BoardToken | null;
  interactionMode: InteractionMode;
  onToggleLock: () => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
  onSetInteractionMode: (mode: InteractionMode) => void;
  onAddTextBox: () => void;
  onSetTextAlign?: (align: TextAlignment) => void;
  onSetFontSize?: (size: number) => void;
  brushSize?: number;
  onSetBrushSize?: (size: number) => void;
  gridEnabled?: boolean;
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
  onSetTextAlign,
  onSetFontSize,
  brushSize = 1,
  onSetBrushSize,
  gridEnabled = false,
}: FloatingToolbarProps) {
  const isFogMode = interactionMode === 'addFog' || interactionMode === 'clearFog';
  const isTextBox = selectedToken?.sourceType === 'text';
  const currentAlign = selectedToken?.textAlign || 'left';
  const currentFontSize = selectedToken?.fontSize || 14;

  // Cycle through alignments: left -> center -> right -> left
  const cycleAlignment = () => {
    if (!onSetTextAlign) return;
    const alignments: TextAlignment[] = ['left', 'center', 'right'];
    const currentIndex = alignments.indexOf(currentAlign);
    const nextIndex = (currentIndex + 1) % alignments.length;
    onSetTextAlign(alignments[nextIndex]);
  };

  // Get the appropriate alignment icon
  const getAlignIcon = () => {
    switch (currentAlign) {
      case 'center':
        return <AlignCenter className="h-4 w-4" />;
      case 'right':
        return <AlignRight className="h-4 w-4" />;
      default:
        return <AlignLeft className="h-4 w-4" />;
    }
  };
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

      {/* Fog Tools Section */}
      <div className="my-1 h-px bg-border" />

      {/* Add Fog */}
      <TooltipButton
        onClick={() => gridEnabled && onSetInteractionMode('addFog')}
        icon={<CloudFog className="h-4 w-4" />}
        tooltip={gridEnabled ? 'Add Fog' : 'Enable grid for fog'}
        isActive={interactionMode === 'addFog'}
        activeClass="bg-slate-500/20 text-slate-300"
        hoverClass={gridEnabled ? 'hover:bg-accent' : 'hover:bg-accent opacity-50 cursor-not-allowed'}
      />

      {/* Clear Fog */}
      <TooltipButton
        onClick={() => gridEnabled && onSetInteractionMode('clearFog')}
        icon={<Eraser className="h-4 w-4" />}
        tooltip={gridEnabled ? 'Clear Fog' : 'Enable grid for fog'}
        isActive={interactionMode === 'clearFog'}
        activeClass="bg-red-500/20 text-red-400"
        hoverClass={gridEnabled ? 'hover:bg-accent' : 'hover:bg-accent opacity-50 cursor-not-allowed'}
      />

      {/* Brush Size Controls - only show in fog modes */}
      {isFogMode && onSetBrushSize && (
        <div className="mt-1 flex flex-col items-center gap-0.5 border-t border-border pt-1">
          <button
            type="button"
            onClick={() => onSetBrushSize(Math.min(brushSize + 1, 5))}
            className="flex h-6 w-6 items-center justify-center rounded text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            title="Increase brush size"
          >
            <Plus className="h-3 w-3" />
          </button>
          <span className="text-xs font-medium text-foreground">{brushSize}</span>
          <button
            type="button"
            onClick={() => onSetBrushSize(Math.max(brushSize - 1, 1))}
            className="flex h-6 w-6 items-center justify-center rounded text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            title="Decrease brush size"
          >
            <Minus className="h-3 w-3" />
          </button>
        </div>
      )}

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

          {/* Text Box Controls - only show for text boxes */}
          {isTextBox && onSetTextAlign && onSetFontSize && (
            <>
              {/* Divider */}
              <div className="my-1 h-px bg-border" />

              {/* Text Alignment - cycles through left/center/right */}
              <TooltipButton
                onClick={cycleAlignment}
                icon={getAlignIcon()}
                tooltip={`Align: ${currentAlign}`}
              />

              {/* Font Size Controls */}
              <div className="flex flex-col items-center gap-0.5 border-t border-border pt-1 mt-1">
                <button
                  type="button"
                  onClick={() => onSetFontSize(Math.min(currentFontSize + 2, 48))}
                  className="flex h-6 w-6 items-center justify-center rounded text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                  title="Increase font size"
                >
                  <Plus className="h-3 w-3" />
                </button>
                <span className="text-xs font-medium text-foreground">{currentFontSize}</span>
                <button
                  type="button"
                  onClick={() => onSetFontSize(Math.max(currentFontSize - 2, 8))}
                  className="flex h-6 w-6 items-center justify-center rounded text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                  title="Decrease font size"
                >
                  <Minus className="h-3 w-3" />
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

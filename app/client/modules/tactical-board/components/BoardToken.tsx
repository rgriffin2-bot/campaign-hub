import { useRef, useState, useCallback, useEffect } from 'react';
import { User, Ship, MapPin, Skull, Circle, Type, Lock } from 'lucide-react';
import { useCampaign } from '../../../core/providers/CampaignProvider';
import type { BoardToken as BoardTokenType, TokenSourceType } from '@shared/schemas/tactical-board';

interface BoardTokenProps {
  token: BoardTokenType;
  isSelected: boolean;
  isEditable: boolean;
  scale: number; // Current zoom scale of the canvas
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (size: number) => void;
}

// Get the appropriate icon for a token's source type
function getSourceIcon(sourceType: TokenSourceType) {
  switch (sourceType) {
    case 'pc':
      return User;
    case 'npc':
      return Skull;
    case 'ship':
      return Ship;
    case 'location':
      return MapPin;
    case 'text':
      return Type;
    case 'custom':
    default:
      return Circle;
  }
}

export function BoardToken({
  token,
  isSelected,
  isEditable,
  scale,
  onSelect,
  onMove,
  onResize,
}: BoardTokenProps) {
  const { campaign } = useCampaign();
  const tokenRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; tokenX: number; tokenY: number } | null>(null);
  const resizeStartRef = useRef<{ mouseX: number; size: number } | null>(null);

  // Build image URL
  const imageUrl = token.image && campaign
    ? `/api/campaigns/${campaign.id}/assets/${token.image.replace('assets/', '')}`
    : null;

  const Icon = getSourceIcon(token.sourceType);

  // Check if token can be moved (editable and not locked)
  const canMove = isEditable && !token.locked;

  // Handle drag start
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!isEditable) return;
      if ((e.target as HTMLElement).classList.contains('resize-handle')) return;

      e.preventDefault();
      e.stopPropagation();
      onSelect();

      // Don't start dragging if token is locked
      if (token.locked) return;

      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        tokenX: token.x,
        tokenY: token.y,
      };
    },
    [isEditable, onSelect, token.x, token.y, token.locked]
  );

  // Handle drag move
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging && dragStartRef.current) {
        const dx = (e.clientX - dragStartRef.current.x) / scale;
        const dy = (e.clientY - dragStartRef.current.y) / scale;
        onMove(
          Math.round(dragStartRef.current.tokenX + dx),
          Math.round(dragStartRef.current.tokenY + dy)
        );
      }
      if (isResizing && resizeStartRef.current) {
        const dx = (e.clientX - resizeStartRef.current.mouseX) / scale;
        const newSize = Math.max(20, Math.min(400, resizeStartRef.current.size + dx * 2));
        onResize(Math.round(newSize));
      }
    },
    [isDragging, isResizing, scale, onMove, onResize]
  );

  // Handle drag end
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    dragStartRef.current = null;
    resizeStartRef.current = null;
  }, []);

  // Add/remove global mouse listeners
  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  // Handle resize start
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      if (!isEditable || token.locked) return;
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      resizeStartRef.current = {
        mouseX: e.clientX,
        size: token.size,
      };
    },
    [isEditable, token.size, token.locked]
  );

  // Calculate image position
  const imagePosition = token.imagePosition || { x: 0, y: 0, scale: 1 };

  // Text box tokens render differently - scale based on size (default 80 = 1x scale)
  if (token.sourceType === 'text') {
    // Calculate scale factor based on token size (80 is baseline = 1x)
    const textScale = token.size / 80;
    const baseFontSize = token.fontSize || 14;
    const scaledFontSize = baseFontSize * textScale;
    const scaledPaddingX = 12 * textScale; // px-3 = 12px
    const scaledPaddingY = 6 * textScale;  // py-1.5 = 6px
    const scaledBorderRadius = 6 * textScale; // rounded-md ~ 6px
    const scaledLockSize = 12 * textScale; // h-3 w-3 = 12px

    return (
      <div
        ref={tokenRef}
        className={`absolute select-none ${canMove ? 'cursor-grab' : 'cursor-default'} ${isDragging ? 'cursor-grabbing' : ''}`}
        style={{
          left: token.x,
          top: token.y,
          transform: 'translate(-50%, -50%)',
          zIndex: token.zIndex || 0,
        }}
        onMouseDown={handleMouseDown}
      >
        {/* Text box */}
        <div
          className={`relative whitespace-nowrap border-2 transition-shadow ${
            isSelected
              ? 'border-primary shadow-lg shadow-primary/30'
              : token.locked
                ? 'border-amber-500/50 border-dashed'
                : 'border-white/30 hover:border-white/50'
          } ${!token.visibleToPlayers ? 'opacity-60' : ''}`}
          style={{
            backgroundColor: token.backgroundColor || 'rgba(0, 0, 0, 0.75)',
            color: token.textColor || '#ffffff',
            fontSize: scaledFontSize,
            padding: `${scaledPaddingY}px ${scaledPaddingX}px`,
            borderRadius: scaledBorderRadius,
          }}
        >
          <span className="font-medium">{token.label}</span>

          {/* Lock indicator */}
          {token.locked && (
            <Lock
              className="ml-1.5 inline-block text-amber-500"
              style={{ width: scaledLockSize, height: scaledLockSize, marginLeft: 6 * textScale }}
            />
          )}

          {/* Hidden indicator */}
          {!token.visibleToPlayers && (
            <span
              className="text-white/60"
              style={{ marginLeft: 8 * textScale, fontSize: scaledFontSize * 0.75 }}
            >
              (hidden)
            </span>
          )}
        </div>

        {/* Resize handle (only when selected, editable, and not locked) */}
        {isSelected && isEditable && !token.locked && (
          <div
            className="resize-handle absolute -bottom-1 -right-1 h-4 w-4 cursor-se-resize rounded-full border-2 border-primary bg-background"
            onMouseDown={handleResizeStart}
          />
        )}
      </div>
    );
  }

  // Regular token rendering
  return (
    <div
      ref={tokenRef}
      className={`absolute select-none ${canMove ? 'cursor-grab' : 'cursor-default'} ${isDragging ? 'cursor-grabbing' : ''}`}
      style={{
        left: token.x,
        top: token.y,
        width: token.size,
        height: token.size,
        transform: `translate(-50%, -50%) rotate(${token.rotation || 0}deg)`,
        zIndex: token.zIndex || 0,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Token shape */}
      <div
        className={`relative h-full w-full overflow-hidden border-2 transition-shadow ${
          token.shape === 'circle' ? 'rounded-full' : 'rounded-md'
        } ${
          isSelected
            ? 'border-primary shadow-lg shadow-primary/30'
            : token.locked
              ? 'border-amber-500/50 border-dashed'
              : 'border-white/50 hover:border-white/80'
        } ${!token.visibleToPlayers ? 'opacity-60' : ''}`}
        style={{ backgroundColor: '#1a1a2e' }}
      >
        {/* Image or icon */}
        {imageUrl ? (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${imageUrl})`,
              backgroundSize: `${100 * imagePosition.scale}%`,
              backgroundPosition: `${50 + imagePosition.x}% ${50 + imagePosition.y}%`,
              backgroundRepeat: 'no-repeat',
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-secondary">
            <Icon className="h-1/2 w-1/2 text-muted-foreground" />
          </div>
        )}

        {/* Lock indicator overlay */}
        {token.locked && (
          <div className="absolute bottom-0.5 right-0.5 rounded-full bg-amber-500/80 p-0.5">
            <Lock className="h-3 w-3 text-white" />
          </div>
        )}

        {/* Hidden indicator */}
        {!token.visibleToPlayers && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="text-xs font-medium text-white/80">Hidden</span>
          </div>
        )}
      </div>

      {/* Label */}
      {token.showLabel && token.labelPosition !== 'hidden' && (
        <div
          className={`absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/70 px-1.5 py-0.5 text-xs font-medium text-white ${
            token.labelPosition === 'above' ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
          style={{
            transform: `translateX(-50%) rotate(${-(token.rotation || 0)}deg)`,
          }}
        >
          {token.label}
        </div>
      )}

      {/* Resize handle (only when selected, editable, and not locked) */}
      {isSelected && isEditable && !token.locked && (
        <div
          className="resize-handle absolute -bottom-1 -right-1 h-4 w-4 cursor-se-resize rounded-full border-2 border-primary bg-background"
          onMouseDown={handleResizeStart}
        />
      )}
    </div>
  );
}

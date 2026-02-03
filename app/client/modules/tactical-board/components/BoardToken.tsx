import { useRef, useState, useCallback, useEffect, memo } from 'react';
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
  onUpdateLabel?: (label: string) => void;
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

export const BoardToken = memo(function BoardToken({
  token,
  isSelected,
  isEditable,
  scale,
  onSelect,
  onMove,
  onResize,
  onUpdateLabel,
}: BoardTokenProps) {
  const { campaign } = useCampaign();
  const tokenRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(token.label);
  // Local position during drag - prevents server calls on every mouse move
  const [localPosition, setLocalPosition] = useState<{ x: number; y: number } | null>(null);
  const [localSize, setLocalSize] = useState<number | null>(null);
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

  // Handle drag move - use local state during drag for smooth performance
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging && dragStartRef.current) {
        const dx = (e.clientX - dragStartRef.current.x) / scale;
        const dy = (e.clientY - dragStartRef.current.y) / scale;
        // Update local position only (no server call)
        setLocalPosition({
          x: Math.round(dragStartRef.current.tokenX + dx),
          y: Math.round(dragStartRef.current.tokenY + dy),
        });
      }
      if (isResizing && resizeStartRef.current) {
        const dx = (e.clientX - resizeStartRef.current.mouseX) / scale;
        const newSize = Math.max(20, Math.min(400, resizeStartRef.current.size + dx * 2));
        // Update local size only (no server call)
        setLocalSize(Math.round(newSize));
      }
    },
    [isDragging, isResizing, scale]
  );

  // Handle drag end - sync to server only on drop
  const handleMouseUp = useCallback(() => {
    // Sync final position/size to server
    if (isDragging && localPosition) {
      onMove(localPosition.x, localPosition.y);
    }
    if (isResizing && localSize !== null) {
      onResize(localSize);
    }
    // Reset local state
    setIsDragging(false);
    setIsResizing(false);
    setLocalPosition(null);
    setLocalSize(null);
    dragStartRef.current = null;
    resizeStartRef.current = null;
  }, [isDragging, isResizing, localPosition, localSize, onMove, onResize]);

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

  // Handle double-click to edit text (for text box tokens)
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!isEditable || token.locked || token.sourceType !== 'text') return;
      e.preventDefault();
      e.stopPropagation();
      setEditText(token.label);
      setIsEditing(true);
      // Focus input after it renders
      setTimeout(() => inputRef.current?.focus(), 0);
    },
    [isEditable, token.locked, token.sourceType, token.label]
  );

  // Handle saving edited text
  const handleSaveEdit = useCallback(() => {
    if (onUpdateLabel && editText.trim() !== token.label) {
      onUpdateLabel(editText.trim() || 'Text');
    }
    setIsEditing(false);
  }, [editText, token.label, onUpdateLabel]);

  // Handle key down in edit mode
  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSaveEdit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setEditText(token.label);
        setIsEditing(false);
      }
    },
    [handleSaveEdit, token.label]
  );

  // Calculate image position
  const imagePosition = token.imagePosition || { x: 0, y: 0, scale: 1 };

  // Use local position during drag, otherwise use token position
  const displayX = localPosition?.x ?? token.x;
  const displayY = localPosition?.y ?? token.y;
  const displaySize = localSize ?? token.size;

  // Text box tokens render differently - scale based on size (default 80 = 1x scale)
  if (token.sourceType === 'text') {
    // Calculate scale factor based on token size (80 is baseline = 1x)
    const textScale = displaySize / 80;
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
          left: displayX,
          top: displayY,
          transform: 'translate(-50%, -50%)',
          zIndex: token.zIndex || 0,
        }}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
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
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={handleEditKeyDown}
              className="bg-transparent font-medium outline-none"
              style={{
                color: token.textColor || '#ffffff',
                fontSize: scaledFontSize,
                minWidth: '40px',
                width: `${Math.max(40, editText.length * scaledFontSize * 0.6)}px`,
              }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="font-medium">{token.label}</span>
          )}

          {/* Lock indicator */}
          {token.locked && !isEditing && (
            <Lock
              className="ml-1.5 inline-block text-amber-500"
              style={{ width: scaledLockSize, height: scaledLockSize, marginLeft: 6 * textScale }}
            />
          )}

          {/* Hidden indicator */}
          {!token.visibleToPlayers && !isEditing && (
            <span
              className="text-white/60"
              style={{ marginLeft: 8 * textScale, fontSize: scaledFontSize * 0.75 }}
            >
              (hidden)
            </span>
          )}
        </div>

        {/* Resize handle (only when selected, editable, and not locked) */}
        {isSelected && isEditable && !token.locked && !isEditing && (
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
        left: displayX,
        top: displayY,
        width: displaySize,
        height: displaySize,
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
});

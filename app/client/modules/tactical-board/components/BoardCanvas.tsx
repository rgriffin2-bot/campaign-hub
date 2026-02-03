import { useRef, useState, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useCampaign } from '../../../core/providers/CampaignProvider';
import { BoardToken } from './BoardToken';
import { Minimap } from './Minimap';
import { FloatingToolbar, InteractionMode } from './FloatingToolbar';
import type { TacticalBoard, BoardToken as BoardTokenType } from '@shared/schemas/tactical-board';

interface BoardCanvasProps {
  board: TacticalBoard;
  isEditable: boolean;
  selectedTokenId: string | null;
  onSelectToken: (tokenId: string | null) => void;
  onUpdateToken: (tokenId: string, updates: Partial<BoardTokenType>) => void;
  onAddToken?: (x: number, y: number) => void;
  onAddTextBox?: (x: number, y: number) => void;
  onToggleTokenLock?: () => void;
  onToggleTokenVisibility?: () => void;
  onDeleteToken?: () => void;
}

export interface BoardCanvasRef {
  getViewportCenter: () => { x: number; y: number };
}

export const BoardCanvas = forwardRef<BoardCanvasRef, BoardCanvasProps>(function BoardCanvas(
  {
    board,
    isEditable,
    selectedTokenId,
    onSelectToken,
    onUpdateToken,
    onAddToken,
    onAddTextBox,
    onToggleTokenLock,
    onToggleTokenVisibility,
    onDeleteToken,
  },
  ref
) {
  const { campaign } = useCampaign();
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('select');
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  // Track container size for minimap
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Expose getViewportCenter method via ref
  useImperativeHandle(ref, () => ({
    getViewportCenter: () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: board.canvasWidth / 2, y: board.canvasHeight / 2 };
      const centerX = (rect.width / 2 - pan.x) / zoom;
      const centerY = (rect.height / 2 - pan.y) / zoom;
      return { x: centerX, y: centerY };
    },
  }), [pan, zoom, board.canvasWidth, board.canvasHeight]);

  // Build background image URL
  const backgroundUrl = board.background && campaign
    ? `/api/campaigns/${campaign.id}/assets/${board.background.replace('assets/', '')}`
    : null;

  // Center the canvas initially
  useEffect(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      const centerX = (container.clientWidth - board.canvasWidth * zoom) / 2;
      const centerY = (container.clientHeight - board.canvasHeight * zoom) / 2;
      setPan({ x: centerX, y: centerY });
    }
  }, []); // Only on mount

  // Handle wheel zoom - keeps the viewport center stable while zooming
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      // Use a smaller base delta and scale by actual scroll amount for smooth trackpad support
      const scrollAmount = Math.abs(e.deltaY);
      const sensitivity = scrollAmount > 50 ? 0.05 : 0.02;
      const delta = e.deltaY > 0 ? -sensitivity : sensitivity;
      const newZoom = Math.max(0.1, Math.min(3, zoom + delta));

      // Get viewport center in screen coords
      const viewportCenterX = rect.width / 2;
      const viewportCenterY = rect.height / 2;

      // Convert to canvas coords at current zoom
      const canvasCenterX = (viewportCenterX - pan.x) / zoom;
      const canvasCenterY = (viewportCenterY - pan.y) / zoom;

      // Calculate new pan to keep that canvas point at viewport center
      const newPanX = viewportCenterX - canvasCenterX * newZoom;
      const newPanY = viewportCenterY - canvasCenterY * newZoom;

      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    },
    [zoom, pan]
  );

  // Handle pan start (mouse down on canvas background)
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      const isCanvasBackground =
        target === e.currentTarget ||
        target.classList.contains('canvas-grid') ||
        target.classList.contains('canvas-background') ||
        target.closest('[data-canvas-content]') === target;

      // In pan mode, always pan when clicking on canvas
      // In select mode, only pan when clicking on background
      if (interactionMode === 'pan' || isCanvasBackground) {
        e.preventDefault();

        // In select mode, deselect when clicking background
        if (interactionMode === 'select' && isCanvasBackground) {
          onSelectToken(null);
        }

        setIsPanning(true);
        panStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          panX: pan.x,
          panY: pan.y,
        };
      }
    },
    [pan, onSelectToken, interactionMode]
  );

  // Handle pan move
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isPanning && panStartRef.current) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        setPan({
          x: panStartRef.current.panX + dx,
          y: panStartRef.current.panY + dy,
        });
      }
    },
    [isPanning]
  );

  // Handle pan end
  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    panStartRef.current = null;
  }, []);

  // Add/remove global mouse listeners for panning
  useEffect(() => {
    if (isPanning) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isPanning, handleMouseMove, handleMouseUp]);

  // Handle double-click to add token
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!isEditable || !onAddToken || interactionMode !== 'select') return;
      if (e.target !== e.currentTarget && !(e.target as HTMLElement).classList.contains('canvas-grid')) return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      // Convert screen coordinates to canvas coordinates
      const x = (e.clientX - rect.left - pan.x) / zoom;
      const y = (e.clientY - rect.top - pan.y) / zoom;

      // Snap to grid if enabled
      let finalX = x;
      let finalY = y;
      if (board.snapToGrid && board.gridSize) {
        finalX = Math.round(x / board.gridSize) * board.gridSize;
        finalY = Math.round(y / board.gridSize) * board.gridSize;
      }

      onAddToken(finalX, finalY);
    },
    [isEditable, onAddToken, pan, zoom, board.snapToGrid, board.gridSize, interactionMode]
  );

  // Handle adding text box from toolbar
  const handleAddTextBox = useCallback(() => {
    if (!onAddTextBox) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Add at viewport center
    const centerX = (rect.width / 2 - pan.x) / zoom;
    const centerY = (rect.height / 2 - pan.y) / zoom;

    onAddTextBox(centerX, centerY);
  }, [onAddTextBox, pan, zoom]);

  // Handle token move
  const handleTokenMove = useCallback(
    (tokenId: string, x: number, y: number) => {
      // Don't allow token movement in pan mode
      if (interactionMode === 'pan') return;

      let finalX = x;
      let finalY = y;

      // Snap to grid if enabled
      if (board.snapToGrid && board.gridSize) {
        finalX = Math.round(x / board.gridSize) * board.gridSize;
        finalY = Math.round(y / board.gridSize) * board.gridSize;
      }

      onUpdateToken(tokenId, { x: finalX, y: finalY });
    },
    [board.snapToGrid, board.gridSize, onUpdateToken, interactionMode]
  );

  // Handle token resize
  const handleTokenResize = useCallback(
    (tokenId: string, size: number) => {
      onUpdateToken(tokenId, { size });
    },
    [onUpdateToken]
  );

  // Handle minimap navigation - center viewport on the clicked canvas position
  const handleMinimapNavigate = useCallback(
    (canvasX: number, canvasY: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      // Calculate new pan to center the clicked canvas point in viewport
      const newPanX = rect.width / 2 - canvasX * zoom;
      const newPanY = rect.height / 2 - canvasY * zoom;
      setPan({ x: newPanX, y: newPanY });
    },
    [zoom]
  );

  // Generate grid pattern
  const gridSize = board.gridSize || 50;
  const gridPatternId = `grid-${board.id}`;

  // Visible tokens (for players, filter hidden tokens)
  const visibleTokens = board.tokens;

  // Determine cursor based on interaction mode
  const getCursor = () => {
    if (isPanning) return 'grabbing';
    if (interactionMode === 'pan') return 'grab';
    return 'default';
  };

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-neutral-900"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      style={{ cursor: getCursor() }}
    >
      {/* Canvas content with pan/zoom transforms */}
      <div
        data-canvas-content
        className="absolute origin-top-left"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          width: board.canvasWidth,
          height: board.canvasHeight,
        }}
      >
        {/* Background image */}
        {backgroundUrl && (
          <div
            className="canvas-background absolute inset-0"
            style={{
              backgroundImage: `url(${backgroundUrl})`,
              backgroundSize: `${100 * (board.backgroundScale || 1)}%`,
              backgroundPosition: `${board.backgroundX || 0}px ${board.backgroundY || 0}px`,
              backgroundRepeat: 'no-repeat',
            }}
          />
        )}

        {/* Default background if no image */}
        {!backgroundUrl && (
          <div className="canvas-background absolute inset-0 bg-neutral-800" />
        )}

        {/* Grid overlay */}
        {board.gridEnabled && (
          <svg className="canvas-grid pointer-events-none absolute inset-0 h-full w-full">
            <defs>
              <pattern
                id={gridPatternId}
                width={gridSize}
                height={gridSize}
                patternUnits="userSpaceOnUse"
              >
                <path
                  d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
                  fill="none"
                  stroke={board.gridColor || 'rgba(255, 255, 255, 0.2)'}
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#${gridPatternId})`} />
          </svg>
        )}

        {/* Tokens */}
        {visibleTokens.map((token) => (
          <BoardToken
            key={token.id}
            token={token}
            isSelected={selectedTokenId === token.id}
            isEditable={isEditable && interactionMode === 'select'}
            scale={zoom}
            onSelect={() => interactionMode === 'select' && onSelectToken(token.id)}
            onMove={(x, y) => handleTokenMove(token.id, x, y)}
            onResize={(size) => handleTokenResize(token.id, size)}
          />
        ))}
      </div>

      {/* Floating Toolbar - always visible in edit mode */}
      {isEditable && onToggleTokenLock && onToggleTokenVisibility && onDeleteToken && (
        <FloatingToolbar
          selectedToken={selectedTokenId ? visibleTokens.find((t) => t.id === selectedTokenId) || null : null}
          interactionMode={interactionMode}
          onToggleLock={onToggleTokenLock}
          onToggleVisibility={onToggleTokenVisibility}
          onDelete={onDeleteToken}
          onSetInteractionMode={setInteractionMode}
          onAddTextBox={handleAddTextBox}
        />
      )}

      {/* Minimap */}
      <Minimap
        board={board}
        pan={pan}
        zoom={zoom}
        containerWidth={containerSize.width}
        containerHeight={containerSize.height}
        onNavigate={handleMinimapNavigate}
      />

      {/* Zoom indicator */}
      <div className="absolute bottom-4 right-44 rounded bg-black/50 px-2 py-1 text-xs text-white">
        {Math.round(zoom * 100)}%
      </div>

      {/* Instructions hint */}
      {isEditable && (
        <div className="absolute bottom-4 left-4 rounded bg-black/50 px-2 py-1 text-xs text-white/70">
          {interactionMode === 'pan'
            ? 'Drag to pan | Scroll to zoom'
            : 'Click to select | Drag to pan | Scroll to zoom'
          }
        </div>
      )}
    </div>
  );
});

// Export zoom controls as separate component for toolbar
export function useCanvasControls(
  setZoom: React.Dispatch<React.SetStateAction<number>>,
  setPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>
) {
  const zoomIn = useCallback(() => {
    setZoom((prev) => Math.min(3, prev + 0.1));
  }, [setZoom]);

  const zoomOut = useCallback(() => {
    setZoom((prev) => Math.max(0.1, prev - 0.1));
  }, [setZoom]);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [setZoom, setPan]);

  return { zoomIn, zoomOut, resetView };
}

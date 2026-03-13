/**
 * BoardCanvas.tsx
 *
 * Main canvas for the tactical board. Handles zoom/pan, token placement,
 * fog-of-war painting, connection drawing, and minimap navigation.
 * All coordinates go through screen-to-canvas transforms that account
 * for the current pan offset and zoom level.
 */
import { useRef, useState, useCallback, useEffect, forwardRef, useImperativeHandle, memo } from 'react';
import { useCampaign } from '../../../core/providers/CampaignProvider';
import { BoardToken } from './BoardToken';
import { BoardConnections } from './BoardConnections';
import { FogLayer } from './FogLayer';
import { Minimap } from './Minimap';
import { FloatingToolbar, InteractionMode } from './FloatingToolbar';
import type { TacticalBoard, BoardToken as BoardTokenType, TextAlignment } from '@shared/schemas/tactical-board';

// ─── TokenWrapper ─────────────────────────────────────────────────
// Wraps each BoardToken with stable memoized callbacks keyed by token.id.
// This prevents all tokens from re-rendering when only one token changes.
interface TokenWrapperProps {
  token: BoardTokenType;
  isSelected: boolean;
  isEditable: boolean;
  scale: number;
  interactionMode: InteractionMode;
  connectionStart: string | null;
  onSelectToken: (tokenId: string) => void;
  onTokenMove: (tokenId: string, x: number, y: number) => void;
  onTokenResize: (tokenId: string, size: number) => void;
  onTokenResizeDimensions: (tokenId: string, width: number, height: number) => void;
  onUpdateToken: (tokenId: string, updates: Partial<BoardTokenType>) => void;
  onTokenClickForConnection: (tokenId: string) => void;
}

const TokenWrapper = memo(function TokenWrapper({
  token,
  isSelected,
  isEditable,
  scale,
  interactionMode,
  connectionStart,
  onSelectToken,
  onTokenMove,
  onTokenResize,
  onTokenResizeDimensions,
  onUpdateToken,
  onTokenClickForConnection,
}: TokenWrapperProps) {
  // Highlight tokens that are valid connection targets or the connection origin
  const isConnectionTarget = interactionMode === 'connect' && connectionStart && connectionStart !== token.id;
  const isConnectionStart = connectionStart === token.id;

  // Create stable callbacks using useCallback with token.id in closure
  const handleSelect = useCallback(() => {
    if (interactionMode === 'select') {
      onSelectToken(token.id);
    } else if (interactionMode === 'connect') {
      onTokenClickForConnection(token.id);
    }
  }, [interactionMode, onSelectToken, onTokenClickForConnection, token.id]);

  const handleMove = useCallback((x: number, y: number) => {
    onTokenMove(token.id, x, y);
  }, [onTokenMove, token.id]);

  const handleResize = useCallback((size: number) => {
    onTokenResize(token.id, size);
  }, [onTokenResize, token.id]);

  const handleResizeDimensions = useCallback((width: number, height: number) => {
    onTokenResizeDimensions(token.id, width, height);
  }, [onTokenResizeDimensions, token.id]);

  const handleUpdateLabel = useCallback((label: string) => {
    onUpdateToken(token.id, { label });
  }, [onUpdateToken, token.id]);

  const handleWrapperClick = useCallback(() => {
    if (interactionMode === 'connect') {
      onTokenClickForConnection(token.id);
    }
  }, [interactionMode, onTokenClickForConnection, token.id]);

  return (
    <div
      onClick={handleWrapperClick}
      className={`${isConnectionTarget ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-transparent rounded-full' : ''} ${isConnectionStart ? 'ring-2 ring-cyan-400 animate-pulse rounded-full' : ''}`}
      style={{ display: 'contents' }}
    >
      <BoardToken
        token={token}
        isSelected={isSelected || isConnectionStart}
        isEditable={isEditable && interactionMode === 'select'}
        scale={scale}
        onSelect={handleSelect}
        onMove={handleMove}
        onResize={handleResize}
        onResizeDimensions={handleResizeDimensions}
        onUpdateLabel={handleUpdateLabel}
      />
    </div>
  );
});

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
  onAddConnection?: (fromTokenId: string, toTokenId: string) => void;
  onDeleteConnection?: (connectionId: string) => void;
  onUpdateConnection?: (connectionId: string, updates: Partial<import('@shared/schemas/tactical-board').BoardConnection>) => void;
  onUpdateFog?: (fogCells: string[]) => void;
  isPlayerView?: boolean;
}

// ─── BoardCanvas ──────────────────────────────────────────────────

/** Ref handle that lets parent components query the current viewport center */
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
    onAddConnection,
    onDeleteConnection,
    onUpdateConnection,
    onUpdateFog,
    isPlayerView = false,
  },
  ref
) {
  const { campaign } = useCampaign();
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Viewport state ──
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // ── Interaction mode state ──
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('select');
  const [connectionStart, setConnectionStart] = useState<string | null>(null); // Token ID being connected from
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  // ── Fog painting state ──
  const [brushSize, setBrushSize] = useState(1);
  const [isPainting, setIsPainting] = useState(false);
  const [brushPreviewCells, setBrushPreviewCells] = useState<Set<string> | null>(null);
  const lastPaintedCellsRef = useRef<Set<string>>(new Set());

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

  // ── Zoom ──
  // Zooms toward the viewport center so the user's focal point stays stable.
  // Trackpad scrolls produce smaller deltas than mouse wheels, so sensitivity
  // is adjusted based on the raw scroll amount.
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      // Smaller sensitivity for fine-grained trackpad scrolling
      const scrollAmount = Math.abs(e.deltaY);
      const sensitivity = scrollAmount > 50 ? 0.05 : 0.02;
      const delta = e.deltaY > 0 ? -sensitivity : sensitivity;
      const newZoom = Math.max(0.1, Math.min(3, zoom + delta));

      // Convert viewport center from screen coords -> canvas coords -> new screen coords
      const viewportCenterX = rect.width / 2;
      const viewportCenterY = rect.height / 2;
      const canvasCenterX = (viewportCenterX - pan.x) / zoom;
      const canvasCenterY = (viewportCenterY - pan.y) / zoom;
      const newPanX = viewportCenterX - canvasCenterX * newZoom;
      const newPanY = viewportCenterY - canvasCenterY * newZoom;

      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    },
    [zoom, pan]
  );

  // ── Panning ──
  // Panning is initiated on mouse-down over the canvas background.
  // Fog painting is handled via a separate handler to avoid circular deps.
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Fog painting is handled separately via handleCanvasMouseDown
      if (interactionMode === 'addFog' || interactionMode === 'clearFog') {
        return; // Let the fog handler in the div's onMouseDown handle it
      }

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

  // ── Token creation ──
  // Double-clicking on the canvas background creates a new token at that point.
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

  // ── Token transform callbacks ──
  // Move handler with optional snap-to-grid quantization
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

  // Handle token dimension resize (for text boxes)
  const handleTokenResizeDimensions = useCallback(
    (tokenId: string, width: number, height: number) => {
      onUpdateToken(tokenId, { width, height });
    },
    [onUpdateToken]
  );

  // Handle text alignment change (for text boxes)
  const handleSetTextAlign = useCallback(
    (align: TextAlignment) => {
      if (selectedTokenId) {
        onUpdateToken(selectedTokenId, { textAlign: align });
      }
    },
    [selectedTokenId, onUpdateToken]
  );

  // Handle font size change (for text boxes)
  const handleSetFontSize = useCallback(
    (fontSize: number) => {
      if (selectedTokenId) {
        onUpdateToken(selectedTokenId, { fontSize });
      }
    },
    [selectedTokenId, onUpdateToken]
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

  // ── Connection mode ──
  // Two-click workflow: first click sets the source token, second click
  // on a different token creates the connection. Clicking the same token cancels.
  const handleTokenClickForConnection = useCallback(
    (tokenId: string) => {
      if (interactionMode !== 'connect' || !onAddConnection) return;

      if (!connectionStart) {
        // First click - set the start token
        setConnectionStart(tokenId);
      } else if (connectionStart !== tokenId) {
        // Second click on different token - create connection
        onAddConnection(connectionStart, tokenId);
        setConnectionStart(null);
      }
      // Clicking same token cancels
      else {
        setConnectionStart(null);
      }
    },
    [interactionMode, connectionStart, onAddConnection]
  );

  // Handle deleting selected connection
  const handleDeleteSelectedConnection = useCallback(() => {
    if (selectedConnectionId && onDeleteConnection) {
      onDeleteConnection(selectedConnectionId);
      setSelectedConnectionId(null);
    }
  }, [selectedConnectionId, onDeleteConnection]);

  // Reset connection start when switching modes
  useEffect(() => {
    if (interactionMode !== 'connect') {
      setConnectionStart(null);
    }
  }, [interactionMode]);

  // ── Fog-of-war painting ──
  // Converts a screen-space mouse position into the set of grid cells
  // covered by the current brush (brushSize x brushSize square).
  const getAffectedCells = useCallback(
    (clientX: number, clientY: number): Set<string> => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || !board.gridSize) return new Set();

      // Convert to canvas coordinates
      const canvasX = (clientX - rect.left - pan.x) / zoom;
      const canvasY = (clientY - rect.top - pan.y) / zoom;

      // Convert to grid cell
      const gridX = Math.floor(canvasX / board.gridSize);
      const gridY = Math.floor(canvasY / board.gridSize);

      // Get all cells in brush area (brushSize x brushSize centered on cursor)
      const cells = new Set<string>();
      const halfBrush = Math.floor(brushSize / 2);

      for (let dx = -halfBrush; dx <= halfBrush; dx++) {
        for (let dy = -halfBrush; dy <= halfBrush; dy++) {
          const cellX = gridX + dx;
          const cellY = gridY + dy;
          // Only add if within canvas bounds
          const maxGridX = Math.ceil(board.canvasWidth / board.gridSize);
          const maxGridY = Math.ceil(board.canvasHeight / board.gridSize);
          if (cellX >= 0 && cellY >= 0 && cellX < maxGridX && cellY < maxGridY) {
            cells.add(`${cellX},${cellY}`);
          }
        }
      }
      return cells;
    },
    [pan, zoom, board.gridSize, board.canvasWidth, board.canvasHeight, brushSize]
  );

  // Merge painted cells into (or remove from) the fog set and push upstream
  const applyFogChange = useCallback(
    (cells: Set<string>, isAdding: boolean) => {
      if (!onUpdateFog) return;

      const currentFog = new Set(board.fogCells || []);

      cells.forEach((cell) => {
        if (isAdding) {
          currentFog.add(cell);
        } else {
          currentFog.delete(cell);
        }
      });

      onUpdateFog(Array.from(currentFog));
    },
    [board.fogCells, onUpdateFog]
  );

  // Handle fog painting mouse down
  const handleFogMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (interactionMode !== 'addFog' && interactionMode !== 'clearFog') return;
      if (!board.gridEnabled) return;

      e.preventDefault();
      e.stopPropagation();
      setIsPainting(true);

      const cells = getAffectedCells(e.clientX, e.clientY);
      lastPaintedCellsRef.current = cells;
      applyFogChange(cells, interactionMode === 'addFog');
    },
    [interactionMode, board.gridEnabled, getAffectedCells, applyFogChange]
  );

  // While painting, continuously update the brush preview and apply fog changes.
  // Only new cells (not already painted this stroke) trigger a fog update to
  // avoid redundant state writes.
  const handleFogMouseMove = useCallback(
    (e: MouseEvent) => {
      if (interactionMode !== 'addFog' && interactionMode !== 'clearFog') {
        setBrushPreviewCells(null);
        return;
      }

      const cells = getAffectedCells(e.clientX, e.clientY);
      setBrushPreviewCells(cells);

      if (isPainting) {
        const newCells = new Set<string>();
        cells.forEach((cell) => {
          if (!lastPaintedCellsRef.current.has(cell)) {
            newCells.add(cell);
          }
        });
        if (newCells.size > 0) {
          applyFogChange(newCells, interactionMode === 'addFog');
          cells.forEach((cell) => lastPaintedCellsRef.current.add(cell));
        }
      }
    },
    [interactionMode, isPainting, getAffectedCells, applyFogChange]
  );

  // Handle fog painting mouse up
  const handleFogMouseUp = useCallback(() => {
    setIsPainting(false);
    lastPaintedCellsRef.current = new Set();
  }, []);

  // Add/remove global mouse listeners for fog painting
  useEffect(() => {
    if (interactionMode === 'addFog' || interactionMode === 'clearFog') {
      window.addEventListener('mousemove', handleFogMouseMove);
      window.addEventListener('mouseup', handleFogMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleFogMouseMove);
        window.removeEventListener('mouseup', handleFogMouseUp);
      };
    } else {
      setBrushPreviewCells(null);
    }
  }, [interactionMode, handleFogMouseMove, handleFogMouseUp]);

  // ── Derived values for rendering ──
  const gridSize = board.gridSize || 50;
  const gridPatternId = `grid-${board.id}`;
  const visibleTokens = board.tokens;
  const connections = board.connections || [];

  // Map interaction mode to the appropriate CSS cursor
  const getCursor = () => {
    if (isPanning) return 'grabbing';
    if (interactionMode === 'pan') return 'grab';
    if (interactionMode === 'connect') return connectionStart ? 'crosshair' : 'cell';
    if (interactionMode === 'addFog' || interactionMode === 'clearFog') return 'crosshair';
    return 'default';
  };

  // Dispatches mouse-down to either the fog painter or the pan handler
  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Handle fog painting modes
      if (interactionMode === 'addFog' || interactionMode === 'clearFog') {
        handleFogMouseDown(e);
        return;
      }
      // Otherwise handle normal interactions
      handleMouseDown(e);
    },
    [interactionMode, handleFogMouseDown, handleMouseDown]
  );

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-neutral-900"
      onWheel={handleWheel}
      onMouseDown={handleCanvasMouseDown}
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

        {/* Connections (rendered behind tokens) */}
        <BoardConnections
          connections={connections}
          tokens={visibleTokens}
          selectedConnectionId={selectedConnectionId}
          onSelectConnection={setSelectedConnectionId}
          animationsEnabled={board.animationsEnabled ?? true}
        />

        {/* Tokens */}
        {visibleTokens.map((token) => (
          <TokenWrapper
            key={token.id}
            token={token}
            isSelected={selectedTokenId === token.id}
            isEditable={isEditable}
            scale={zoom}
            interactionMode={interactionMode}
            connectionStart={connectionStart}
            onSelectToken={onSelectToken}
            onTokenMove={handleTokenMove}
            onTokenResize={handleTokenResize}
            onTokenResizeDimensions={handleTokenResizeDimensions}
            onUpdateToken={onUpdateToken}
            onTokenClickForConnection={handleTokenClickForConnection}
          />
        ))}

        {/* Fog Layer - renders above tokens */}
        {board.gridEnabled && (
          <FogLayer
            fogCells={board.fogCells || []}
            gridSize={board.gridSize || 50}
            canvasWidth={board.canvasWidth}
            canvasHeight={board.canvasHeight}
            isPlayerView={isPlayerView}
            fogEnabled={board.fogEnabled ?? true}
            brushPreview={
              brushPreviewCells
                ? {
                    cells: brushPreviewCells,
                    isAdding: interactionMode === 'addFog',
                  }
                : null
            }
          />
        )}
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
          onSetTextAlign={handleSetTextAlign}
          onSetFontSize={handleSetFontSize}
          brushSize={brushSize}
          onSetBrushSize={setBrushSize}
          gridEnabled={board.gridEnabled}
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
          {interactionMode === 'pan' && 'Drag to pan | Scroll to zoom'}
          {interactionMode === 'select' && 'Click to select | Drag to pan | Scroll to zoom'}
          {interactionMode === 'connect' && !connectionStart && 'Click a token to start connection'}
          {interactionMode === 'connect' && connectionStart && 'Click another token to connect | Click same to cancel'}
          {interactionMode === 'addFog' && 'Click/drag to add fog | Scroll to zoom'}
          {interactionMode === 'clearFog' && 'Click/drag to clear fog | Scroll to zoom'}
        </div>
      )}

      {/* Connection mode indicator */}
      {interactionMode === 'connect' && connectionStart && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-cyan-500/20 border border-cyan-400 px-3 py-1 text-xs text-cyan-400">
          Connecting from token...
        </div>
      )}

      {/* Selected connection controls */}
      {selectedConnectionId && onDeleteConnection && (() => {
        const conn = (board.connections || []).find((c) => c.id === selectedConnectionId);
        return (
          <div className="absolute top-4 right-4 flex flex-col gap-2 rounded-lg bg-black/90 border border-white/10 p-3 text-xs shadow-lg" style={{ minWidth: 220 }}>
            <div className="flex items-center justify-between">
              <span className="text-white/70 font-medium uppercase tracking-wider">Connection</span>
              <button type="button" onClick={handleDeleteSelectedConnection} className="text-red-400 hover:text-red-300">Delete</button>
            </div>
            {conn && onUpdateConnection && (
              <>
                <input
                  type="text"
                  value={conn.label || ''}
                  onChange={(e) => onUpdateConnection(selectedConnectionId, { label: e.target.value || undefined })}
                  placeholder="Label (e.g. funds, suspects)"
                  className="rounded border border-white/20 bg-white/10 px-2 py-1 text-white placeholder:text-white/30 focus:outline-none focus:border-white/40"
                />
                <div className="flex gap-2">
                  <select
                    value={conn.style || 'solid'}
                    onChange={(e) => onUpdateConnection(selectedConnectionId, { style: e.target.value as 'solid' | 'dashed' | 'dotted' })}
                    className="flex-1 rounded border border-white/20 bg-white/10 px-1 py-1 text-white focus:outline-none"
                  >
                    <option value="solid">Solid</option>
                    <option value="dashed">Dashed</option>
                    <option value="dotted">Dotted</option>
                  </select>
                  <input
                    type="color"
                    value={conn.color || '#00ffff'}
                    onChange={(e) => onUpdateConnection(selectedConnectionId, { color: e.target.value })}
                    className="h-7 w-8 cursor-pointer rounded border border-white/20 bg-transparent p-0.5"
                  />
                  <label className="flex items-center gap-1 text-white/70">
                    <input
                      type="checkbox"
                      checked={conn.animated !== false}
                      onChange={(e) => onUpdateConnection(selectedConnectionId, { animated: e.target.checked })}
                      className="h-3 w-3"
                    />
                    Glow
                  </label>
                </div>
              </>
            )}
          </div>
        );
      })()}
    </div>
  );
});

// ─── Canvas Controls Hook ─────────────────────────────────────────
// Provides zoom-in, zoom-out, and reset-view actions for external toolbars.
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

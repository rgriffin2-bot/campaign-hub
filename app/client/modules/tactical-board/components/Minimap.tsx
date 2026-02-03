import { useCallback, useRef, useState, useEffect } from 'react';
import { useCampaign } from '../../../core/providers/CampaignProvider';
import type { TacticalBoard } from '@shared/schemas/tactical-board';

interface MinimapProps {
  board: TacticalBoard;
  pan: { x: number; y: number };
  zoom: number;
  containerWidth: number;
  containerHeight: number;
  onNavigate: (canvasX: number, canvasY: number) => void;
}

const MINIMAP_WIDTH = 160;
const MINIMAP_HEIGHT = 120;

export function Minimap({
  board,
  pan,
  zoom,
  containerWidth,
  containerHeight,
  onNavigate,
}: MinimapProps) {
  const { campaign } = useCampaign();
  const minimapRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Calculate scale to fit canvas in minimap
  const scaleX = MINIMAP_WIDTH / board.canvasWidth;
  const scaleY = MINIMAP_HEIGHT / board.canvasHeight;
  const scale = Math.min(scaleX, scaleY);

  // Actual minimap canvas area
  const minimapCanvasWidth = board.canvasWidth * scale;
  const minimapCanvasHeight = board.canvasHeight * scale;

  // Calculate viewport rectangle in minimap coordinates
  // The viewport in canvas coords is the visible area
  const viewportCanvasX = -pan.x / zoom;
  const viewportCanvasY = -pan.y / zoom;
  const viewportCanvasWidth = containerWidth / zoom;
  const viewportCanvasHeight = containerHeight / zoom;

  // Convert to minimap coords
  const viewportMinimapX = viewportCanvasX * scale;
  const viewportMinimapY = viewportCanvasY * scale;
  const viewportMinimapWidth = viewportCanvasWidth * scale;
  const viewportMinimapHeight = viewportCanvasHeight * scale;

  // Build background image URL
  const backgroundUrl = board.background && campaign
    ? `/api/campaigns/${campaign.id}/assets/${board.background.replace('assets/', '')}`
    : null;

  // Handle click on minimap
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const rect = minimapRef.current?.getBoundingClientRect();
      if (!rect) return;

      // Get click position in minimap coordinates
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // Convert to canvas coordinates
      const canvasX = clickX / scale;
      const canvasY = clickY / scale;

      onNavigate(canvasX, canvasY);
    },
    [scale, onNavigate]
  );

  // Handle drag on viewport rectangle
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsDragging(true);
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const rect = minimapRef.current?.getBoundingClientRect();
      if (!rect) return;

      // Get mouse position in minimap coordinates
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Convert to canvas coordinates (center of viewport)
      const canvasX = mouseX / scale;
      const canvasY = mouseY / scale;

      onNavigate(canvasX, canvasY);
    },
    [isDragging, scale, onNavigate]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add global mouse listeners for dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Get token color based on source type
  const getTokenColor = (sourceType: string) => {
    switch (sourceType) {
      case 'pc':
        return '#3b82f6'; // blue
      case 'npc':
        return '#ef4444'; // red
      case 'ship':
        return '#8b5cf6'; // purple
      case 'location':
        return '#22c55e'; // green
      case 'text':
        return '#f59e0b'; // amber
      default:
        return '#6b7280'; // gray
    }
  };

  return (
    <div
      ref={minimapRef}
      className="absolute bottom-4 right-4 cursor-pointer overflow-hidden rounded-lg border border-white/20 bg-black/60 shadow-lg"
      style={{ width: MINIMAP_WIDTH, height: MINIMAP_HEIGHT }}
      onClick={handleClick}
    >
      {/* Canvas area */}
      <div
        className="relative"
        style={{
          width: minimapCanvasWidth,
          height: minimapCanvasHeight,
          margin: 'auto',
        }}
      >
        {/* Background */}
        {backgroundUrl ? (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${backgroundUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.5,
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-neutral-700/50" />
        )}

        {/* Grid indication */}
        {board.gridEnabled && (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)
              `,
              backgroundSize: `${(board.gridSize || 50) * scale * 4}px ${(board.gridSize || 50) * scale * 4}px`,
            }}
          />
        )}

        {/* Tokens as dots */}
        {board.tokens.map((token) => (
          <div
            key={token.id}
            className="absolute rounded-full"
            style={{
              left: token.x * scale - 3,
              top: token.y * scale - 3,
              width: 6,
              height: 6,
              backgroundColor: getTokenColor(token.sourceType),
              opacity: token.visibleToPlayers ? 1 : 0.5,
            }}
          />
        ))}

        {/* Viewport rectangle */}
        <div
          className="absolute border-2 border-primary bg-primary/10"
          style={{
            left: Math.max(0, viewportMinimapX),
            top: Math.max(0, viewportMinimapY),
            width: Math.min(viewportMinimapWidth, minimapCanvasWidth - Math.max(0, viewportMinimapX)),
            height: Math.min(viewportMinimapHeight, minimapCanvasHeight - Math.max(0, viewportMinimapY)),
            cursor: 'move',
          }}
          onMouseDown={handleMouseDown}
        />
      </div>
    </div>
  );
}

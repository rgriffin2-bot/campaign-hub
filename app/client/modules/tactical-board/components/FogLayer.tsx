import { memo, useMemo } from 'react';

interface BrushPreview {
  cells: Set<string>;
  isAdding: boolean;
}

interface FogLayerProps {
  fogCells: string[];
  gridSize: number;
  canvasWidth: number;
  canvasHeight: number;
  isPlayerView: boolean;
  fogEnabled: boolean;
  brushPreview?: BrushPreview | null;
}

export const FogLayer = memo(function FogLayer({
  fogCells,
  gridSize,
  canvasWidth,
  canvasHeight,
  isPlayerView,
  fogEnabled,
  brushPreview,
}: FogLayerProps) {
  // Convert array to Set for O(1) lookup
  const fogCellSet = useMemo(() => new Set(fogCells), [fogCells]);

  // Calculate max grid dimensions for bounds checking
  const maxGridX = useMemo(() => Math.ceil(canvasWidth / gridSize), [canvasWidth, gridSize]);
  const maxGridY = useMemo(() => Math.ceil(canvasHeight / gridSize), [canvasHeight, gridSize]);

  // Fog colors
  const dmFogColor = 'rgba(0, 0, 0, 0.4)';
  const playerFogColor = 'rgba(0, 0, 0, 0.95)';
  const fogColor = isPlayerView ? playerFogColor : dmFogColor;

  // Brush preview colors
  const addPreviewColor = 'rgba(100, 200, 100, 0.3)';
  const clearPreviewColor = 'rgba(200, 100, 100, 0.3)';

  if (!fogEnabled && !brushPreview) {
    return null;
  }

  return (
    <svg
      className="pointer-events-none absolute inset-0"
      width={canvasWidth}
      height={canvasHeight}
      style={{ overflow: 'visible', zIndex: 100 }}
    >
      {/* Render fog cells */}
      {fogEnabled &&
        fogCells.map((cellKey) => {
          const [gridX, gridY] = cellKey.split(',').map(Number);

          // Bounds check
          if (gridX < 0 || gridY < 0 || gridX >= maxGridX || gridY >= maxGridY) {
            return null;
          }

          return (
            <rect
              key={cellKey}
              x={gridX * gridSize}
              y={gridY * gridSize}
              width={gridSize}
              height={gridSize}
              fill={fogColor}
            />
          );
        })}

      {/* Render brush preview */}
      {brushPreview &&
        Array.from(brushPreview.cells).map((cellKey) => {
          const [gridX, gridY] = cellKey.split(',').map(Number);

          // Bounds check
          if (gridX < 0 || gridY < 0 || gridX >= maxGridX || gridY >= maxGridY) {
            return null;
          }

          // Don't show add preview on cells that already have fog
          if (brushPreview.isAdding && fogCellSet.has(cellKey)) {
            return null;
          }

          // Don't show clear preview on cells that don't have fog
          if (!brushPreview.isAdding && !fogCellSet.has(cellKey)) {
            return null;
          }

          return (
            <rect
              key={`preview-${cellKey}`}
              x={gridX * gridSize}
              y={gridY * gridSize}
              width={gridSize}
              height={gridSize}
              fill={brushPreview.isAdding ? addPreviewColor : clearPreviewColor}
              stroke={brushPreview.isAdding ? 'rgba(100, 200, 100, 0.6)' : 'rgba(200, 100, 100, 0.6)'}
              strokeWidth={2}
            />
          );
        })}
    </svg>
  );
});

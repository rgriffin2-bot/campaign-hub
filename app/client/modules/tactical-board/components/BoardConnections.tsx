import { useMemo, memo } from 'react';
import type { BoardToken, BoardConnection } from '@shared/schemas/tactical-board';

interface BoardConnectionsProps {
  connections: BoardConnection[];
  tokens: BoardToken[];
  selectedConnectionId: string | null;
  onSelectConnection: (connectionId: string | null) => void;
  animationsEnabled?: boolean; // Board-level setting to disable all animations
}

export const BoardConnections = memo(function BoardConnections({
  connections,
  tokens,
  selectedConnectionId,
  onSelectConnection,
  animationsEnabled = true,
}: BoardConnectionsProps) {
  // Create a map of token positions for quick lookup
  const tokenPositions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    tokens.forEach((token) => {
      map.set(token.id, { x: token.x, y: token.y });
    });
    return map;
  }, [tokens]);

  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
      <defs>
        {/* Sci-fi glow filter */}
        <filter id="sci-fi-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Animated dash pattern for flowing effect */}
        <pattern id="flow-pattern" patternUnits="userSpaceOnUse" width="20" height="4">
          <rect width="10" height="4" fill="currentColor" opacity="0.8">
            <animate
              attributeName="x"
              from="0"
              to="20"
              dur="1s"
              repeatCount="indefinite"
            />
          </rect>
        </pattern>
      </defs>

      {connections.map((connection) => {
        const fromPos = tokenPositions.get(connection.fromTokenId);
        const toPos = tokenPositions.get(connection.toTokenId);

        // Skip if either token doesn't exist
        if (!fromPos || !toPos) return null;

        const isSelected = selectedConnectionId === connection.id;
        const color = connection.color || '#00ffff';
        const thickness = connection.thickness || 2;
        // Only animate if both board-level and connection-level settings allow it
        const shouldAnimate = animationsEnabled && connection.animated;

        // Calculate midpoint for label
        const midX = (fromPos.x + toPos.x) / 2;
        const midY = (fromPos.y + toPos.y) / 2;

        // Calculate line length for animation timing
        const dx = toPos.x - fromPos.x;
        const dy = toPos.y - fromPos.y;
        const length = Math.sqrt(dx * dx + dy * dy);

        // Dash array based on style
        let strokeDasharray: string | undefined;
        if (connection.style === 'dashed') {
          strokeDasharray = '12 6';
        } else if (connection.style === 'dotted') {
          strokeDasharray = '4 4';
        }

        return (
          <g key={connection.id}>
            {/* Glow effect layer (behind) - only when animations enabled */}
            {shouldAnimate && (
              <line
                x1={fromPos.x}
                y1={fromPos.y}
                x2={toPos.x}
                y2={toPos.y}
                stroke={color}
                strokeWidth={thickness + 4}
                strokeLinecap="round"
                opacity={0.3}
                filter="url(#sci-fi-glow)"
              >
                <animate
                  attributeName="opacity"
                  values="0.2;0.4;0.2"
                  dur="2s"
                  repeatCount="indefinite"
                />
              </line>
            )}

            {/* Main connection line */}
            <line
              x1={fromPos.x}
              y1={fromPos.y}
              x2={toPos.x}
              y2={toPos.y}
              stroke={color}
              strokeWidth={thickness}
              strokeLinecap="round"
              strokeDasharray={strokeDasharray}
              className="pointer-events-auto cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onSelectConnection(isSelected ? null : connection.id);
              }}
            >
              {/* Animated dash offset for flowing effect - only when animations enabled */}
              {shouldAnimate && (
                <animate
                  attributeName="stroke-dashoffset"
                  from="0"
                  to={length > 0 ? -length : -100}
                  dur={`${Math.max(2, length / 50)}s`}
                  repeatCount="indefinite"
                />
              )}
            </line>

            {/* Energy pulse effect traveling along the line - only when animations enabled */}
            {shouldAnimate && (
              <circle r={thickness + 1} fill={color} opacity={0.8}>
                <animateMotion
                  dur={`${Math.max(1.5, length / 100)}s`}
                  repeatCount="indefinite"
                  path={`M${fromPos.x},${fromPos.y} L${toPos.x},${toPos.y}`}
                />
                <animate
                  attributeName="opacity"
                  values="0;0.8;0"
                  dur={`${Math.max(1.5, length / 100)}s`}
                  repeatCount="indefinite"
                />
              </circle>
            )}

            {/* Selection highlight */}
            {isSelected && (
              <line
                x1={fromPos.x}
                y1={fromPos.y}
                x2={toPos.x}
                y2={toPos.y}
                stroke="#ffffff"
                strokeWidth={thickness + 6}
                strokeLinecap="round"
                opacity={0.3}
              />
            )}

            {/* Connection label */}
            {connection.label && (
              <g>
                <rect
                  x={midX - 30}
                  y={midY - 10}
                  width={60}
                  height={20}
                  rx={4}
                  fill="rgba(0, 0, 0, 0.75)"
                  stroke={color}
                  strokeWidth={1}
                />
                <text
                  x={midX}
                  y={midY + 4}
                  textAnchor="middle"
                  fill={color}
                  fontSize={12}
                  fontFamily="system-ui"
                >
                  {connection.label}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
});

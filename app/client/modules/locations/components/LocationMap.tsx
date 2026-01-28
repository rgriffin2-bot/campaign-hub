import { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { useCampaign } from '../../../core/providers/CampaignProvider';
import type { FileMetadata } from '@shared/types/file';
import type { CelestialData } from '@shared/schemas/location';

interface LocationMapProps {
  locations: FileMetadata[];
  onSelectLocation: (location: FileMetadata | null) => void;
  selectedLocationId?: string;
}

interface CelestialLocation extends FileMetadata {
  celestial: CelestialData;
  parent?: string;
}

interface Position {
  x: number;
  y: number;
}

// Map dimensions
const MAP_SIZE = 2400;
const CENTER = MAP_SIZE / 2;

// Default colors for celestial bodies
const DEFAULT_COLORS: Record<string, string> = {
  star: '#FDB813',
  planet: '#4A90D9',
  moon: '#9CA3AF',
  station: '#8B5CF6',
  asteroid_ring: '#6B7280',
};

// Default sizes for celestial bodies
const DEFAULT_RADII: Record<string, number> = {
  star: 60,
  planet: 25,
  moon: 12,
  station: 8,
  asteroid_ring: 4,
};

export function LocationMap({
  locations,
  onSelectLocation,
  selectedLocationId,
}: LocationMapProps) {
  const { campaign } = useCampaign();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Pan and zoom state
  const [viewBox, setViewBox] = useState({
    x: 0,
    y: 0,
    width: MAP_SIZE,
    height: MAP_SIZE,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
  const [viewBoxStart, setViewBoxStart] = useState({ x: 0, y: 0 });

  // Filter locations with celestial data
  const celestialLocations = locations.filter(
    (loc): loc is CelestialLocation =>
      loc.celestial !== undefined && loc.celestial !== null
  );

  // Build position map based on parent-child relationships
  const positionMap = new Map<string, Position>();

  // Find root celestial bodies (stars with no parent, or parent without celestial data)
  const rootBodies = celestialLocations.filter((loc) => {
    if (!loc.parent) return true;
    const parent = celestialLocations.find((p) => p.id === loc.parent);
    return !parent;
  });

  // Calculate positions recursively
  function calculatePosition(
    loc: CelestialLocation,
    parentPos: Position
  ): Position {
    const celestial = loc.celestial;
    const orbitDistance = celestial.orbitDistance || 100;
    const startAngle = ((celestial.startPosition || 0) * Math.PI) / 180;

    // For elliptical orbits
    const eccentricity = celestial.orbitEccentricity || 0;
    const semiMajorAxis = orbitDistance;
    const semiMinorAxis = semiMajorAxis * Math.sqrt(1 - eccentricity * eccentricity);

    // Calculate position on orbit
    const orbitRotation = ((celestial.orbitRotation || 0) * Math.PI) / 180;

    let x: number, y: number;
    if (celestial.orbitShape === 'ellipse' && eccentricity > 0) {
      // Elliptical orbit
      const cosRotation = Math.cos(orbitRotation);
      const sinRotation = Math.sin(orbitRotation);
      const xEllipse = semiMajorAxis * Math.cos(startAngle);
      const yEllipse = semiMinorAxis * Math.sin(startAngle);
      x = parentPos.x + xEllipse * cosRotation - yEllipse * sinRotation;
      y = parentPos.y + xEllipse * sinRotation + yEllipse * cosRotation;
    } else {
      // Circular orbit
      x = parentPos.x + orbitDistance * Math.cos(startAngle);
      y = parentPos.y + orbitDistance * Math.sin(startAngle);
    }

    return { x, y };
  }

  // Build positions for all celestial bodies
  function buildPositions() {
    // Place root bodies
    if (rootBodies.length === 1) {
      // Single root (star) at center
      positionMap.set(rootBodies[0].id, { x: CENTER, y: CENTER });
    } else {
      // Multiple roots - spread them out
      rootBodies.forEach((loc, i) => {
        const angle = (i * 2 * Math.PI) / rootBodies.length;
        const distance = 400;
        positionMap.set(loc.id, {
          x: CENTER + distance * Math.cos(angle),
          y: CENTER + distance * Math.sin(angle),
        });
      });
    }

    // Calculate positions for children recursively
    function processChildren(parentId: string) {
      const parentPos = positionMap.get(parentId);
      if (!parentPos) return;

      const children = celestialLocations.filter((loc) => loc.parent === parentId);
      for (const child of children) {
        const pos = calculatePosition(child, parentPos);
        positionMap.set(child.id, pos);
        processChildren(child.id);
      }
    }

    rootBodies.forEach((root) => processChildren(root.id));
  }

  buildPositions();

  // Handle mouse wheel zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;

    setViewBox((prev) => {
      const newWidth = Math.min(MAP_SIZE * 2, Math.max(200, prev.width * zoomFactor));
      const newHeight = Math.min(MAP_SIZE * 2, Math.max(200, prev.height * zoomFactor));

      // Zoom toward mouse position
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const ratioX = mouseX / rect.width;
        const ratioY = mouseY / rect.height;

        const newX = prev.x + (prev.width - newWidth) * ratioX;
        const newY = prev.y + (prev.height - newHeight) * ratioY;

        return { x: newX, y: newY, width: newWidth, height: newHeight };
      }

      return {
        x: prev.x + (prev.width - newWidth) / 2,
        y: prev.y + (prev.height - newHeight) / 2,
        width: newWidth,
        height: newHeight,
      };
    });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  // Handle mouse drag for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setViewBoxStart({ x: viewBox.x, y: viewBox.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const dx = (e.clientX - dragStart.x) * (viewBox.width / rect.width);
    const dy = (e.clientY - dragStart.y) * (viewBox.height / rect.height);

    setViewBox((prev) => ({
      ...prev,
      x: viewBoxStart.x - dx,
      y: viewBoxStart.y - dy,
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    setViewBox((prev) => ({
      x: prev.x + prev.width * 0.1,
      y: prev.y + prev.height * 0.1,
      width: prev.width * 0.8,
      height: prev.height * 0.8,
    }));
  };

  const handleZoomOut = () => {
    setViewBox((prev) => ({
      x: prev.x - prev.width * 0.125,
      y: prev.y - prev.height * 0.125,
      width: Math.min(MAP_SIZE * 2, prev.width * 1.25),
      height: Math.min(MAP_SIZE * 2, prev.height * 1.25),
    }));
  };

  const handleReset = () => {
    setViewBox({ x: 0, y: 0, width: MAP_SIZE, height: MAP_SIZE });
    onSelectLocation(null);
  };

  const handleClickBody = (loc: CelestialLocation, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectLocation(loc);
  };

  const handleClickBackground = () => {
    onSelectLocation(null);
  };

  // Generate starfield background
  const stars = useRef<Array<{ cx: number; cy: number; r: number; opacity: number }>>([]);
  if (stars.current.length === 0) {
    for (let i = 0; i < 200; i++) {
      stars.current.push({
        cx: Math.random() * MAP_SIZE,
        cy: Math.random() * MAP_SIZE,
        r: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.5 + 0.3,
      });
    }
  }

  // Render orbit path
  function renderOrbit(loc: CelestialLocation) {
    if (!loc.parent) return null;
    const parentPos = positionMap.get(loc.parent);
    if (!parentPos) return null;

    const celestial = loc.celestial;
    const orbitDistance = celestial.orbitDistance || 100;
    const eccentricity = celestial.orbitEccentricity || 0;
    const orbitRotation = celestial.orbitRotation || 0;

    const orbitColor = celestial.orbitColor || '#374151';
    const strokeDasharray =
      celestial.orbitStyle === 'dashed'
        ? '10,5'
        : celestial.orbitStyle === 'dotted'
        ? '2,4'
        : undefined;

    if (celestial.orbitShape === 'ellipse' && eccentricity > 0) {
      const semiMajorAxis = orbitDistance;
      const semiMinorAxis = semiMajorAxis * Math.sqrt(1 - eccentricity * eccentricity);
      return (
        <ellipse
          key={`orbit-${loc.id}`}
          cx={parentPos.x}
          cy={parentPos.y}
          rx={semiMajorAxis}
          ry={semiMinorAxis}
          fill="none"
          stroke={orbitColor}
          strokeWidth={1}
          strokeDasharray={strokeDasharray}
          transform={`rotate(${orbitRotation} ${parentPos.x} ${parentPos.y})`}
          opacity={0.5}
        />
      );
    }

    return (
      <circle
        key={`orbit-${loc.id}`}
        cx={parentPos.x}
        cy={parentPos.y}
        r={orbitDistance}
        fill="none"
        stroke={orbitColor}
        strokeWidth={1}
        strokeDasharray={strokeDasharray}
        opacity={0.5}
      />
    );
  }

  // Render celestial body
  function renderBody(loc: CelestialLocation) {
    const pos = positionMap.get(loc.id);
    if (!pos) return null;

    const celestial = loc.celestial;
    const bodyType = celestial.bodyType;
    const radius = celestial.radius || DEFAULT_RADII[bodyType] || 20;
    const color = celestial.color || DEFAULT_COLORS[bodyType] || '#6B7280';
    const isSelected = selectedLocationId === loc.id;

    // Get image URL if available
    const image = loc.image as string | undefined;
    const imageUrl =
      image && campaign
        ? `/api/campaigns/${campaign.id}/assets/${image.replace('assets/', '')}`
        : null;

    // Special rendering for asteroid rings
    if (bodyType === 'asteroid_ring') {
      if (!loc.parent) return null;
      const parentPos = positionMap.get(loc.parent);
      if (!parentPos) return null;
      const orbitDistance = celestial.orbitDistance || 100;

      return (
        <g key={loc.id}>
          {/* Asteroid ring as a thick dashed circle */}
          <circle
            cx={parentPos.x}
            cy={parentPos.y}
            r={orbitDistance}
            fill="none"
            stroke={color}
            strokeWidth={8}
            strokeDasharray="4,8"
            opacity={0.6}
            style={{ cursor: 'pointer' }}
            onClick={(e) => handleClickBody(loc, e)}
          />
          {celestial.showLabel !== false && (
            <text
              x={parentPos.x + orbitDistance + 15}
              y={parentPos.y}
              fill="#9CA3AF"
              fontSize={14}
              dominantBaseline="middle"
            >
              {loc.name}
            </text>
          )}
        </g>
      );
    }

    return (
      <g key={loc.id} style={{ cursor: 'pointer' }} onClick={(e) => handleClickBody(loc, e)}>
        {/* Selection ring */}
        {isSelected && (
          <circle
            cx={pos.x}
            cy={pos.y}
            r={radius + 6}
            fill="none"
            stroke="#3B82F6"
            strokeWidth={3}
          />
        )}

        {/* Body */}
        {imageUrl ? (
          <clipPath id={`clip-${loc.id}`}>
            <circle cx={pos.x} cy={pos.y} r={radius} />
          </clipPath>
        ) : null}

        {imageUrl ? (
          <image
            href={imageUrl}
            x={pos.x - radius}
            y={pos.y - radius}
            width={radius * 2}
            height={radius * 2}
            clipPath={`url(#clip-${loc.id})`}
            preserveAspectRatio="xMidYMid slice"
          />
        ) : (
          <circle
            cx={pos.x}
            cy={pos.y}
            r={radius}
            fill={color}
            stroke={bodyType === 'star' ? '#FEF3C7' : undefined}
            strokeWidth={bodyType === 'star' ? 4 : 0}
          />
        )}

        {/* Glow effect for stars */}
        {bodyType === 'star' && (
          <circle
            cx={pos.x}
            cy={pos.y}
            r={radius * 1.5}
            fill={`url(#starGlow-${loc.id})`}
            opacity={0.4}
          />
        )}

        {/* Label */}
        {celestial.showLabel !== false && (
          <text
            x={pos.x}
            y={pos.y + radius + 18}
            fill="#E5E7EB"
            fontSize={14}
            textAnchor="middle"
            fontWeight={bodyType === 'star' ? 'bold' : 'normal'}
          >
            {loc.name}
          </text>
        )}
      </g>
    );
  }

  if (celestialLocations.length === 0) {
    return (
      <div className="flex h-[500px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 text-center">
        <p className="text-muted-foreground">
          No celestial bodies to display.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Add celestial data to locations to see them on the map.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Controls */}
      <div className="absolute right-4 top-4 z-10 flex flex-col gap-2">
        <button
          onClick={handleZoomIn}
          className="flex h-8 w-8 items-center justify-center rounded-md bg-card/80 text-foreground shadow-md backdrop-blur transition-colors hover:bg-card"
          title="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="flex h-8 w-8 items-center justify-center rounded-md bg-card/80 text-foreground shadow-md backdrop-blur transition-colors hover:bg-card"
          title="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          onClick={handleReset}
          className="flex h-8 w-8 items-center justify-center rounded-md bg-card/80 text-foreground shadow-md backdrop-blur transition-colors hover:bg-card"
          title="Reset view"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {/* Map container */}
      <div
        ref={containerRef}
        className="h-[500px] overflow-hidden rounded-lg border border-border bg-slate-950"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <svg
          ref={svgRef}
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
          className="h-full w-full"
          onClick={handleClickBackground}
        >
          {/* Defs for gradients */}
          <defs>
            {celestialLocations
              .filter((loc) => loc.celestial.bodyType === 'star')
              .map((loc) => (
                <radialGradient key={`grad-${loc.id}`} id={`starGlow-${loc.id}`}>
                  <stop
                    offset="0%"
                    stopColor={loc.celestial.color || DEFAULT_COLORS.star}
                    stopOpacity="0.8"
                  />
                  <stop
                    offset="100%"
                    stopColor={loc.celestial.color || DEFAULT_COLORS.star}
                    stopOpacity="0"
                  />
                </radialGradient>
              ))}
          </defs>

          {/* Starfield background */}
          {stars.current.map((star, i) => (
            <circle
              key={`star-${i}`}
              cx={star.cx}
              cy={star.cy}
              r={star.r}
              fill="white"
              opacity={star.opacity}
            />
          ))}

          {/* Orbit lines (render first, behind bodies) */}
          {celestialLocations
            .filter((loc) => loc.parent)
            .map((loc) => renderOrbit(loc))}

          {/* Celestial bodies */}
          {celestialLocations.map((loc) => renderBody(loc))}
        </svg>
      </div>
    </div>
  );
}

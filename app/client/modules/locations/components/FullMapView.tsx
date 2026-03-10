/**
 * FullMapView -- Full-screen 3D star-system map.
 * Renders the solar system using Three.js with a minimalist wireframe aesthetic.
 * Click a celestial body to open the detail sidebar.
 */
import { useState, Suspense, lazy } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { X, MapPin } from 'lucide-react';
import { useCampaign } from '../../../core/providers/CampaignProvider';
import type { FileMetadata } from '@shared/types/file';
import type { CelestialData } from '@shared/schemas/location';

// Lazy-load the Three.js scene so it never blocks the main app bundle
const SolarSystem3D = lazy(() =>
  import('./SolarSystem3D').then((m) => ({ default: m.SolarSystem3D }))
);

interface FullMapViewProps {
  locations: FileMetadata[];
  onClose?: () => void;
  basePath?: string;
}

interface MapSidebarProps {
  location: FileMetadata | null;
  onClose: () => void;
  basePath: string;
}

const BODY_TYPE_LABELS: Record<string, string> = {
  star: 'Star',
  planet: 'Planet',
  moon: 'Moon',
  station: 'Station',
  asteroid_ring: 'Asteroid Belt',
};

// ── Sci-fi HUD sidebar styles ──────────────────────────────────────────────

const HUD_BLUE = 'rgba(59,130,246,';
const CLIP_OUTER = 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))';
const CLIP_INNER = 'polygon(1px 1px, calc(100% - 21px) 1px, calc(100% - 1px) 21px, calc(100% - 1px) calc(100% - 1px), 21px calc(100% - 1px), 1px calc(100% - 21px))';
const FONT_MONO = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

const hudText: React.CSSProperties = {
  fontFamily: FONT_MONO,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
};

// ── Sidebar ────────────────────────────────────────────────────────────────

function InlineMapSidebar({ location, onClose, basePath }: MapSidebarProps) {
  const { campaign } = useCampaign();

  if (!location) {
    return (
      <div style={{ padding: 16, textAlign: 'center', fontFamily: FONT_MONO, color: `${HUD_BLUE}0.4)` }}>
        <MapPin style={{ width: 32, height: 32, margin: '0 auto 8px' }} />
        <p style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
          Select a body
        </p>
      </div>
    );
  }

  const celestial = location.celestial as CelestialData | undefined;
  const image = location.image as string | undefined;
  const description: string | undefined =
    typeof location.description === 'string' ? location.description : undefined;
  const imageUrl =
    image && campaign
      ? `/api/campaigns/${campaign.id}/assets/${image.replace('assets/', '')}`
      : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: 12 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3 style={{
            ...hudText,
            fontSize: 12,
            fontWeight: 600,
            color: '#e2e8f0',
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {location.name}
          </h3>
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            {celestial && (
              <span style={{
                ...hudText,
                fontSize: 9,
                fontWeight: 600,
                color: `${HUD_BLUE}0.9)`,
                background: `${HUD_BLUE}0.15)`,
                padding: '2px 8px',
                clipPath: 'polygon(6px 0, calc(100% - 6px) 0, 100% 50%, calc(100% - 6px) 100%, 6px 100%, 0 50%)',
              }}>
                {BODY_TYPE_LABELS[celestial.bodyType] || celestial.bodyType}
              </span>
            )}
            {location.type ? (
              <span style={{
                ...hudText,
                fontSize: 9,
                color: `${HUD_BLUE}0.5)`,
                border: `1px solid ${HUD_BLUE}0.2)`,
                padding: '1px 6px',
                borderRadius: 2,
              }}>
                {String(location.type)}
              </span>
            ) : null}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            marginLeft: 8,
            flexShrink: 0,
            background: 'none',
            border: `1px solid ${HUD_BLUE}0.3)`,
            borderRadius: 2,
            padding: 2,
            color: `${HUD_BLUE}0.5)`,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X style={{ width: 14, height: 14 }} />
        </button>
      </div>

      {/* Image */}
      {imageUrl ? (
        <div style={{
          margin: '0 12px 12px',
          overflow: 'hidden',
          borderRadius: 4,
          boxShadow: `0 0 8px ${HUD_BLUE}0.3), inset 0 0 4px ${HUD_BLUE}0.1)`,
          border: `1px solid ${HUD_BLUE}0.3)`,
        }}>
          <img src={imageUrl} alt={location.name} style={{ display: 'block', width: '100%', height: 96, objectFit: 'cover' }} />
        </div>
      ) : null}

      {/* Description */}
      {description ? (
        <p style={{
          fontFamily: FONT_MONO,
          fontSize: 11,
          lineHeight: 1.5,
          color: 'rgba(148,163,184,0.8)',
          margin: '0 12px 12px',
        }}>
          {description}
        </p>
      ) : null}

      {/* Separator + nav link */}
      <div style={{ borderTop: `1px solid ${HUD_BLUE}0.2)`, padding: 12 }}>
        <Link
          to={`${basePath}/${location.id}`}
          style={{
            ...hudText,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            fontSize: 10,
            fontWeight: 600,
            color: `${HUD_BLUE}0.9)`,
            background: `${HUD_BLUE}0.08)`,
            border: `1px solid ${HUD_BLUE}0.4)`,
            borderRadius: 2,
            padding: '6px 12px',
            textDecoration: 'none',
            transition: 'background 0.2s, border-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = `${HUD_BLUE}0.18)`;
            e.currentTarget.style.borderColor = `${HUD_BLUE}0.6)`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = `${HUD_BLUE}0.08)`;
            e.currentTarget.style.borderColor = `${HUD_BLUE}0.4)`;
          }}
        >
          View Details
        </Link>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

export function FullMapView({ locations, onClose, basePath = '/modules/locations' }: FullMapViewProps) {
  const [selectedLocation, setSelectedLocation] = useState<FileMetadata | null>(null);

  const celestialCount = locations.filter((l) => l.celestial).length;

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#04040a' }}>
      {/* Header */}
      <div className="absolute inset-x-0 top-0 z-10 flex h-12 items-center justify-between border-b border-white/10 bg-black/40 px-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <MapPin className="h-5 w-5 text-primary" />
          <span className="font-medium text-foreground">System Map</span>
          <span className="text-sm text-muted-foreground">{celestialCount} bodies</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* 3D canvas fills the entire viewport, header floats on top */}
      <div className="absolute inset-0">
        {celestialCount === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <MapPin className="h-16 w-16 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-medium text-foreground">No Celestial Bodies</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Add celestial data to your locations to see them on the map.
              </p>
            </div>
          </div>
        ) : (
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Loading 3D map...
              </div>
            }
          >
            <SolarSystem3D
              locations={locations}
              selectedId={selectedLocation?.id ?? null}
              onSelect={setSelectedLocation}
            />
          </Suspense>
        )}
      </div>

      {/* Sidebar overlay — sci-fi HUD panel */}
      {selectedLocation && (
        <div style={{
          position: 'absolute',
          right: 16,
          top: 64,
          zIndex: 20,
          width: 256,
          filter: `drop-shadow(0 0 8px ${HUD_BLUE}0.4)) drop-shadow(0 0 20px ${HUD_BLUE}0.15))`,
        }}>
          {/* Border layer */}
          <div style={{
            clipPath: CLIP_OUTER,
            background: `${HUD_BLUE}0.5)`,
          }}>
            {/* Content layer */}
            <div style={{
              clipPath: CLIP_INNER,
              background: 'rgba(4, 8, 22, 0.92)',
            }}>
              <InlineMapSidebar
                location={selectedLocation}
                onClose={() => setSelectedLocation(null)}
                basePath={basePath}
              />
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}

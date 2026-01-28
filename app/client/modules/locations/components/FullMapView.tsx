import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ExternalLink, X, RefreshCw, MapPin } from 'lucide-react';
import { useCampaign } from '../../../core/providers/CampaignProvider';
import type { FileMetadata } from '@shared/types/file';
import type { CelestialData } from '@shared/schemas/location';

interface FullMapViewProps {
  locations: FileMetadata[];
  onClose?: () => void;
}

interface MapSidebarProps {
  location: FileMetadata | null;
  onClose: () => void;
}

const BODY_TYPE_LABELS: Record<string, string> = {
  star: 'Star',
  planet: 'Planet',
  moon: 'Moon',
  station: 'Station',
  asteroid_ring: 'Asteroid Belt',
};

function InlineMapSidebar({ location, onClose }: MapSidebarProps) {
  const { campaign } = useCampaign();

  if (!location) {
    return (
      <div className="flex flex-col items-center justify-center p-4 text-center">
        <MapPin className="h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">
          Click on a celestial body to view details
        </p>
      </div>
    );
  }

  const celestial = location.celestial as CelestialData | undefined;
  const image = location.image as string | undefined;
  const description: string | undefined = typeof location.description === 'string' ? location.description : undefined;
  const imageUrl =
    image && campaign
      ? `/api/campaigns/${campaign.id}/assets/${image.replace('assets/', '')}`
      : null;

  return (
    <div className="flex flex-col">
      {/* Header with close button */}
      <div className="flex items-start justify-between p-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-foreground">
            {location.name}
          </h3>
          <div className="mt-1 flex items-center gap-2">
            {celestial && (
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                {BODY_TYPE_LABELS[celestial.bodyType] || celestial.bodyType}
              </span>
            )}
            {location.type ? (
              <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {String(location.type)}
              </span>
            ) : null}
          </div>
        </div>
        <button
          onClick={onClose}
          className="ml-2 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Image preview */}
      {imageUrl ? (
        <div className="mx-3 mb-3 overflow-hidden rounded-lg border border-border">
          <img
            src={imageUrl}
            alt={location.name}
            className="h-24 w-full object-cover"
          />
        </div>
      ) : null}

      {/* Description */}
      {description ? (
        <p className="mb-3 px-3 text-xs text-muted-foreground">
          {description}
        </p>
      ) : null}

      {/* View Details link */}
      <div className="border-t border-border p-3">
        <Link
          to={`/modules/locations/${location.id}`}
          className="flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          View Details
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

export function FullMapView({ locations, onClose }: FullMapViewProps) {
  const { campaign } = useCampaign();
  const navigate = useNavigate();
  const [selectedLocation, setSelectedLocation] = useState<FileMetadata | null>(null);
  const [mapHtml, setMapHtml] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle messages from iframe (for "Go to Entry" button)
  const handleIframeMessage = useCallback((event: MessageEvent) => {
    if (event.data?.type === 'navigate-to-location' && event.data?.locationId) {
      // Close the map and navigate to the location
      onClose?.();
      navigate(`/modules/locations/${event.data.locationId}`);
    }
  }, [onClose, navigate]);

  // Listen for postMessage from iframe
  useEffect(() => {
    window.addEventListener('message', handleIframeMessage);
    return () => window.removeEventListener('message', handleIframeMessage);
  }, [handleIframeMessage]);

  // Check if generated map exists
  useEffect(() => {
    if (campaign) {
      checkForGeneratedMap();
    }
  }, [campaign]);

  const checkForGeneratedMap = async () => {
    if (!campaign) return;

    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/map`);
      if (response.ok) {
        const html = await response.text();
        setMapHtml(html);
      }
    } catch {
      // No map exists yet, that's fine
    }
  };

  const generateMap = async () => {
    if (!campaign) return;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/map/generate`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate map');
      }

      // Re-fetch the generated map
      await checkForGeneratedMap();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate map');
    } finally {
      setIsGenerating(false);
    }
  };

  const celestialLocations = locations.filter(
    (loc) => loc.celestial !== undefined && loc.celestial !== null
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950">
      {/* Header bar */}
      <div className="absolute inset-x-0 top-0 z-10 flex h-12 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <MapPin className="h-5 w-5 text-primary" />
          <span className="font-medium text-foreground">System Map</span>
          <span className="text-sm text-muted-foreground">
            {celestialLocations.length} celestial bodies
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={generateMap}
            disabled={isGenerating}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Generating...' : mapHtml ? 'Regenerate Map' : 'Generate Map'}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Main content area - positioned below header */}
      <div className="absolute inset-x-0 bottom-0 top-12 overflow-hidden">
        {error && (
          <div className="absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-md bg-destructive/90 px-4 py-2 text-sm text-destructive-foreground">
            {error}
          </div>
        )}

        {mapHtml ? (
          // Render the generated HTML map in an iframe
          <iframe
            srcDoc={mapHtml}
            className="h-full w-full border-0"
            title="Star System Map"
            sandbox="allow-scripts"
          />
        ) : (
          // Fallback: Show placeholder or simple visualization
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <MapPin className="h-16 w-16 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-medium text-foreground">No Map Generated</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Click "Generate Map" to create an interactive star system visualization.
              </p>
            </div>
            {celestialLocations.length === 0 && (
              <p className="text-sm text-amber-500">
                Add celestial data to your locations first.
              </p>
            )}
          </div>
        )}

        {/* Sidebar overlay */}
        {selectedLocation && (
          <div className="absolute right-4 top-4 w-64 rounded-lg border border-border bg-card/95 shadow-lg backdrop-blur">
            <InlineMapSidebar
              location={selectedLocation}
              onClose={() => setSelectedLocation(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

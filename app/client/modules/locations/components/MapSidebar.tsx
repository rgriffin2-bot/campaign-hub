import { Link } from 'react-router-dom';
import { MapPin, ExternalLink, X } from 'lucide-react';
import { useCampaign } from '../../../core/providers/CampaignProvider';
import type { FileMetadata } from '@shared/types/file';
import type { CelestialData } from '@shared/schemas/location';

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

export function MapSidebar({ location, onClose }: MapSidebarProps) {
  const { campaign } = useCampaign();

  if (!location) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <MapPin className="h-12 w-12 text-muted-foreground" />
        <p className="mt-4 text-muted-foreground">
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
    <div className="flex h-full flex-col">
      {/* Header with close button */}
      <div className="flex items-start justify-between border-b border-border p-4">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-semibold text-foreground">
            {location.name}
          </h3>
          <div className="mt-1 flex items-center gap-2">
            {celestial && (
              <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {BODY_TYPE_LABELS[celestial.bodyType] || celestial.bodyType}
              </span>
            )}
            {location.type ? (
              <span className="rounded bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                {String(location.type)}
              </span>
            ) : null}
          </div>
        </div>
        <button
          onClick={onClose}
          className="ml-2 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Image preview */}
        {imageUrl ? (
          <div className="mb-4 overflow-hidden rounded-lg border border-border">
            <img
              src={imageUrl}
              alt={location.name}
              className="h-32 w-full object-cover"
            />
          </div>
        ) : null}

        {/* Description */}
        {description ? (
          <p className="mb-4 text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}

        {/* Celestial data */}
        {celestial && (
          <div className="mb-4 space-y-2 rounded-md bg-secondary/50 p-3">
            <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Orbital Data
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {celestial.orbitDistance && (
                <>
                  <span className="text-muted-foreground">Distance:</span>
                  <span className="text-foreground">{celestial.orbitDistance} units</span>
                </>
              )}
              {celestial.radius && (
                <>
                  <span className="text-muted-foreground">Radius:</span>
                  <span className="text-foreground">{celestial.radius} units</span>
                </>
              )}
              {celestial.orbitShape === 'ellipse' && celestial.orbitEccentricity && (
                <>
                  <span className="text-muted-foreground">Eccentricity:</span>
                  <span className="text-foreground">
                    {celestial.orbitEccentricity.toFixed(2)}
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Tags */}
        {Array.isArray(location.tags) && location.tags.length > 0 ? (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1">
              {(location.tags as string[]).map((tag) => (
                <span
                  key={tag}
                  className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Footer with link */}
      <div className="border-t border-border p-4">
        <Link
          to={`/modules/locations/${location.id}`}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          View Details
          <ExternalLink className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, Globe, X, Image } from 'lucide-react';
import {
  celestialBodyTypes,
  type CelestialData,
  type CelestialBodyType,
} from '@shared/schemas/location';
import { useCampaign } from '../../../core/providers/CampaignProvider';

interface CelestialFieldsProps {
  value: CelestialData | undefined;
  onChange: (value: CelestialData | undefined) => void;
  hasParent: boolean;
  locationId?: string;
}

const BODY_TYPE_LABELS: Record<CelestialBodyType, string> = {
  star: 'Star',
  planet: 'Planet',
  moon: 'Moon',
  station: 'Station',
  asteroid_ring: 'Asteroid Belt',
};

const DEFAULT_COLORS: Record<CelestialBodyType, string> = {
  star: '#FDB813',
  planet: '#4A90D9',
  moon: '#9CA3AF',
  station: '#8B5CF6',
  asteroid_ring: '#6B7280',
};

const DEFAULT_RADII: Record<CelestialBodyType, number> = {
  star: 60,
  planet: 25,
  moon: 12,
  station: 8,
  asteroid_ring: 4,
};

export function CelestialFields({ value, onChange, hasParent, locationId }: CelestialFieldsProps) {
  const { campaign } = useCampaign();
  const [isExpanded, setIsExpanded] = useState(!!value);
  const [enabled, setEnabled] = useState(!!value);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync enabled state with value prop when it changes (e.g., when loading a location)
  useEffect(() => {
    setEnabled(!!value);
    if (value) {
      setIsExpanded(true);
    }
  }, [value]);

  const handleToggle = () => {
    if (enabled) {
      // Disable celestial data
      setEnabled(false);
      onChange(undefined);
    } else {
      // Enable with defaults
      setEnabled(true);
      setIsExpanded(true);
      onChange({
        bodyType: 'planet',
        orbitDistance: hasParent ? 200 : undefined,
        orbitShape: 'circle',
        orbitEccentricity: 0,
        orbitRotation: 0,
        startPosition: 0,
        orbitStyle: 'solid',
        radius: DEFAULT_RADII.planet,
        color: DEFAULT_COLORS.planet,
        showLabel: true,
      });
    }
  };

  const updateField = <K extends keyof CelestialData>(
    field: K,
    fieldValue: CelestialData[K]
  ) => {
    if (!value) return;
    onChange({ ...value, [field]: fieldValue });
  };

  const handleBodyTypeChange = (bodyType: CelestialBodyType) => {
    onChange({
      ...value!,
      bodyType,
      radius: DEFAULT_RADII[bodyType],
      color: DEFAULT_COLORS[bodyType],
    });
  };

  const handleMapImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !campaign || !locationId || !value) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(
        `/api/campaigns/${campaign.id}/map-images/${locationId}`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const result = await response.json();
      if (result.success && result.data.path) {
        updateField('mapImage', result.data.path);
      }
    } catch (error) {
      console.error('Failed to upload map image:', error);
    } finally {
      setUploading(false);
    }
  };

  const removeMapImage = () => {
    updateField('mapImage', undefined);
  };

  const mapImageUrl =
    value?.mapImage && campaign
      ? `/api/campaigns/${campaign.id}/assets/${value.mapImage.replace('assets/', '')}`
      : null;

  return (
    <div className="space-y-4 rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
      {/* Header with toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-blue-500" />
          <span className="font-medium text-blue-500">Celestial Body</span>
        </div>
        <label className="flex cursor-pointer items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {enabled ? 'Enabled' : 'Disabled'}
          </span>
          <div
            className={`relative h-6 w-11 rounded-full transition-colors ${
              enabled ? 'bg-blue-500' : 'bg-secondary'
            }`}
            onClick={handleToggle}
          >
            <div
              className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </div>
        </label>
      </div>

      {enabled && value && (
        <>
          {/* Expand/collapse */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex w-full items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            {isExpanded ? 'Hide options' : 'Show options'}
          </button>

          {isExpanded && (
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Body Type */}
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Body Type
                </label>
                <select
                  value={value.bodyType}
                  onChange={(e) =>
                    handleBodyTypeChange(e.target.value as CelestialBodyType)
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {celestialBodyTypes.map((type) => (
                    <option key={type} value={type}>
                      {BODY_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Radius */}
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Visual Size
                </label>
                <input
                  type="number"
                  value={value.radius || ''}
                  onChange={(e) =>
                    updateField('radius', e.target.value ? Number(e.target.value) : undefined)
                  }
                  placeholder={String(DEFAULT_RADII[value.bodyType])}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              {/* Color */}
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={value.color || DEFAULT_COLORS[value.bodyType]}
                    onChange={(e) => updateField('color', e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded-md border border-input bg-background p-1"
                  />
                  <input
                    type="text"
                    value={value.color || ''}
                    onChange={(e) => updateField('color', e.target.value || undefined)}
                    placeholder={DEFAULT_COLORS[value.bodyType]}
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>

              {/* Show Label */}
              <div className="flex items-center gap-2 self-end pb-2">
                <input
                  type="checkbox"
                  id="showLabel"
                  checked={value.showLabel !== false}
                  onChange={(e) => updateField('showLabel', e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                <label htmlFor="showLabel" className="text-sm text-foreground">
                  Show label on map
                </label>
              </div>

              {/* Map Image */}
              <div className="col-span-2">
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Map Image
                </label>
                <p className="mb-2 text-xs text-muted-foreground">
                  Custom image to display on the star system map (PNG, JPG, or GIF)
                </p>

                {mapImageUrl ? (
                  <div className="relative inline-block">
                    <img
                      src={mapImageUrl}
                      alt="Map preview"
                      className="h-20 w-20 rounded-lg border border-border object-cover"
                    />
                    <button
                      type="button"
                      onClick={removeMapImage}
                      className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground shadow-sm hover:bg-destructive/90"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/gif"
                      onChange={handleMapImageUpload}
                      className="hidden"
                      disabled={!locationId || uploading}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={!locationId || uploading}
                      className="flex items-center gap-2 rounded-md border border-dashed border-border bg-background px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {uploading ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Image className="h-4 w-4" />
                          {locationId ? 'Upload Map Image' : 'Save location first to upload'}
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Ring Width (only for asteroid rings) */}
              {value.bodyType === 'asteroid_ring' && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Ring Width
                  </label>
                  <input
                    type="number"
                    value={value.ringWidth || ''}
                    onChange={(e) =>
                      updateField('ringWidth', e.target.value ? Number(e.target.value) : undefined)
                    }
                    placeholder="40"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Thickness of the asteroid belt
                  </p>
                </div>
              )}

              {/* Orbit settings (only if has parent) */}
              {hasParent && (
                <>
                  <div className="col-span-2 border-t border-border pt-4">
                    <h4 className="mb-3 text-sm font-medium text-foreground">
                      Orbit Settings
                    </h4>
                  </div>

                  {/* Orbit Distance */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">
                      Orbit Distance
                    </label>
                    <input
                      type="number"
                      value={value.orbitDistance || ''}
                      onChange={(e) =>
                        updateField(
                          'orbitDistance',
                          e.target.value ? Number(e.target.value) : undefined
                        )
                      }
                      placeholder="200"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Distance from parent body
                    </p>
                  </div>

                  {/* Start Position */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">
                      Starting Angle
                    </label>
                    <input
                      type="number"
                      value={value.startPosition || ''}
                      onChange={(e) =>
                        updateField(
                          'startPosition',
                          e.target.value ? Number(e.target.value) : 0
                        )
                      }
                      min={0}
                      max={359}
                      placeholder="0"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      0-359 degrees
                    </p>
                  </div>

                  {/* Orbit Shape */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">
                      Orbit Shape
                    </label>
                    <select
                      value={value.orbitShape || 'circle'}
                      onChange={(e) =>
                        updateField('orbitShape', e.target.value as 'circle' | 'ellipse')
                      }
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="circle">Circle</option>
                      <option value="ellipse">Ellipse</option>
                    </select>
                  </div>

                  {/* Eccentricity (only for ellipse) */}
                  {value.orbitShape === 'ellipse' && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-foreground">
                        Eccentricity
                      </label>
                      <input
                        type="number"
                        value={value.orbitEccentricity || ''}
                        onChange={(e) =>
                          updateField(
                            'orbitEccentricity',
                            Math.min(0.99, Math.max(0, Number(e.target.value) || 0))
                          )
                        }
                        min={0}
                        max={0.99}
                        step={0.1}
                        placeholder="0"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        0 = circle, higher = more elliptical
                      </p>
                    </div>
                  )}

                  {/* Orbit Style */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">
                      Orbit Line Style
                    </label>
                    <select
                      value={value.orbitStyle || 'solid'}
                      onChange={(e) =>
                        updateField(
                          'orbitStyle',
                          e.target.value as 'solid' | 'dashed' | 'dotted'
                        )
                      }
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="solid">Solid</option>
                      <option value="dashed">Dashed</option>
                      <option value="dotted">Dotted</option>
                    </select>
                  </div>

                  {/* Orbit Color */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">
                      Orbit Color
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={value.orbitColor || '#374151'}
                        onChange={(e) => updateField('orbitColor', e.target.value)}
                        className="h-10 w-14 cursor-pointer rounded-md border border-input bg-background p-1"
                      />
                      <input
                        type="text"
                        value={value.orbitColor || ''}
                        onChange={(e) => updateField('orbitColor', e.target.value || undefined)}
                        placeholder="#374151"
                        className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {!enabled && (
        <p className="text-sm text-muted-foreground">
          Enable to display this location on the solar system map.
        </p>
      )}
    </div>
  );
}

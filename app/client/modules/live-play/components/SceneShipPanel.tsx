import { Link } from 'react-router-dom';
import { Rocket, X, Eye, EyeOff, ExternalLink, Sparkles } from 'lucide-react';
import { useCampaign } from '../../../core/providers/CampaignProvider';
import type { SceneShip } from '../../../core/providers/SceneShipsProvider';
import type { ShipDisposition } from '@shared/schemas/ship';

interface SceneShipPanelProps {
  ship: SceneShip;
  onRemove?: () => void;
  onUpdateDisposition?: (disposition: ShipDisposition) => void;
  onToggleVisibility?: () => void;
  compact?: boolean;
  showControls?: boolean; // Whether to show DM controls (false for players)
}

// Get border color based on disposition
function getDispositionBorderClass(disposition?: ShipDisposition, isHidden?: boolean): string {
  if (isHidden) return 'border-amber-500/50';
  switch (disposition) {
    case 'hostile':
      return 'border-red-500/50';
    case 'friendly':
      return 'border-green-500/50';
    case 'neutral':
    default:
      return 'border-border';
  }
}

// Get background tint based on disposition
function getDispositionBgClass(disposition?: ShipDisposition, isHidden?: boolean): string {
  if (isHidden) return 'bg-amber-500/5';
  switch (disposition) {
    case 'hostile':
      return 'bg-red-500/5';
    case 'friendly':
      return 'bg-green-500/5';
    case 'neutral':
    default:
      return 'bg-card';
  }
}

export function SceneShipPanel({
  ship,
  onRemove,
  onUpdateDisposition,
  onToggleVisibility,
  compact = false,
  showControls = true,
}: SceneShipPanelProps) {
  const { campaign } = useCampaign();

  const imageUrl = ship.image && campaign
    ? `/api/campaigns/${campaign.id}/assets/${ship.image.replace('assets/', '')}`
    : null;

  const isHiddenFromPlayers = ship.visibleToPlayers === false;
  const disposition = ship.disposition || 'neutral';
  const pressure = ship.pressure || 0;

  // Check if ship has any damage
  const hasDamage = ship.damage && Object.values(ship.damage).some(
    subsystem => subsystem?.minor || subsystem?.major
  );

  const borderClass = getDispositionBorderClass(disposition, isHiddenFromPlayers);
  const bgClass = getDispositionBgClass(disposition, isHiddenFromPlayers);

  if (compact) {
    return (
      <div className={`relative rounded-lg border-2 overflow-hidden ${borderClass} ${bgClass}`}>
        {/* Control buttons */}
        <div className="absolute right-1 top-1 z-10 flex gap-1">
          {showControls && onToggleVisibility && (
            <button
              onClick={onToggleVisibility}
              className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                isHiddenFromPlayers
                  ? 'bg-amber-500 text-white hover:bg-amber-600'
                  : 'bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
              title={isHiddenFromPlayers ? 'Show to players' : 'Hide from players'}
            >
              {isHiddenFromPlayers ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </button>
          )}
          {showControls && onRemove && (
            <button
              onClick={onRemove}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs hover:bg-destructive/90"
              title="Remove from scene"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Hidden badge */}
        {isHiddenFromPlayers && (
          <div className="absolute left-1 top-1 z-10 flex items-center gap-1 rounded-full bg-amber-500 px-1.5 py-0.5 text-xs font-medium text-white">
            <EyeOff className="h-3 w-3" />
          </div>
        )}

        {/* Damage indicator badge */}
        {hasDamage && !isHiddenFromPlayers && (
          <div className="absolute left-1 top-1 z-10 flex items-center gap-1 rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-medium text-white">
            Damaged
          </div>
        )}

        {/* Square image section */}
        <div className={`relative aspect-square w-full overflow-hidden bg-primary/10 ${isHiddenFromPlayers ? 'opacity-60' : ''}`}>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={ship.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-primary">
              <Rocket className="h-12 w-12" />
            </div>
          )}
        </div>

        {/* Name and info section */}
        <div className="p-2">
          <p className="truncate text-sm font-medium text-foreground">
            {ship.name}
          </p>
          {(ship.type || ship.class) && (
            <p className="truncate text-xs text-muted-foreground">
              {[ship.type, ship.class].filter(Boolean).join(' • ')}
            </p>
          )}

          {/* Pressure indicator */}
          {pressure > 0 && (
            <div className="mt-1 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" />
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 w-2 rounded-full border ${
                      i < pressure
                        ? 'border-amber-500 bg-amber-500'
                        : 'border-muted-foreground/30'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Disposition selector - only for DM */}
          {showControls && onUpdateDisposition && (
            <div className="mt-2 flex gap-1">
              <button
                onClick={() => onUpdateDisposition('hostile')}
                className={`flex-1 rounded px-1.5 py-0.5 text-xs font-medium transition-colors ${
                  disposition === 'hostile'
                    ? 'bg-red-500 text-white'
                    : 'bg-secondary text-muted-foreground hover:bg-red-500/20 hover:text-red-500'
                }`}
                title="Hostile"
              >
                H
              </button>
              <button
                onClick={() => onUpdateDisposition('neutral')}
                className={`flex-1 rounded px-1.5 py-0.5 text-xs font-medium transition-colors ${
                  disposition === 'neutral'
                    ? 'bg-gray-500 text-white'
                    : 'bg-secondary text-muted-foreground hover:bg-gray-500/20 hover:text-gray-500'
                }`}
                title="Neutral"
              >
                N
              </button>
              <button
                onClick={() => onUpdateDisposition('friendly')}
                className={`flex-1 rounded px-1.5 py-0.5 text-xs font-medium transition-colors ${
                  disposition === 'friendly'
                    ? 'bg-green-500 text-white'
                    : 'bg-secondary text-muted-foreground hover:bg-green-500/20 hover:text-green-500'
                }`}
                title="Friendly"
              >
                F
              </button>
            </div>
          )}

          {/* View Entry button - only show for DM */}
          {showControls && (
            <Link
              to={`/modules/ships/${ship.id}?from=live-play`}
              className="mt-2 flex items-center justify-center gap-1 rounded bg-secondary px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <ExternalLink className="h-3 w-3" />
              View Entry
            </Link>
          )}
        </div>
      </div>
    );
  }

  // Full layout
  return (
    <div className={`relative rounded-lg border-2 overflow-hidden ${borderClass} ${bgClass}`}>
      {/* Control buttons */}
      <div className="absolute right-2 top-2 z-10 flex gap-1">
        {showControls && onToggleVisibility && (
          <button
            onClick={onToggleVisibility}
            className={`flex h-6 w-6 items-center justify-center rounded-full ${
              isHiddenFromPlayers
                ? 'bg-amber-500 text-white hover:bg-amber-600'
                : 'bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
            title={isHiddenFromPlayers ? 'Show to players' : 'Hide from players'}
          >
            {isHiddenFromPlayers ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
        {showControls && onRemove && (
          <button
            onClick={onRemove}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
            title="Remove from scene"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Hidden badge */}
      {isHiddenFromPlayers && (
        <div className="absolute left-2 top-2 z-10 flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-medium text-white">
          <EyeOff className="h-3 w-3" />
          <span>Hidden</span>
        </div>
      )}

      {/* Large image section */}
      <div className={`relative aspect-video w-full overflow-hidden bg-primary/10 ${isHiddenFromPlayers ? 'opacity-60' : ''}`}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={ship.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-primary">
            <Rocket className="h-20 w-20" />
          </div>
        )}

        {/* Damage badge */}
        {hasDamage && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-xs font-medium text-white">
            Damaged
          </div>
        )}
      </div>

      {/* Name and info section */}
      <div className="p-3">
        <h3 className="font-medium text-foreground">
          {ship.name}
        </h3>
        {(ship.type || ship.class) && (
          <p className="text-sm text-muted-foreground">
            {[ship.type, ship.class].filter(Boolean).join(' • ')}
          </p>
        )}

        {/* Pressure indicator */}
        {pressure > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`h-3 w-3 rounded-full border ${
                    i < pressure
                      ? 'border-amber-500 bg-amber-500'
                      : 'border-muted-foreground/30'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Disposition selector - only for DM */}
        {showControls && onUpdateDisposition && (
          <div className="mt-2 flex gap-1">
            <button
              onClick={() => onUpdateDisposition('hostile')}
              className={`flex-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
                disposition === 'hostile'
                  ? 'bg-red-500 text-white'
                  : 'bg-secondary text-muted-foreground hover:bg-red-500/20 hover:text-red-500'
              }`}
            >
              Hostile
            </button>
            <button
              onClick={() => onUpdateDisposition('neutral')}
              className={`flex-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
                disposition === 'neutral'
                  ? 'bg-gray-500 text-white'
                  : 'bg-secondary text-muted-foreground hover:bg-gray-500/20 hover:text-gray-500'
              }`}
            >
              Neutral
            </button>
            <button
              onClick={() => onUpdateDisposition('friendly')}
              className={`flex-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
                disposition === 'friendly'
                  ? 'bg-green-500 text-white'
                  : 'bg-secondary text-muted-foreground hover:bg-green-500/20 hover:text-green-500'
              }`}
            >
              Friendly
            </button>
          </div>
        )}

        {/* View Entry button - only show for DM */}
        {showControls && (
          <Link
            to={`/modules/ships/${ship.id}?from=live-play`}
            className="mt-3 flex items-center justify-center gap-1 rounded bg-secondary px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ExternalLink className="h-4 w-4" />
            View Entry
          </Link>
        )}
      </div>
    </div>
  );
}

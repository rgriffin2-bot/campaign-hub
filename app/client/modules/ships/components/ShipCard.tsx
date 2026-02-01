import { Link } from 'react-router-dom';
import { Rocket, EyeOff, Users, AlertTriangle, Eye, Plus, Minus } from 'lucide-react';
import { useCampaign } from '../../../core/providers/CampaignProvider';
import { useFiles } from '../../../hooks/useFiles';
import { useSceneShips } from '../../../core/providers/SceneShipsProvider';
import type { FileMetadata } from '@shared/types/file';
import type { ShipDamage } from '@shared/schemas/ship';

interface ShipCardProps {
  ship: FileMetadata;
}

export function ShipCard({ ship }: ShipCardProps) {
  const { campaign } = useCampaign();
  const { toggleVisibility } = useFiles('ships');
  const { addToScene, removeFromScene, isInScene } = useSceneShips();

  const isHidden = ship.hidden as boolean | undefined;
  const isCrewShip = ship.isCrewShip as boolean | undefined;
  const shipType = ship.type as string | undefined;
  const shipClass = ship.class as string | undefined;
  const image = ship.image as string | undefined;
  const characteristics = (ship.characteristics as string[]) || [];
  const damage = ship.damage as Record<string, { minor?: string; major?: string }> | undefined;
  const inScene = isInScene(ship.id);

  // Check if ship has any damage
  const hasDamage = damage && Object.values(damage).some(
    subsystem => subsystem?.minor || subsystem?.major
  );

  const imageUrl = image && campaign
    ? `/api/campaigns/${campaign.id}/assets/${image.replace('assets/', '')}`
    : null;

  const handleToggleVisibility = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleVisibility.mutate({ fileId: ship.id, hidden: !isHidden });
  };

  const handleToggleScene = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inScene) {
      removeFromScene(ship.id);
    } else {
      addToScene({
        id: ship.id,
        name: ship.name,
        type: shipType,
        class: shipClass,
        image,
        isCrewShip: isCrewShip || false,
        pressure: (ship.pressure as number) || 0,
        damage: damage as ShipDamage | undefined,
        visibleToPlayers: true,
      });
    }
  };

  return (
    <Link
      to={`/modules/ships/${ship.id}`}
      className={`group relative flex flex-col overflow-hidden rounded-lg border bg-card transition-all hover:border-primary/50 hover:shadow-md ${
        isHidden ? 'border-amber-500/30 opacity-75' : 'border-border'
      } ${isCrewShip ? 'ring-2 ring-primary/30' : ''}`}
    >
      {/* Status badges */}
      <div className="absolute right-2 top-2 z-10 flex gap-1">
        {hasDamage && !isHidden && (
          <div className="flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-xs font-medium text-white">
            <AlertTriangle className="h-3 w-3" />
          </div>
        )}
        {isHidden && (
          <div className="flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-medium text-white">
            <EyeOff className="h-3 w-3" />
            <span>Hidden</span>
          </div>
        )}
        {inScene && (
          <div className="flex items-center gap-1 rounded-full bg-green-500 px-2 py-0.5 text-xs font-medium text-white">
            <span>In Scene</span>
          </div>
        )}
      </div>

      {/* Crew Ship badge */}
      {isCrewShip && (
        <div className="absolute left-2 top-2 z-10 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
          <Users className="h-3 w-3" />
          <span>Crew</span>
        </div>
      )}

      {/* Image section */}
      <div className="relative aspect-video w-full overflow-hidden bg-primary/5">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={ship.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-primary/30">
            <Rocket className="h-16 w-16" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-foreground group-hover:text-primary">
              {ship.name}
            </h3>

            {/* Type and Class */}
            {(shipType || shipClass) && (
              <p className="mt-1 text-sm text-muted-foreground">
                {[shipType, shipClass].filter(Boolean).join(' • ')}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex shrink-0 gap-1">
            {/* Add to scene button */}
            <button
              onClick={handleToggleScene}
              className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                inScene
                  ? 'text-green-500 hover:bg-green-500/20'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
              title={inScene ? 'Remove from scene' : 'Add to scene'}
            >
              {inScene ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </button>

            {/* Visibility toggle button */}
            <button
              onClick={handleToggleVisibility}
              className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                isHidden
                  ? 'text-amber-500 hover:bg-amber-500/20'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
              title={isHidden ? 'Show to players' : 'Hide from players'}
            >
              {isHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Characteristics tags */}
        {characteristics.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {characteristics.slice(0, 3).map((char, i) => (
              <span
                key={i}
                className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground"
              >
                {char}
              </span>
            ))}
            {characteristics.length > 3 && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                +{characteristics.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

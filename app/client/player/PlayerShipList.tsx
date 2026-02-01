import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Rocket, Users, AlertTriangle } from 'lucide-react';
import { usePlayerFiles } from './hooks/usePlayerFiles';
import { useCampaign } from '../core/providers/CampaignProvider';
import type { ShipFrontmatter } from '@shared/schemas/ship';

export function PlayerShipList() {
  const { campaign } = useCampaign();
  const { list } = usePlayerFiles('ships');
  const [search, setSearch] = useState('');

  const ships = list.data || [];

  const filteredShips = ships.filter((ship) => {
    if (search === '') return true;

    const searchLower = search.toLowerCase();
    return (
      ship.name.toLowerCase().includes(searchLower) ||
      (ship.type as string | undefined)?.toLowerCase().includes(searchLower) ||
      (ship.class as string | undefined)?.toLowerCase().includes(searchLower) ||
      (ship.owner as string | undefined)?.toLowerCase().includes(searchLower) ||
      (ship.tags as string[] | undefined)?.some((tag) =>
        tag.toLowerCase().includes(searchLower)
      ) ||
      (ship.characteristics as string[] | undefined)?.some((char) =>
        char.toLowerCase().includes(searchLower)
      )
    );
  });

  if (list.isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Rocket className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Ships + Vehicles</h1>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search ships by name, type, class, or tags..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-input bg-background py-2 pl-10 pr-4 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Ship Grid */}
      {filteredShips.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 p-12 text-center">
          <Rocket className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            {ships.length === 0 ? 'No ships yet' : 'No matches found'}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {ships.length === 0
              ? 'The DM hasn\'t added any ships yet.'
              : 'Try adjusting your search.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredShips.map((ship) => {
            const fm = ship as unknown as ShipFrontmatter;
            const damage = fm.damage as Record<string, { minor?: string; major?: string }> | undefined;
            const hasDamage = damage && Object.values(damage).some(
              subsystem => subsystem?.minor || subsystem?.major
            );

            const imageUrl = fm.image && campaign
              ? `/api/campaigns/${campaign.id}/assets/${fm.image.replace('assets/', '')}`
              : null;

            return (
              <Link
                key={ship.id}
                to={`/player/modules/ships/${ship.id}`}
                className={`group relative flex flex-col overflow-hidden rounded-lg border bg-card transition-all hover:border-primary/50 hover:shadow-md ${
                  fm.isCrewShip ? 'ring-2 ring-primary/30 border-primary/30' : 'border-border'
                }`}
              >
                {/* Crew Ship badge */}
                {fm.isCrewShip && (
                  <div className="absolute left-2 top-2 z-10 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                    <Users className="h-3 w-3" />
                    <span>Crew</span>
                  </div>
                )}

                {/* Damage indicator */}
                {hasDamage && (
                  <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-xs font-medium text-white">
                    <AlertTriangle className="h-3 w-3" />
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
                  <h3 className="font-semibold text-foreground group-hover:text-primary">
                    {ship.name}
                  </h3>

                  {/* Type and Class */}
                  {(fm.type || fm.class) && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {[fm.type, fm.class].filter(Boolean).join(' • ')}
                    </p>
                  )}

                  {/* Characteristics tags */}
                  {fm.characteristics && fm.characteristics.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {fm.characteristics.slice(0, 3).map((char, i) => (
                        <span
                          key={i}
                          className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground"
                        >
                          {char}
                        </span>
                      ))}
                      {fm.characteristics.length > 3 && (
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                          +{fm.characteristics.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Count */}
      {filteredShips.length > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          Showing {filteredShips.length} of {ships.length} ships
        </p>
      )}
    </div>
  );
}

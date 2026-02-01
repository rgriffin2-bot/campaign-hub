import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Rocket, Users } from 'lucide-react';
import { useFiles } from '../../hooks/useFiles';
import { ShipCard } from './components/ShipCard';

export function ShipList() {
  const { list } = useFiles('ships');
  const [search, setSearch] = useState('');
  const [filterCrewShips, setFilterCrewShips] = useState(false);

  const ships = list.data || [];

  const filteredShips = ships.filter((ship) => {
    // Filter by crew ships toggle
    if (filterCrewShips && !ship.isCrewShip) return false;

    if (search === '') return true;

    const searchLower = search.toLowerCase();
    return (
      ship.name.toLowerCase().includes(searchLower) ||
      (ship.type as string | undefined)?.toLowerCase().includes(searchLower) ||
      (ship.class as string | undefined)?.toLowerCase().includes(searchLower) ||
      (ship.owner as string | undefined)?.toLowerCase().includes(searchLower) ||
      (ship.characteristics as string[] | undefined)?.some((char) =>
        char.toLowerCase().includes(searchLower)
      ) ||
      (ship.tags as string[] | undefined)?.some((tag) =>
        tag.toLowerCase().includes(searchLower)
      )
    );
  });

  // Sort crew ships first
  const sortedShips = [...filteredShips].sort((a, b) => {
    if (a.isCrewShip && !b.isCrewShip) return -1;
    if (!a.isCrewShip && b.isCrewShip) return 1;
    return a.name.localeCompare(b.name);
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Rocket className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Ships + Vehicles</h1>
        </div>
        <Link
          to="/modules/ships/new"
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Ship
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search ships by name, type, class, or characteristics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-input bg-background py-2 pl-10 pr-4 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <button
          onClick={() => setFilterCrewShips(!filterCrewShips)}
          className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
            filterCrewShips
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
          title="Show only crew ships"
        >
          <Users className="h-4 w-4" />
          Crew Ships
        </button>
      </div>

      {/* Ships Grid */}
      {sortedShips.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 p-12 text-center">
          <Rocket className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            {ships.length === 0 ? 'No ships yet' : 'No matches found'}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {ships.length === 0
              ? 'Add ships and vehicles to your campaign.'
              : 'Try adjusting your search or filters.'}
          </p>
          {ships.length === 0 && (
            <Link
              to="/modules/ships/new"
              className="mt-4 flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Add Ship
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedShips.map((ship) => (
            <ShipCard key={ship.id} ship={ship} />
          ))}
        </div>
      )}

      {/* Count */}
      {sortedShips.length > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          Showing {sortedShips.length} of {ships.length} ships
        </p>
      )}
    </div>
  );
}

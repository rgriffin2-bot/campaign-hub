import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, MapPin, LayoutGrid, List, Globe } from 'lucide-react';
import { useFiles } from '../../hooks/useFiles';
import { LocationCard } from './components/LocationCard';
import { LocationTree } from './components/LocationTree';
import { FullMapView } from './components/FullMapView';

type ViewMode = 'cards' | 'tree' | 'map';

export function LocationList() {
  const { list } = useFiles('locations');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('tree');

  const locations = list.data || [];

  const filteredLocations = locations.filter((location) => {
    if (search === '') return true;

    const searchLower = search.toLowerCase();
    return (
      location.name.toLowerCase().includes(searchLower) ||
      (location.type as string | undefined)
        ?.toLowerCase()
        .includes(searchLower) ||
      (location.description as string | undefined)
        ?.toLowerCase()
        .includes(searchLower) ||
      (location.tags as string[] | undefined)?.some((tag) =>
        tag.toLowerCase().includes(searchLower)
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MapPin className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Locations</h1>
        </div>
        <div className="flex gap-2">
          {/* View mode toggle */}
          <div className="flex rounded-md border border-border bg-secondary">
            <button
              onClick={() => setViewMode('tree')}
              className={`flex items-center gap-1.5 rounded-l-md px-3 py-2 text-sm font-medium transition-colors ${
                viewMode === 'tree'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Tree view"
            >
              <List className="h-4 w-4" />
              Tree
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                viewMode === 'cards'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Cards view"
            >
              <LayoutGrid className="h-4 w-4" />
              Cards
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 rounded-r-md px-3 py-2 text-sm font-medium transition-colors ${
                viewMode === 'map'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Map view"
            >
              <Globe className="h-4 w-4" />
              Map
            </button>
          </div>
          <Link
            to="/modules/locations/new"
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add Location
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search locations by name, type, or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-input bg-background py-2 pl-10 pr-4 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Location List/Grid/Map */}
      {locations.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 p-12 text-center">
          <MapPin className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            No locations yet
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Create your first location to build your world.
          </p>
          <div className="mt-4">
            <Link
              to="/modules/locations/new"
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Create Location
            </Link>
          </div>
        </div>
      ) : viewMode === 'map' ? (
        <FullMapView
          locations={locations}
          onClose={() => setViewMode('tree')}
        />
      ) : viewMode === 'tree' ? (
        <div className="rounded-lg border border-border bg-card p-4">
          <LocationTree locations={locations} searchTerm={search} />
        </div>
      ) : filteredLocations.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 p-12 text-center">
          <MapPin className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            No matches found
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Try adjusting your search.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredLocations.map((location) => (
            <LocationCard key={location.id} location={location} />
          ))}
        </div>
      )}

      {/* Count */}
      {locations.length > 0 && viewMode !== 'map' && (
        <p className="text-center text-sm text-muted-foreground">
          {viewMode === 'cards' && search
            ? `Showing ${filteredLocations.length} of ${locations.length} locations`
            : `${locations.length} location${locations.length === 1 ? '' : 's'}`}
        </p>
      )}
    </div>
  );
}

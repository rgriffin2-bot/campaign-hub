import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Search, Plus, ChevronRight, ChevronDown } from 'lucide-react';
import type { Location } from '../types';

interface LocationListProps {
  locations: Location[];
}

export function LocationList({ locations }: LocationListProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Filter locations
  const filteredLocations = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return locations;
    }

    const matches = new Set(
      locations
        .filter((loc) => {
          return (
            loc.name.toLowerCase().includes(query) ||
            (loc.description && loc.description.toLowerCase().includes(query))
          );
        })
        .map((loc) => loc.id)
    );

    const locationById = new Map(locations.map((loc) => [loc.id, loc]));
    const resultIds = new Set<string>(matches);

    matches.forEach((id) => {
      let current = locationById.get(id);
      while (current?.parent) {
        resultIds.add(current.parent);
        current = locationById.get(current.parent);
      }
    });

    return locations.filter((loc) => resultIds.has(loc.id));
  }, [locations, searchTerm]);

  const locationById = useMemo(
    () => new Map(filteredLocations.map((loc) => [loc.id, loc])),
    [filteredLocations]
  );

  const childrenByParent = useMemo(() => {
    const map = new Map<string | undefined, Location[]>();
    filteredLocations.forEach((location) => {
      const key = location.parent;
      const list = map.get(key) ?? [];
      list.push(location);
      map.set(key, list);
    });
    for (const list of map.values()) {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return map;
  }, [filteredLocations]);

  const rootLocations = useMemo(() => {
    return filteredLocations
      .filter((loc) => !loc.parent || !locationById.has(loc.parent))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredLocations, locationById]);

  // Helper to find parent location name
  const getParentName = (parentId: string | undefined) => {
    if (!parentId) return null;
    const parent = locations.find((loc) => loc.id === parentId);
    return parent?.name;
  };

  useEffect(() => {
    if (!searchTerm) {
      const initialExpanded = new Set(
        locations.filter((loc) => childrenByParent.get(loc.id)?.length).map((loc) => loc.id)
      );
      setExpandedIds(initialExpanded);
      return;
    }

    const parentsToExpand = new Set<string>();
    filteredLocations.forEach((loc) => {
      if (childrenByParent.get(loc.id)?.length) {
        parentsToExpand.add(loc.id);
      }
    });
    setExpandedIds(parentsToExpand);
  }, [childrenByParent, filteredLocations, locations, searchTerm]);

  function toggleExpanded(locationId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(locationId)) {
        next.delete(locationId);
      } else {
        next.add(locationId);
      }
      return next;
    });
  }

  function renderLocation(location: Location, depth: number) {
    const children = childrenByParent.get(location.id) ?? [];
    const isExpanded = expandedIds.has(location.id);
    const parentName = getParentName(location.parent);

    return (
      <div key={location.id} className="space-y-2">
        <div
          className="flex items-start gap-3 rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
          style={{ marginLeft: depth * 16 }}
        >
          <div className="flex items-center gap-2">
            {children.length > 0 ? (
              <button
                type="button"
                className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                onClick={() => toggleExpanded(location.id)}
                aria-label={isExpanded ? 'Collapse location' : 'Expand location'}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <span className="inline-flex h-6 w-6 items-center justify-center text-muted-foreground">
                <MapPin className="h-4 w-4" />
              </span>
            )}
          </div>
          <button
            type="button"
            className="flex flex-1 flex-col items-start text-left"
            onClick={() => navigate(`/locations/${location.id}`)}
          >
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold">{location.name}</h3>
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {location.location_type}
              </span>
              {parentName && (
                <span className="text-xs text-muted-foreground">Parent: {parentName}</span>
              )}
            </div>
            {location.description && (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                {location.description}
              </p>
            )}
            {location.tags && location.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {location.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full bg-secondary px-2 py-1 text-xs font-medium"
                  >
                    {tag}
                  </span>
                ))}
                {location.tags.length > 3 && (
                  <span className="inline-flex items-center rounded-full bg-secondary px-2 py-1 text-xs font-medium">
                    +{location.tags.length - 3}
                  </span>
                )}
              </div>
            )}
          </button>
        </div>
        {children.length > 0 && isExpanded && (
          <div className="space-y-2 border-l border-dashed border-muted pl-4">
            {children.map((child) => renderLocation(child, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Locations</h2>
        <Button onClick={() => navigate('/locations/new')}>
          <Plus className="mr-2 h-4 w-4" />
          New Location
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search locations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Location Stack */}
      {filteredLocations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No locations found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {searchTerm
              ? 'Try adjusting your search'
              : 'Get started by creating your first location'}
          </p>
          {!searchTerm && (
            <Button onClick={() => navigate('/locations/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Create Location
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {rootLocations.map((location) => renderLocation(location, 0))}
        </div>
      )}
    </div>
  );
}

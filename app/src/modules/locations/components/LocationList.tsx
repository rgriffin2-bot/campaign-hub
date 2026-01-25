import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Search, Plus } from 'lucide-react';
import type { Location } from '../types';

interface LocationListProps {
  locations: Location[];
}

export function LocationList({ locations }: LocationListProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  // Filter locations
  const filteredLocations = locations.filter((loc) => {
    const matchesSearch =
      loc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (loc.description && loc.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  // Helper to find parent location name
  const getParentName = (parentId: string | undefined) => {
    if (!parentId) return null;
    const parent = locations.find(loc => loc.id === parentId);
    return parent?.name;
  };

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

      {/* Location Grid */}
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredLocations.map((location) => {
            const parentName = getParentName(location.parent);
            return (
              <Card
                key={location.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/locations/${location.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{location.name}</CardTitle>
                      <CardDescription>
                        {location.location_type.charAt(0).toUpperCase() + location.location_type.slice(1)}
                        {parentName && ` • ${parentName}`}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                {location.description && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {location.description}
                    </p>
                  </CardContent>
                )}
                {location.tags && location.tags.length > 0 && (
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-1">
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
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

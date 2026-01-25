import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Compass, Search, Plus } from 'lucide-react';
import type { MapEntry } from '../types';

interface MapListProps {
  maps: MapEntry[];
}

export function MapList({ maps }: MapListProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredMaps = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return maps.filter((map) => {
      if (!query) return true;
      return (
        map.name.toLowerCase().includes(query) ||
        (map.description && map.description.toLowerCase().includes(query)) ||
        (map.location && map.location.toLowerCase().includes(query)) ||
        (map.map_type && map.map_type.toLowerCase().includes(query))
      );
    });
  }, [maps, searchTerm]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Maps</h2>
        <Button onClick={() => navigate('/maps/new')}>
          <Plus className="mr-2 h-4 w-4" />
          New Map
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search maps..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {filteredMaps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Compass className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No maps found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {searchTerm
              ? 'Try adjusting your search'
              : 'Get started by creating your first map'}
          </p>
          {!searchTerm && (
            <Button onClick={() => navigate('/maps/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Create Map
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredMaps.map((map) => (
            <Card
              key={map.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(`/maps/${map.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{map.name}</CardTitle>
                    <CardDescription>
                      {map.map_type ? map.map_type : 'Map'}
                      {map.location && ` • ${map.location}`}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              {map.description && (
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {map.description}
                  </p>
                </CardContent>
              )}
              {map.tags && map.tags.length > 0 && (
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-1">
                    {map.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full bg-secondary px-2 py-1 text-xs font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                    {map.tags.length > 3 && (
                      <span className="inline-flex items-center rounded-full bg-secondary px-2 py-1 text-xs font-medium">
                        +{map.tags.length - 3}
                      </span>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

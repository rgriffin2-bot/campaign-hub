import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Shield, Search, Plus } from 'lucide-react';
import type { Faction } from '../types';
import { useCampaign } from '@/core/context/CampaignContext';

interface FactionListProps {
  factions: Faction[];
}

export function FactionList({ factions }: FactionListProps) {
  const navigate = useNavigate();
  const { currentCampaign } = useCampaign();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const factionTypes =
    currentCampaign?.entity_types?.faction_types?.map((type) => type.id) ?? [
      'government',
      'corporation',
      'guild',
      'cult',
      'military',
      'criminal',
      'other',
    ];

  const filteredFactions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return factions.filter((faction) => {
      const matchesSearch =
        !query ||
        faction.name.toLowerCase().includes(query) ||
        (faction.description && faction.description.toLowerCase().includes(query));
      const matchesType = filterType === 'all' || faction.faction_type === filterType;
      return matchesSearch && matchesType;
    });
  }, [factions, filterType, searchTerm]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Factions</h2>
        <Button onClick={() => navigate('/factions/new')}>
          <Plus className="mr-2 h-4 w-4" />
          New Faction
        </Button>
      </div>

      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search factions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={filterType === 'all' ? 'default' : 'outline'}
            onClick={() => setFilterType('all')}
          >
            All
          </Button>
          {factionTypes.map((type) => (
            <Button
              key={type}
              variant={filterType === type ? 'default' : 'outline'}
              onClick={() => setFilterType(type)}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {filteredFactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Shield className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No factions found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {searchTerm || filterType !== 'all'
              ? 'Try adjusting your filters'
              : 'Get started by creating your first faction'}
          </p>
          {!searchTerm && filterType === 'all' && (
            <Button onClick={() => navigate('/factions/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Create Faction
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredFactions.map((faction) => (
            <Card
              key={faction.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(`/factions/${faction.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{faction.name}</CardTitle>
                    <CardDescription className="capitalize">
                      {faction.faction_type}
                      {faction.motto && ` • ${faction.motto}`}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              {faction.description && (
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {faction.description}
                  </p>
                </CardContent>
              )}
              {faction.tags && faction.tags.length > 0 && (
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-1">
                    {faction.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full bg-secondary px-2 py-1 text-xs font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                    {faction.tags.length > 3 && (
                      <span className="inline-flex items-center rounded-full bg-secondary px-2 py-1 text-xs font-medium">
                        +{faction.tags.length - 3}
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

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Users, Search, Plus } from 'lucide-react';
import type { Character } from '../types';

interface CharacterListProps {
  characters: Character[];
}

export function CharacterList({ characters }: CharacterListProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  // Filter characters
  const filteredCharacters = characters.filter((char) => {
    const matchesSearch = char.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType =
      filterType === 'all' || char.character_type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Characters</h2>
        <Button onClick={() => navigate('/characters/new')}>
          <Plus className="mr-2 h-4 w-4" />
          New Character
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search characters..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filterType === 'all' ? 'default' : 'outline'}
            onClick={() => setFilterType('all')}
          >
            All
          </Button>
          <Button
            variant={filterType === 'pc' ? 'default' : 'outline'}
            onClick={() => setFilterType('pc')}
          >
            PCs
          </Button>
          <Button
            variant={filterType === 'npc' ? 'default' : 'outline'}
            onClick={() => setFilterType('npc')}
          >
            NPCs
          </Button>
        </div>
      </div>

      {/* Character Grid */}
      {filteredCharacters.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No characters found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {searchTerm || filterType !== 'all'
              ? 'Try adjusting your filters'
              : 'Get started by creating your first character'}
          </p>
          {!searchTerm && filterType === 'all' && (
            <Button onClick={() => navigate('/characters/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Create Character
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCharacters.map((character) => (
            <Card
              key={character.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(`/characters/${character.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{character.name}</CardTitle>
                    <CardDescription>
                      {character.character_type === 'pc'
                        ? `PC ${character.player ? `(${character.player})` : ''}`
                        : character.character_type === 'npc'
                        ? 'NPC'
                        : 'Historical Figure'}
                    </CardDescription>
                  </div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {character.status || 'unknown'}
                  </div>
                </div>
              </CardHeader>
              {character.description && (
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {character.description}
                  </p>
                </CardContent>
              )}
              {character.tags && character.tags.length > 0 && (
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-1">
                    {character.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full bg-secondary px-2 py-1 text-xs font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                    {character.tags.length > 3 && (
                      <span className="inline-flex items-center rounded-full bg-secondary px-2 py-1 text-xs font-medium">
                        +{character.tags.length - 3}
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

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BookOpen, Search, Plus } from 'lucide-react';
import type { LoreEntry } from '../types';

interface LoreListProps {
  loreEntries: LoreEntry[];
}

export function LoreList({ loreEntries }: LoreListProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const loreTypes = ['all', 'history', 'culture', 'technology', 'religion', 'geography', 'rules', 'other'];

  // Filter lore entries
  const filteredEntries = loreEntries.filter((entry) => {
    const matchesSearch =
      entry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entry.description && entry.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType =
      filterType === 'all' || entry.lore_type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Lore</h2>
        <Button onClick={() => navigate('/lore/new')}>
          <Plus className="mr-2 h-4 w-4" />
          New Lore Entry
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search lore..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {loreTypes.map(type => (
            <Button
              key={type}
              variant={filterType === type ? 'default' : 'outline'}
              onClick={() => setFilterType(type)}
            >
              {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Lore Grid */}
      {filteredEntries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No lore entries found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {searchTerm || filterType !== 'all'
              ? 'Try adjusting your filters'
              : 'Get started by creating your first lore entry'}
          </p>
          {!searchTerm && filterType === 'all' && (
            <Button onClick={() => navigate('/lore/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Create Lore Entry
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredEntries.map((entry) => (
            <Card
              key={entry.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(`/lore/${entry.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{entry.name}</CardTitle>
                    <CardDescription className="capitalize">
                      {entry.lore_type}
                      {(entry as any).era && ` • ${(entry as any).era}`}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              {entry.description && (
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {entry.description}
                  </p>
                </CardContent>
              )}
              {entry.tags && entry.tags.length > 0 && (
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-1">
                    {entry.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full bg-secondary px-2 py-1 text-xs font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                    {entry.tags.length > 3 && (
                      <span className="inline-flex items-center rounded-full bg-secondary px-2 py-1 text-xs font-medium">
                        +{entry.tags.length - 3}
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

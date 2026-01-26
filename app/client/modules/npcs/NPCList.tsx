import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Users, Sparkles } from 'lucide-react';
import { useFiles } from '../../hooks/useFiles';
import { NPCCard } from './components/NPCCard';

export function NPCList() {
  const { list } = useFiles('npcs');
  const [search, setSearch] = useState('');

  const npcs = list.data || [];

  const filteredNPCs = npcs.filter((npc) => {
    if (search === '') return true;

    const searchLower = search.toLowerCase();
    return (
      npc.name.toLowerCase().includes(searchLower) ||
      (npc.occupation as string | undefined)?.toLowerCase().includes(searchLower) ||
      (npc.location as string | undefined)?.toLowerCase().includes(searchLower) ||
      (npc.personality as string | undefined)?.toLowerCase().includes(searchLower) ||
      (npc.tags as string[] | undefined)?.some((tag) =>
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
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">NPCs</h1>
        </div>
        <div className="flex gap-2">
          <Link
            to="/modules/npcs/generate"
            className="flex items-center gap-2 rounded-md bg-secondary px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Sparkles className="h-4 w-4" />
            Generate
          </Link>
          <Link
            to="/modules/npcs/new"
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add NPC
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search NPCs by name, occupation, location, or tags..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-input bg-background py-2 pl-10 pr-4 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* NPC Grid */}
      {filteredNPCs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 p-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            {npcs.length === 0 ? 'No NPCs yet' : 'No matches found'}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {npcs.length === 0
              ? 'Create your first NPC to populate your world.'
              : 'Try adjusting your search.'}
          </p>
          {npcs.length === 0 && (
            <div className="mt-4 flex gap-2">
              <Link
                to="/modules/npcs/generate"
                className="flex items-center gap-2 rounded-md bg-secondary px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                <Sparkles className="h-4 w-4" />
                Generate with AI
              </Link>
              <Link
                to="/modules/npcs/new"
                className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                Create Manually
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredNPCs.map((npc) => (
            <NPCCard key={npc.id} npc={npc} />
          ))}
        </div>
      )}

      {/* Count */}
      {filteredNPCs.length > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          Showing {filteredNPCs.length} of {npcs.length} NPCs
        </p>
      )}
    </div>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Users, User, MapPin } from 'lucide-react';
import { usePlayerFiles } from './hooks/usePlayerFiles';
import { useCampaign } from '../core/providers/CampaignProvider';
import type { NPCFrontmatter } from '@shared/schemas/npc';

export function PlayerNPCList() {
  const { campaign } = useCampaign();
  const { list } = usePlayerFiles('npcs');
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
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">NPCs</h1>
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
              ? 'The DM hasn\'t added any NPCs yet.'
              : 'Try adjusting your search.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredNPCs.map((npc) => {
            const fm = npc as unknown as NPCFrontmatter;
            return (
              <Link
                key={npc.id}
                to={`/player/modules/npcs/${npc.id}`}
                className="group rounded-lg border border-border bg-card transition-colors hover:border-primary/50 hover:bg-accent"
              >
                <div className="flex items-start gap-3 p-4">
                  {/* Portrait */}
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-primary/10">
                    {fm.portrait && campaign ? (
                      <div
                        className="absolute h-full w-full"
                        style={{
                          backgroundImage: `url(/api/campaigns/${campaign.id}/assets/${fm.portrait.replace('assets/', '')})`,
                          backgroundSize: fm.portraitPosition
                            ? `${100 * fm.portraitPosition.scale}%`
                            : '100%',
                          backgroundPosition: fm.portraitPosition
                            ? `${50 + fm.portraitPosition.x}% ${50 + fm.portraitPosition.y}%`
                            : 'center',
                          backgroundRepeat: 'no-repeat',
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-primary">
                        <User className="h-7 w-7" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-medium text-foreground group-hover:text-primary">
                      {npc.name}
                    </h3>
                    {fm.occupation && (
                      <p className="truncate text-sm text-muted-foreground">
                        {fm.occupation}
                      </p>
                    )}
                    {fm.location && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{fm.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
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

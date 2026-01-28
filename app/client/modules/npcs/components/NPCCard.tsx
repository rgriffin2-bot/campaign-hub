import { Link } from 'react-router-dom';
import { User, Eye, EyeOff, MapPin } from 'lucide-react';
import { useCampaign } from '../../../core/providers/CampaignProvider';
import { useFiles } from '../../../hooks/useFiles';
import type { FileMetadata } from '@shared/types/file';

interface NPCCardProps {
  npc: FileMetadata;
}

export function NPCCard({ npc }: NPCCardProps) {
  const { campaign } = useCampaign();
  const { toggleVisibility } = useFiles('npcs');

  const isHidden = npc.hidden === true;

  // Get portrait URL if available
  const portrait = npc.portrait as string | undefined;
  const portraitPosition = npc.portraitPosition as { x: number; y: number; scale: number } | undefined;
  const portraitUrl = portrait && campaign
    ? `/api/campaigns/${campaign.id}/assets/${portrait.replace('assets/', '')}`
    : null;

  const location = npc.location as string | undefined;

  const handleToggleVisibility = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleVisibility.mutate({ fileId: npc.id, hidden: !isHidden });
  };

  return (
    <Link
      to={`/modules/npcs/${npc.id}`}
      className={`group relative rounded-lg border bg-card transition-colors hover:border-primary/50 hover:bg-accent ${
        isHidden ? 'border-amber-500/50 bg-amber-500/5' : 'border-border'
      }`}
    >
      {/* Hidden indicator badge */}
      {isHidden && (
        <div className="absolute -right-2 -top-2 flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-medium text-white shadow-sm">
          <EyeOff className="h-3 w-3" />
          <span>Hidden</span>
        </div>
      )}

      <div className="flex items-start gap-3 p-4">
        {/* Portrait */}
        <div className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-full ${isHidden ? 'opacity-60' : ''} bg-primary/10`}>
          {portraitUrl ? (
            <div
              className="absolute h-full w-full"
              style={{
                backgroundImage: `url(${portraitUrl})`,
                backgroundSize: portraitPosition
                  ? `${100 * portraitPosition.scale}%`
                  : '100%',
                backgroundPosition: portraitPosition
                  ? `${50 + portraitPosition.x}% ${50 + portraitPosition.y}%`
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
          <h3 className={`truncate font-medium group-hover:text-primary ${isHidden ? 'text-muted-foreground' : 'text-foreground'}`}>
            {npc.name}
          </h3>
          {npc.occupation ? (
            <p className="truncate text-sm text-muted-foreground">
              {String(npc.occupation)}
            </p>
          ) : null}
          {location && (
            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{location}</span>
            </div>
          )}
        </div>

        {/* Visibility toggle button */}
        <button
          onClick={handleToggleVisibility}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors ${
            isHidden
              ? 'text-amber-500 hover:bg-amber-500/20'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
          title={isHidden ? 'Show to players' : 'Hide from players'}
        >
          {isHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </Link>
  );
}

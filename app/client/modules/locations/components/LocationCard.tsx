import { Link } from 'react-router-dom';
import { MapPin, Eye, EyeOff } from 'lucide-react';
import { useCampaign } from '../../../core/providers/CampaignProvider';
import { useFiles } from '../../../hooks/useFiles';
import type { FileMetadata } from '@shared/types/file';

interface LocationCardProps {
  location: FileMetadata;
}

export function LocationCard({ location }: LocationCardProps) {
  const { campaign } = useCampaign();
  const { toggleVisibility } = useFiles('locations');

  const isHidden = location.hidden === true;

  // Get image URL if available
  const image = location.image as string | undefined;
  const imageUrl =
    image && campaign
      ? `/api/campaigns/${campaign.id}/assets/${image.replace('assets/', '')}`
      : null;

  const locationType = location.type as string | undefined;
  const description = location.description as string | undefined;

  const handleToggleVisibility = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleVisibility.mutate({ fileId: location.id, hidden: !isHidden });
  };

  return (
    <Link
      to={`/modules/locations/${location.id}`}
      className={`group relative rounded-lg border bg-card overflow-hidden transition-colors hover:border-primary/50 hover:bg-accent ${
        isHidden ? 'border-amber-500/50 bg-amber-500/5' : 'border-border'
      }`}
    >
      {/* Hidden indicator badge */}
      {isHidden && (
        <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-medium text-white shadow-sm">
          <EyeOff className="h-3 w-3" />
          <span>Hidden</span>
        </div>
      )}

      {/* Landscape Image or Placeholder */}
      <div
        className={`relative h-32 w-full ${isHidden ? 'opacity-60' : ''} bg-primary/5`}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={location.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-primary/30">
            <MapPin className="h-12 w-12" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex items-start gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3
              className={`truncate font-medium group-hover:text-primary ${isHidden ? 'text-muted-foreground' : 'text-foreground'}`}
            >
              {location.name}
            </h3>
            {locationType && (
              <span className="shrink-0 rounded bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                {locationType}
              </span>
            )}
          </div>
          {description && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {description}
            </p>
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
          {isHidden ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
    </Link>
  );
}

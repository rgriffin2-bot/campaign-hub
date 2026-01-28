import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, ChevronRight } from 'lucide-react';
import { usePlayerFiles } from './hooks/usePlayerFiles';
import { useCampaign } from '../core/providers/CampaignProvider';
import { MarkdownContent } from '../components/MarkdownContent';
import type { LocationFrontmatter } from '@shared/schemas/location';

export function PlayerLocationDetail() {
  const { fileId } = useParams<{ fileId: string }>();
  const { campaign } = useCampaign();
  const { get, list } = usePlayerFiles('locations');

  const { data: location, isLoading } = get(fileId || '');
  const allLocations = list.data || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!location) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <MapPin className="h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold text-foreground">
          Location not found
        </h3>
        <Link
          to="/player/modules/locations"
          className="mt-4 text-primary hover:underline"
        >
          Back to Locations
        </Link>
      </div>
    );
  }

  const { content } = location;
  const frontmatter = location.frontmatter as unknown as LocationFrontmatter;

  // Build breadcrumb
  const ancestors: { id: string; name: string }[] = [];
  let currentParentId = frontmatter.parent;
  while (currentParentId) {
    const parent = allLocations.find((loc) => loc.id === currentParentId);
    if (!parent) break;
    ancestors.unshift({ id: parent.id, name: parent.name });
    currentParentId = parent.parent as string | undefined;
    if (ancestors.length > 20) break;
  }

  // Get child locations
  const childLocations = allLocations.filter(
    (loc) => loc.parent === frontmatter.id
  );

  // Get image URL
  const imageUrl =
    frontmatter.image && campaign
      ? `/api/campaigns/${campaign.id}/assets/${frontmatter.image.replace('assets/', '')}`
      : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back link */}
      <Link
        to="/player/modules/locations"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Locations
      </Link>

      {/* Breadcrumb */}
      {ancestors.length > 0 && (
        <nav className="flex items-center gap-1 text-sm">
          <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
          {ancestors.map((ancestor) => (
            <span key={ancestor.id} className="flex items-center gap-1">
              <Link
                to={`/player/modules/locations/${ancestor.id}`}
                className="text-muted-foreground transition-colors hover:text-primary hover:underline"
              >
                {ancestor.name}
              </Link>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </span>
          ))}
          <span className="font-medium text-foreground">{frontmatter.name}</span>
        </nav>
      )}

      {/* Hero Image */}
      {imageUrl && (
        <div className="overflow-hidden rounded-lg border border-border">
          <img
            src={imageUrl}
            alt={frontmatter.name}
            className="h-64 w-full object-cover"
          />
        </div>
      )}

      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          {frontmatter.type && (
            <span className="rounded bg-secondary px-2 py-1 text-xs font-medium text-muted-foreground">
              {frontmatter.type}
            </span>
          )}
        </div>
        <h1 className="mt-2 text-2xl font-bold text-foreground">
          {frontmatter.name}
        </h1>
        {frontmatter.description && (
          <p className="mt-2 text-muted-foreground">{frontmatter.description}</p>
        )}
        {frontmatter.tags && frontmatter.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {frontmatter.tags.map((tag) => (
              <span
                key={tag}
                className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Child Locations */}
      {childLocations.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 font-medium text-foreground">
            Locations Within ({childLocations.length})
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {childLocations.map((child) => (
              <Link
                key={child.id}
                to={`/player/modules/locations/${child.id}`}
                className="flex items-center gap-2 rounded-md border border-border bg-background p-3 transition-colors hover:border-primary/50 hover:bg-accent"
              >
                <MapPin className="h-4 w-4 text-primary" />
                <span className="font-medium text-foreground">{child.name}</span>
                {child.type ? (
                  <span className="ml-auto rounded bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                    {String(child.type)}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {content && (
        <div className="rounded-lg border border-border bg-card p-6">
          <MarkdownContent content={content} linkBasePath="/player/modules" />
        </div>
      )}
    </div>
  );
}

import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, MapPin, Lock, Eye, EyeOff } from 'lucide-react';
import { useFiles } from '../../hooks/useFiles';
import { useCampaign } from '../../core/providers/CampaignProvider';
import { MarkdownContent } from '../../components/MarkdownContent';
import { CopyableId } from '../../components/CopyableId';
import { LocationBreadcrumb } from './components/LocationBreadcrumb';
import type { LocationFrontmatter } from '@shared/schemas/location';

export function LocationDetail() {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const { campaign } = useCampaign();
  const { get, delete: deleteMutation, toggleVisibility, list } = useFiles('locations');

  const { data: location, isLoading } = get(fileId || '');
  const allLocations = list.data || [];

  const handleDelete = async () => {
    if (!fileId) return;
    if (!confirm('Are you sure you want to delete this location?')) return;

    await deleteMutation.mutateAsync(fileId);
    navigate('/modules/locations');
  };

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
          to="/modules/locations"
          className="mt-4 text-primary hover:underline"
        >
          Back to Locations
        </Link>
      </div>
    );
  }

  const { content } = location;
  const frontmatter = location.frontmatter as unknown as LocationFrontmatter;
  const dmOnly = frontmatter.dmOnly;
  const isHidden = frontmatter.hidden === true;

  // Get child locations
  const childLocations = allLocations.filter(
    (loc) => loc.parent === frontmatter.id
  );

  const handleToggleVisibility = () => {
    if (!fileId) return;
    toggleVisibility.mutate({ fileId, hidden: !isHidden });
  };

  // Get image URL if available
  const imageUrl =
    frontmatter.image && campaign
      ? `/api/campaigns/${campaign.id}/assets/${frontmatter.image.replace('assets/', '')}`
      : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Back link */}
      <Link
        to="/modules/locations"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Locations
      </Link>

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

      {/* Header Card */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MapPin className="h-6 w-6" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">
                  {frontmatter.name}
                </h1>
                {frontmatter.type && (
                  <span className="rounded bg-secondary px-2 py-1 text-xs font-medium text-muted-foreground">
                    {frontmatter.type}
                  </span>
                )}
              </div>

              {/* Parent location breadcrumb */}
              {frontmatter.parent && (
                <div className="mt-2">
                  <LocationBreadcrumb
                    currentLocation={{
                      id: frontmatter.id,
                      name: frontmatter.name,
                      parent: frontmatter.parent,
                    }}
                    allLocations={allLocations}
                  />
                </div>
              )}

              {frontmatter.description && (
                <p className="mt-2 text-muted-foreground">
                  {frontmatter.description}
                </p>
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

              <div className="mt-3">
                <CopyableId moduleType="locations" id={fileId || ''} />
              </div>
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            {/* Visibility toggle */}
            <button
              onClick={handleToggleVisibility}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isHidden
                  ? 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30'
                  : 'bg-secondary text-foreground hover:bg-accent'
              }`}
              title={isHidden ? 'Show to players' : 'Hide from players'}
            >
              {isHidden ? (
                <>
                  <EyeOff className="h-4 w-4" />
                  Hidden
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  Visible
                </>
              )}
            </button>
            <Link
              to={`/modules/locations/${fileId}/edit`}
              className="flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Link>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>
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
                to={`/modules/locations/${child.id}`}
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

      {/* DM Only Section */}
      {dmOnly && (dmOnly.secrets || dmOnly.plotHooks || dmOnly.notes) && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-500">
            <Lock className="h-4 w-4" />
            DM Only
          </div>

          {dmOnly.plotHooks && (
            <div className="mt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Plot Hooks
              </p>
              <p className="mt-1 text-foreground">{dmOnly.plotHooks}</p>
            </div>
          )}

          {dmOnly.secrets && (
            <div className="mt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Secrets
              </p>
              <p className="mt-1 text-foreground">{dmOnly.secrets}</p>
            </div>
          )}

          {dmOnly.notes && (
            <div className="mt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                DM Notes
              </p>
              <p className="mt-1 text-foreground">{dmOnly.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Additional Notes */}
      {content && (
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 font-medium text-foreground">Additional Notes</h3>
          <MarkdownContent content={content} />
        </div>
      )}
    </div>
  );
}

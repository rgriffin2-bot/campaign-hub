import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Rocket, Lock, Eye, EyeOff, Users, Sparkles } from 'lucide-react';
import { useFiles } from '../../hooks/useFiles';
import { useCampaign } from '../../core/providers/CampaignProvider';
import { MarkdownContent } from '../../components/MarkdownContent';
import { CopyableId } from '../../components/CopyableId';
import { ShipDamageTracker } from './components/ShipDamageTracker';
import { PressureTracker } from '../player-characters/components/TrackerRow';
import type { ShipFrontmatter, ShipDamage } from '@shared/schemas/ship';

export function ShipDetail() {
  const { fileId } = useParams<{ fileId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { campaign } = useCampaign();

  // Check if we came from live-play
  const fromLivePlay = searchParams.get('from') === 'live-play';
  const { get, delete: deleteMutation, toggleVisibility, update } = useFiles('ships');

  const { data: ship, isLoading } = get(fileId || '');

  const handleDelete = async () => {
    if (!fileId) return;
    if (!confirm('Are you sure you want to delete this ship?')) return;

    await deleteMutation.mutateAsync(fileId);
    navigate('/modules/ships');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!ship) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <Rocket className="h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold text-foreground">
          Ship not found
        </h3>
        <Link
          to="/modules/ships"
          className="mt-4 text-primary hover:underline"
        >
          Back to Ships
        </Link>
      </div>
    );
  }

  const { content } = ship;
  const frontmatter = ship.frontmatter as unknown as ShipFrontmatter;
  const dmOnly = frontmatter.dmOnly;
  const isHidden = frontmatter.hidden === true;
  const isCrewShip = frontmatter.isCrewShip === true;

  const handleToggleVisibility = () => {
    if (!fileId) return;
    toggleVisibility.mutate({ fileId, hidden: !isHidden });
  };

  const handlePressureChange = (pressure: number) => {
    if (!fileId) return;
    update.mutate({ fileId, input: { frontmatter: { pressure } } });
  };

  const handleDamageChange = (damage: ShipDamage) => {
    if (!fileId) return;
    update.mutate({ fileId, input: { frontmatter: { damage } } });
  };

  const imageUrl = frontmatter.image && campaign
    ? `/api/campaigns/${campaign.id}/assets/${frontmatter.image.replace('assets/', '')}`
    : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Back link */}
      <Link
        to={fromLivePlay ? '/modules/live-play' : '/modules/ships'}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {fromLivePlay ? 'Back to Live Play' : 'Back to Ships'}
      </Link>

      {/* Header Card */}
      <div className={`rounded-lg border bg-card p-6 ${isCrewShip ? 'border-primary/50 ring-2 ring-primary/20' : 'border-border'}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            {/* Ship Image */}
            <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-lg bg-primary/10">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={frontmatter.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-primary">
                  <Rocket className="h-12 w-12" />
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">
                  {frontmatter.name}
                </h1>
                {isCrewShip && (
                  <span className="flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                    <Users className="h-3 w-3" />
                    Crew Ship
                  </span>
                )}
              </div>
              {(frontmatter.type || frontmatter.class) && (
                <p className="text-lg text-muted-foreground">
                  {[frontmatter.type, frontmatter.class].filter(Boolean).join(' • ')}
                </p>
              )}
              {frontmatter.owner && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Owner: {frontmatter.owner}
                </p>
              )}
              {frontmatter.characteristics && frontmatter.characteristics.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {frontmatter.characteristics.map((char, i) => (
                    <span
                      key={i}
                      className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary"
                    >
                      {char}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-3">
                <CopyableId moduleType="ships" id={fileId || ''} />
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
              to={`/modules/ships/${fileId}/edit`}
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

      {/* Ship Status Section - Pressure and Damage */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Pressure */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Ship Pressure
          </h3>
          <PressureTracker
            value={frontmatter.pressure || 0}
            editable
            onChange={handlePressureChange}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            At five, trigger minor damage and clear.
          </p>
        </div>

        {/* Damage Tracker */}
        <div className="rounded-lg border border-border bg-card p-4">
          <ShipDamageTracker
            damage={frontmatter.damage || {}}
            editable
            onChange={handleDamageChange}
          />
        </div>
      </div>

      {/* Appearance */}
      {frontmatter.appearance && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Appearance
          </h4>
          <p className="mt-2 text-sm text-foreground">{frontmatter.appearance}</p>
        </div>
      )}

      {/* DM Only Section */}
      {dmOnly && (dmOnly.secrets || dmOnly.notes) && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-500">
            <Lock className="h-4 w-4" />
            DM Only
          </div>

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

      {/* General Notes */}
      {frontmatter.notes && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Notes
          </h4>
          <div className="mt-2">
            <MarkdownContent content={frontmatter.notes} />
          </div>
        </div>
      )}

      {/* Additional Content */}
      {content && (
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 font-medium text-foreground">Additional Information</h3>
          <MarkdownContent content={content} />
        </div>
      )}
    </div>
  );
}

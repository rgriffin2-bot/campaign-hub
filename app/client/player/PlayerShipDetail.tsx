import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Rocket, Users, Sparkles } from 'lucide-react';
import { usePlayerFiles } from './hooks/usePlayerFiles';
import { useCampaign } from '../core/providers/CampaignProvider';
import { MarkdownContent } from '../components/MarkdownContent';
import { ShipDamageTracker } from '../modules/ships/components/ShipDamageTracker';
import { PressureTracker } from '../modules/player-characters/components/TrackerRow';
import type { ShipFrontmatter, ShipDamage } from '@shared/schemas/ship';

export function PlayerShipDetail() {
  const { fileId } = useParams<{ fileId: string }>();
  const { campaign } = useCampaign();
  const { get } = usePlayerFiles('ships');

  const { data: ship, isLoading } = get(fileId || '');

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
          to="/player/modules/ships"
          className="mt-4 text-primary hover:underline"
        >
          Back to Ships
        </Link>
      </div>
    );
  }

  const { content } = ship;
  const frontmatter = ship.frontmatter as unknown as ShipFrontmatter;
  const isCrewShip = frontmatter.isCrewShip === true;

  const imageUrl = frontmatter.image && campaign
    ? `/api/campaigns/${campaign.id}/assets/${frontmatter.image.replace('assets/', '')}`
    : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Back link */}
      <Link
        to="/player/modules/ships"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Ships
      </Link>

      {/* Header Card */}
      <div className={`rounded-lg border bg-card p-6 ${isCrewShip ? 'border-primary/50 ring-2 ring-primary/20' : 'border-border'}`}>
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
          </div>
        </div>
      </div>

      {/* Ship Status Section - Pressure and Damage (read-only) */}
      {isCrewShip && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Pressure */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Ship Pressure
            </h3>
            <PressureTracker
              value={frontmatter.pressure || 0}
              editable={false}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              At five, trigger minor damage and clear.
            </p>
          </div>

          {/* Damage Tracker */}
          <div className="rounded-lg border border-border bg-card p-4">
            <ShipDamageTracker
              damage={frontmatter.damage || {}}
              editable={false}
            />
          </div>
        </div>
      )}

      {/* Appearance */}
      {frontmatter.appearance && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Appearance
          </h4>
          <p className="mt-2 text-sm text-foreground">{frontmatter.appearance}</p>
        </div>
      )}

      {/* General Notes */}
      {frontmatter.notes && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Notes
          </h4>
          <div className="mt-2">
            <MarkdownContent content={frontmatter.notes} linkBasePath="/player/modules" />
          </div>
        </div>
      )}

      {/* Additional Content */}
      {content && (
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 font-medium text-foreground">Additional Information</h3>
          <MarkdownContent content={content} linkBasePath="/player/modules" />
        </div>
      )}
    </div>
  );
}

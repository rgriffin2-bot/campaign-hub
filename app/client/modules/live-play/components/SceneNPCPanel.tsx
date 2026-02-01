import { Link } from 'react-router-dom';
import { User, X, Shield, Heart, Minus, Plus, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { useCampaign } from '../../../core/providers/CampaignProvider';
import type { SceneNPC, Disposition } from '../../../core/providers/SceneNPCsProvider';

interface SceneNPCPanelProps {
  npc: SceneNPC;
  onRemove?: () => void;
  onUpdateStats?: (updates: Partial<SceneNPC['stats']>) => void;
  onUpdateDisposition?: (disposition: Disposition) => void;
  onToggleVisibility?: () => void;
  compact?: boolean;
  showStats?: boolean; // Whether to show health/armor (false for players)
}

// Get border color based on disposition
function getDispositionBorderClass(disposition?: Disposition, isHidden?: boolean): string {
  if (isHidden) return 'border-amber-500/50';
  switch (disposition) {
    case 'hostile':
      return 'border-red-500/50';
    case 'friendly':
      return 'border-green-500/50';
    case 'neutral':
    default:
      return 'border-border';
  }
}

// Get background tint based on disposition
function getDispositionBgClass(disposition?: Disposition, isHidden?: boolean): string {
  if (isHidden) return 'bg-amber-500/5';
  switch (disposition) {
    case 'hostile':
      return 'bg-red-500/5';
    case 'friendly':
      return 'bg-green-500/5';
    case 'neutral':
    default:
      return 'bg-card';
  }
}

export function SceneNPCPanel({
  npc,
  onRemove,
  onUpdateStats,
  onUpdateDisposition,
  onToggleVisibility,
  compact = false,
  showStats = true,
}: SceneNPCPanelProps) {
  const { campaign } = useCampaign();

  const portraitUrl = npc.portrait && campaign
    ? `/api/campaigns/${campaign.id}/assets/${npc.portrait.replace('assets/', '')}`
    : null;

  // Support both old and new field names
  const hasStats = npc.hasStats ?? npc.isAntagonist ?? false;
  const stats = npc.stats ?? npc.antagonistStats ?? {};
  const damage = stats.damage || 0;
  const maxDamage = stats.maxDamage || 10;
  const armor = stats.armor || 0;
  const isDefeated = hasStats && damage >= maxDamage;
  const isHiddenFromPlayers = npc.visibleToPlayers === false;
  const disposition = npc.disposition || 'neutral';

  const handleDamageChange = (delta: number) => {
    if (onUpdateStats) {
      const newDamage = Math.max(0, damage + delta);
      onUpdateStats({ damage: newDamage });
    }
  };

  const borderClass = getDispositionBorderClass(disposition, isHiddenFromPlayers);
  const bgClass = getDispositionBgClass(disposition, isHiddenFromPlayers);

  if (compact) {
    return (
      <div className={`relative rounded-lg border-2 overflow-hidden ${borderClass} ${bgClass}`}>
        {/* Control buttons */}
        <div className="absolute right-1 top-1 z-10 flex gap-1">
          {onToggleVisibility && (
            <button
              onClick={onToggleVisibility}
              className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                isHiddenFromPlayers
                  ? 'bg-amber-500 text-white hover:bg-amber-600'
                  : 'bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
              title={isHiddenFromPlayers ? 'Show to players' : 'Hide from players'}
            >
              {isHiddenFromPlayers ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </button>
          )}
          {onRemove && (
            <button
              onClick={onRemove}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs hover:bg-destructive/90"
              title="Remove from scene"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Hidden badge */}
        {isHiddenFromPlayers && (
          <div className="absolute left-1 top-1 z-10 flex items-center gap-1 rounded-full bg-amber-500 px-1.5 py-0.5 text-xs font-medium text-white">
            <EyeOff className="h-3 w-3" />
          </div>
        )}

        {/* Square portrait section */}
        <div className={`relative aspect-square w-full overflow-hidden bg-primary/10 ${isDefeated ? 'grayscale' : ''} ${isHiddenFromPlayers ? 'opacity-60' : ''}`}>
          {portraitUrl ? (
            <div
              className="absolute h-full w-full"
              style={{
                backgroundImage: `url(${portraitUrl})`,
                backgroundSize: npc.portraitPosition
                  ? `${100 * npc.portraitPosition.scale}%`
                  : 'cover',
                backgroundPosition: npc.portraitPosition
                  ? `${50 + npc.portraitPosition.x}% ${50 + npc.portraitPosition.y}%`
                  : 'center',
                backgroundRepeat: 'no-repeat',
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-primary">
              <User className="h-12 w-12" />
            </div>
          )}
          {/* Defeated X overlay */}
          {isDefeated && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <X className="h-16 w-16 text-red-500 stroke-[3]" />
            </div>
          )}
          {/* Armor badge - only show if showStats is true */}
          {showStats && hasStats && armor > 0 && (
            <div className="absolute bottom-1 left-1 flex items-center gap-1 rounded-full bg-background/90 px-1.5 py-0.5 text-xs font-medium">
              <Shield className="h-3 w-3 text-muted-foreground" />
              <span>{armor}</span>
            </div>
          )}
        </div>

        {/* Name and info section */}
        <div className="p-2">
          <p className={`truncate text-sm font-medium ${isDefeated ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
            {npc.name}
          </p>
          {npc.occupation && (
            <p className="truncate text-xs text-muted-foreground">{npc.occupation}</p>
          )}

          {/* Disposition selector - only for DM */}
          {showStats && onUpdateDisposition && (
            <div className="mt-2 flex gap-1">
              <button
                onClick={() => onUpdateDisposition('hostile')}
                className={`flex-1 rounded px-1.5 py-0.5 text-xs font-medium transition-colors ${
                  disposition === 'hostile'
                    ? 'bg-red-500 text-white'
                    : 'bg-secondary text-muted-foreground hover:bg-red-500/20 hover:text-red-500'
                }`}
                title="Hostile"
              >
                H
              </button>
              <button
                onClick={() => onUpdateDisposition('neutral')}
                className={`flex-1 rounded px-1.5 py-0.5 text-xs font-medium transition-colors ${
                  disposition === 'neutral'
                    ? 'bg-gray-500 text-white'
                    : 'bg-secondary text-muted-foreground hover:bg-gray-500/20 hover:text-gray-500'
                }`}
                title="Neutral"
              >
                N
              </button>
              <button
                onClick={() => onUpdateDisposition('friendly')}
                className={`flex-1 rounded px-1.5 py-0.5 text-xs font-medium transition-colors ${
                  disposition === 'friendly'
                    ? 'bg-green-500 text-white'
                    : 'bg-secondary text-muted-foreground hover:bg-green-500/20 hover:text-green-500'
                }`}
                title="Friendly"
              >
                F
              </button>
            </div>
          )}

          {/* Damage tracker for NPCs with stats - only show if showStats is true */}
          {showStats && hasStats && (
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Heart className="h-3 w-3 shrink-0 text-red-500" />
                <div className="flex-1">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full transition-all ${isDefeated ? 'bg-red-800' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(100, (damage / maxDamage) * 100)}%` }}
                    />
                  </div>
                </div>
                <span className={`text-xs font-medium tabular-nums ${isDefeated ? 'text-red-500' : 'text-foreground'}`}>
                  {damage}/{maxDamage}
                </span>
              </div>

              {/* Damage controls */}
              {onUpdateStats && (
                <div className="flex gap-1">
                  <button
                    onClick={() => handleDamageChange(-1)}
                    className="flex h-6 flex-1 items-center justify-center gap-1 rounded bg-secondary text-xs font-medium text-foreground hover:bg-accent"
                    title="Heal / Reduce damage"
                  >
                    <Minus className="h-3 w-3" />
                    Heal
                  </button>
                  <button
                    onClick={() => handleDamageChange(1)}
                    className="flex h-6 flex-1 items-center justify-center gap-1 rounded bg-red-500/20 text-xs font-medium text-red-500 hover:bg-red-500/30"
                    title="Deal damage"
                  >
                    <Plus className="h-3 w-3" />
                    Damage
                  </button>
                </div>
              )}

              {/* Defeated status */}
              {isDefeated && (
                <div className="rounded bg-red-500/20 px-1.5 py-0.5 text-center text-xs font-medium text-red-500">
                  Defeated
                </div>
              )}
            </div>
          )}

          {/* Show defeated status even when stats are hidden */}
          {!showStats && isDefeated && (
            <div className="mt-2 rounded bg-red-500/20 px-1.5 py-0.5 text-center text-xs font-medium text-red-500">
              Defeated
            </div>
          )}

          {/* View Entry button - only show for DM (when showStats is true) */}
          {showStats && (
            <Link
              to={`/modules/npcs/${npc.id}?from=live-play`}
              className="mt-2 flex items-center justify-center gap-1 rounded bg-secondary px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <ExternalLink className="h-3 w-3" />
              View Entry
            </Link>
          )}
        </div>
      </div>
    );
  }

  // Full layout with prominent portrait
  return (
    <div className={`relative rounded-lg border-2 overflow-hidden ${borderClass} ${bgClass}`}>
      {/* Control buttons */}
      <div className="absolute right-2 top-2 z-10 flex gap-1">
        {onToggleVisibility && (
          <button
            onClick={onToggleVisibility}
            className={`flex h-6 w-6 items-center justify-center rounded-full ${
              isHiddenFromPlayers
                ? 'bg-amber-500 text-white hover:bg-amber-600'
                : 'bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
            title={isHiddenFromPlayers ? 'Show to players' : 'Hide from players'}
          >
            {isHiddenFromPlayers ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
        {onRemove && (
          <button
            onClick={onRemove}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
            title="Remove from scene"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Hidden badge */}
      {isHiddenFromPlayers && (
        <div className="absolute left-2 top-2 z-10 flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-medium text-white">
          <EyeOff className="h-3 w-3" />
          <span>Hidden</span>
        </div>
      )}

      {/* Large portrait section */}
      <div className={`relative aspect-square w-full overflow-hidden bg-primary/10 ${isDefeated ? 'grayscale' : ''} ${isHiddenFromPlayers ? 'opacity-60' : ''}`}>
        {portraitUrl ? (
          <div
            className="absolute h-full w-full"
            style={{
              backgroundImage: `url(${portraitUrl})`,
              backgroundSize: npc.portraitPosition
                ? `${100 * npc.portraitPosition.scale}%`
                : 'cover',
              backgroundPosition: npc.portraitPosition
                ? `${50 + npc.portraitPosition.x}% ${50 + npc.portraitPosition.y}%`
                : 'center',
              backgroundRepeat: 'no-repeat',
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-primary">
            <User className="h-20 w-20" />
          </div>
        )}

        {/* Defeated X overlay */}
        {isDefeated && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <X className="h-24 w-24 text-red-500 stroke-[3]" />
          </div>
        )}

        {/* Armor badge - only show if showStats is true */}
        {showStats && hasStats && armor > 0 && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-xs font-medium">
            <Shield className="h-3 w-3 text-muted-foreground" />
            <span>{armor}</span>
          </div>
        )}
      </div>

      {/* Name and info section */}
      <div className="p-3">
        <h3 className={`font-medium ${isDefeated ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
          {npc.name}
        </h3>
        {npc.occupation && (
          <p className="text-sm text-muted-foreground">{npc.occupation}</p>
        )}

        {/* Disposition selector - only for DM */}
        {showStats && onUpdateDisposition && (
          <div className="mt-2 flex gap-1">
            <button
              onClick={() => onUpdateDisposition('hostile')}
              className={`flex-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
                disposition === 'hostile'
                  ? 'bg-red-500 text-white'
                  : 'bg-secondary text-muted-foreground hover:bg-red-500/20 hover:text-red-500'
              }`}
            >
              Hostile
            </button>
            <button
              onClick={() => onUpdateDisposition('neutral')}
              className={`flex-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
                disposition === 'neutral'
                  ? 'bg-gray-500 text-white'
                  : 'bg-secondary text-muted-foreground hover:bg-gray-500/20 hover:text-gray-500'
              }`}
            >
              Neutral
            </button>
            <button
              onClick={() => onUpdateDisposition('friendly')}
              className={`flex-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
                disposition === 'friendly'
                  ? 'bg-green-500 text-white'
                  : 'bg-secondary text-muted-foreground hover:bg-green-500/20 hover:text-green-500'
              }`}
            >
              Friendly
            </button>
          </div>
        )}

        {/* Damage tracker for NPCs with stats - only show if showStats is true */}
        {showStats && hasStats && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 shrink-0 text-red-500" />
              <div className="flex-1">
                <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full transition-all ${isDefeated ? 'bg-red-800' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(100, (damage / maxDamage) * 100)}%` }}
                  />
                </div>
              </div>
              <span className={`text-sm font-medium tabular-nums ${isDefeated ? 'text-red-500' : 'text-foreground'}`}>
                {damage}/{maxDamage}
              </span>
            </div>

            {/* Damage controls */}
            {onUpdateStats && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleDamageChange(-1)}
                  className="flex h-8 flex-1 items-center justify-center gap-1 rounded bg-secondary text-sm font-medium text-foreground hover:bg-accent"
                  title="Heal / Reduce damage"
                >
                  <Minus className="h-4 w-4" />
                  Heal
                </button>
                <button
                  onClick={() => handleDamageChange(1)}
                  className="flex h-8 flex-1 items-center justify-center gap-1 rounded bg-red-500/20 text-sm font-medium text-red-500 hover:bg-red-500/30"
                  title="Deal damage"
                >
                  <Plus className="h-4 w-4" />
                  Damage
                </button>
              </div>
            )}

            {/* Status indicator */}
            {isDefeated && (
              <div className="rounded bg-red-500/20 px-2 py-1 text-center text-sm font-medium text-red-500">
                Defeated / Incapacitated
              </div>
            )}
          </div>
        )}

        {/* Show defeated status even when stats are hidden */}
        {!showStats && isDefeated && (
          <div className="mt-3 rounded bg-red-500/20 px-2 py-1 text-center text-sm font-medium text-red-500">
            Defeated / Incapacitated
          </div>
        )}

        {/* View Entry button - only show for DM (when showStats is true) */}
        {showStats && (
          <Link
            to={`/modules/npcs/${npc.id}?from=live-play`}
            className="mt-3 flex items-center justify-center gap-1 rounded bg-secondary px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ExternalLink className="h-4 w-4" />
            View Entry
          </Link>
        )}
      </div>
    </div>
  );
}

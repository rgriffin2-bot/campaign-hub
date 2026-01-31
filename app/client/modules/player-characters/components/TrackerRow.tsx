import { Coins, Heart, Sparkles, Star, CircleDot } from 'lucide-react';
import type { ResourceLevel, HarmState } from '@shared/schemas/player-character';

const resourceLevels: ResourceLevel[] = ['screwed', 'dry', 'light', 'covered', 'flush', 'swimming'];

const resourceLabels: Record<ResourceLevel, string> = {
  screwed: 'Screwed',
  dry: 'Dry',
  light: 'Light',
  covered: 'Covered',
  flush: 'Flush',
  swimming: 'Swimming in it',
};

interface PressureTrackerProps {
  value: number;
  editable?: boolean;
  compact?: boolean;
  onChange?: (value: number) => void;
}

export function PressureTracker({ value, editable = false, compact = false, onChange }: PressureTrackerProps) {
  const handleClick = (index: number) => {
    if (!editable || !onChange) return;
    // If clicking the currently filled pip, unfill it
    // Otherwise, fill up to that pip
    onChange(index + 1 === value ? index : index + 1);
  };

  return (
    <div className={compact ? "flex items-center gap-2" : "flex flex-col gap-1"}>
      <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        <Sparkles className="h-3 w-3 text-amber-500" />
        {!compact && "Pressure"}
      </div>
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleClick(i)}
            disabled={!editable}
            className={`h-4 w-4 rounded-full border transition-colors ${
              i < value
                ? 'border-amber-500 bg-amber-500'
                : 'border-muted-foreground/30 bg-transparent'
            } ${editable ? 'cursor-pointer hover:border-amber-500/50' : ''}`}
          />
        ))}
      </div>
    </div>
  );
}

interface HarmTrackerProps {
  harm: HarmState;
  editable?: boolean;
  compact?: boolean;
  onChange?: (harm: HarmState) => void;
}

export function HarmTracker({ harm, editable = false, compact = false, onChange }: HarmTrackerProps) {
  const handleChange = (field: keyof HarmState, value: string) => {
    if (!onChange) return;
    onChange({ ...harm, [field]: value || undefined });
  };

  const slots = [
    { key: 'oldWounds' as const, label: 'Old Wounds', shortLabel: 'Old', color: 'border-muted-foreground/50' },
    { key: 'mild' as const, label: 'Mild', shortLabel: 'Mild', color: 'border-yellow-500' },
    { key: 'moderate' as const, label: 'Moderate', shortLabel: 'Mod', color: 'border-orange-500' },
    { key: 'severe' as const, label: 'Severe', shortLabel: 'Sev', color: 'border-red-500' },
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        <Heart className="h-3 w-3 text-red-500" />
        Harm
      </div>
      <div className="space-y-1">
        {slots.map(({ key, label, shortLabel, color }) => (
          <div key={key} className="min-w-0">
            <div className="flex items-start gap-2">
              <span className={`${compact ? 'w-10' : 'w-20'} shrink-0 text-xs ${color.replace('border-', 'text-')}`}>
                {compact ? shortLabel : label}:
              </span>
              {editable ? (
                <input
                  type="text"
                  value={harm[key] || ''}
                  onChange={(e) => handleChange(key, e.target.value)}
                  className={`min-w-0 flex-1 rounded border ${color} bg-transparent px-1 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring`}
                  placeholder="—"
                />
              ) : (
                <span className="min-w-0 flex-1 text-xs text-foreground whitespace-normal break-words">
                  {harm[key] || '—'}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ResourceTrackerProps {
  value: ResourceLevel;
  editable?: boolean;
  compact?: boolean;
  onChange?: (value: ResourceLevel) => void;
}

export function ResourceTracker({ value, editable = false, compact = false, onChange }: ResourceTrackerProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        <Coins className="h-3 w-3 text-yellow-500" />
        Resources
      </div>
      <div className="flex flex-col gap-0.5">
        {resourceLevels.map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => editable && onChange?.(level)}
            disabled={!editable}
            className={`flex items-center gap-1 rounded px-1 py-0.5 text-xs transition-colors ${
              value === level
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            } ${editable ? 'cursor-pointer' : ''}`}
          >
            <CircleDot className={`h-2.5 w-2.5 ${value === level ? 'text-primary' : 'text-transparent'}`} />
            {resourceLabels[level]}
          </button>
        ))}
      </div>
    </div>
  );
}

interface ExperienceTrackerProps {
  value: number;
  editable?: boolean;
  compact?: boolean;
  onChange?: (value: number) => void;
}

export function ExperienceTracker({ value, editable = false, compact = false, onChange }: ExperienceTrackerProps) {
  const handleClick = (index: number) => {
    if (!editable || !onChange) return;
    onChange(index + 1 === value ? index : index + 1);
  };

  return (
    <div className={compact ? "flex items-center gap-2" : "flex flex-col gap-1"}>
      <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        <Star className="h-3 w-3 text-blue-500" />
        {!compact && "Experience"}
      </div>
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleClick(i)}
            disabled={!editable}
            className={`h-4 w-4 rounded-full border transition-colors ${
              i < value
                ? 'border-blue-500 bg-blue-500'
                : 'border-muted-foreground/30 bg-transparent'
            } ${editable ? 'cursor-pointer hover:border-blue-500/50' : ''}`}
          />
        ))}
      </div>
    </div>
  );
}

interface LuckTrackerProps {
  value: boolean;
  editable?: boolean;
  onChange?: (value: boolean) => void;
}

export function LuckTracker({ value, editable = false, onChange }: LuckTrackerProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        Luck
      </div>
      <button
        type="button"
        onClick={() => editable && onChange?.(!value)}
        disabled={!editable}
        className={`h-8 w-8 rounded-full border-2 text-lg transition-colors ${
          value
            ? 'border-yellow-500 bg-yellow-500/20'
            : 'border-muted-foreground/30 bg-transparent'
        } ${editable ? 'cursor-pointer hover:border-yellow-500/50' : ''}`}
      >
        {value ? '🪙' : ''}
      </button>
    </div>
  );
}

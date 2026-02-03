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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!editable || !onChange) return;
    if (e.key === 'ArrowRight' && value < 5) {
      e.preventDefault();
      onChange(value + 1);
    } else if (e.key === 'ArrowLeft' && value > 0) {
      e.preventDefault();
      onChange(value - 1);
    }
  };

  return (
    <div className={compact ? "flex items-center gap-2" : "flex flex-col gap-1"}>
      <div id="pressure-label" className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        <Sparkles className="h-3 w-3 text-amber-500" aria-hidden="true" />
        {!compact && "Pressure"}
      </div>
      <div
        role="slider"
        aria-label="Pressure tracker"
        aria-labelledby={compact ? undefined : "pressure-label"}
        aria-valuemin={0}
        aria-valuemax={5}
        aria-valuenow={value}
        aria-valuetext={`${value} of 5 pressure`}
        className="flex gap-1"
      >
        {[...Array(5)].map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleClick(i)}
            onKeyDown={handleKeyDown}
            disabled={!editable}
            aria-label={`Set pressure to ${i + 1}`}
            aria-pressed={i < value}
            tabIndex={i === 0 && editable ? 0 : -1}
            className={`h-4 w-4 rounded-full border transition-colors ${
              i < value
                ? 'border-amber-500 bg-amber-500'
                : 'border-muted-foreground/30 bg-transparent'
            } ${editable ? 'cursor-pointer hover:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/50' : ''}`}
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
    <fieldset className="flex flex-col gap-2">
      <legend className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        <Heart className="h-3 w-3 text-red-500" aria-hidden="true" />
        Harm
      </legend>
      <div className="space-y-1" role="group" aria-label="Harm tracker">
        {slots.map(({ key, label, shortLabel, color }) => (
          <div key={key} className="min-w-0">
            <div className="flex items-start gap-2">
              <label
                htmlFor={`harm-${key}`}
                className={`${compact ? 'w-10' : 'w-20'} shrink-0 text-xs ${color.replace('border-', 'text-')}`}
              >
                {compact ? shortLabel : label}:
              </label>
              {editable ? (
                <input
                  id={`harm-${key}`}
                  type="text"
                  value={harm[key] || ''}
                  onChange={(e) => handleChange(key, e.target.value)}
                  aria-label={`${label} harm`}
                  className={`min-w-0 flex-1 rounded border ${color} bg-transparent px-1 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring`}
                  placeholder="—"
                />
              ) : (
                <span
                  id={`harm-${key}`}
                  className="min-w-0 flex-1 text-xs text-foreground whitespace-normal break-words"
                  aria-label={`${label} harm: ${harm[key] || 'none'}`}
                >
                  {harm[key] || '—'}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

interface ResourceTrackerProps {
  value: ResourceLevel;
  editable?: boolean;
  compact?: boolean;
  onChange?: (value: ResourceLevel) => void;
}

export function ResourceTracker({ value, editable = false, compact: _compact = false, onChange }: ResourceTrackerProps) {
  const handleKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (!editable || !onChange) return;
    if (e.key === 'ArrowDown' && idx < resourceLevels.length - 1) {
      e.preventDefault();
      onChange(resourceLevels[idx + 1]);
    } else if (e.key === 'ArrowUp' && idx > 0) {
      e.preventDefault();
      onChange(resourceLevels[idx - 1]);
    }
  };

  return (
    <div className="flex flex-col gap-1" role="radiogroup" aria-label="Resources">
      <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        <Coins className="h-3 w-3 text-yellow-500" aria-hidden="true" />
        Resources
      </div>
      <div className="flex flex-col gap-0.5">
        {resourceLevels.map((level, index) => (
          <button
            key={level}
            type="button"
            role="radio"
            aria-checked={value === level}
            onClick={() => editable && onChange?.(level)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            disabled={!editable}
            tabIndex={value === level && editable ? 0 : -1}
            className={`flex items-center gap-1 rounded px-1 py-0.5 text-xs transition-colors ${
              value === level
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            } ${editable ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50' : ''}`}
          >
            <CircleDot className={`h-2.5 w-2.5 ${value === level ? 'text-primary' : 'text-transparent'}`} aria-hidden="true" />
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!editable || !onChange) return;
    if (e.key === 'ArrowRight' && value < 5) {
      e.preventDefault();
      onChange(value + 1);
    } else if (e.key === 'ArrowLeft' && value > 0) {
      e.preventDefault();
      onChange(value - 1);
    }
  };

  return (
    <div className={compact ? "flex items-center gap-2" : "flex flex-col gap-1"}>
      <div id="experience-label" className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        <Star className="h-3 w-3 text-blue-500" aria-hidden="true" />
        {!compact && "Experience"}
      </div>
      <div
        role="slider"
        aria-label="Experience tracker"
        aria-labelledby={compact ? undefined : "experience-label"}
        aria-valuemin={0}
        aria-valuemax={5}
        aria-valuenow={value}
        aria-valuetext={`${value} of 5 experience`}
        className="flex gap-1"
      >
        {[...Array(5)].map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleClick(i)}
            onKeyDown={handleKeyDown}
            disabled={!editable}
            aria-label={`Set experience to ${i + 1}`}
            aria-pressed={i < value}
            tabIndex={i === 0 && editable ? 0 : -1}
            className={`h-4 w-4 rounded-full border transition-colors ${
              i < value
                ? 'border-blue-500 bg-blue-500'
                : 'border-muted-foreground/30 bg-transparent'
            } ${editable ? 'cursor-pointer hover:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50' : ''}`}
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
      <div id="luck-label" className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        Luck
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-labelledby="luck-label"
        aria-label={value ? 'Luck available - click to spend' : 'Luck spent - click to restore'}
        onClick={() => editable && onChange?.(!value)}
        disabled={!editable}
        className={`h-8 w-8 rounded-full border-2 text-lg transition-colors ${
          value
            ? 'border-yellow-500 bg-yellow-500/20'
            : 'border-muted-foreground/30 bg-transparent'
        } ${editable ? 'cursor-pointer hover:border-yellow-500/50 focus:outline-none focus:ring-2 focus:ring-yellow-500/50' : ''}`}
      >
        <span aria-hidden="true">{value ? '🪙' : ''}</span>
      </button>
    </div>
  );
}

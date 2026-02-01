import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { SUBSYSTEM_LABELS, SUBSYSTEM_SHORT_LABELS, type SubsystemKey, type ShipDamage } from '@shared/schemas/ship';

interface ShipDamageTrackerProps {
  damage: ShipDamage;
  editable?: boolean;
  compact?: boolean;
  onChange?: (damage: ShipDamage) => void;
}

const SUBSYSTEM_KEYS: SubsystemKey[] = [
  'helmControl',
  'enginesDrives',
  'sensorsArrays',
  'hullStructure',
  'powerLifeSupport',
  'weaponsBoarding',
];

export function ShipDamageTracker({
  damage,
  editable = false,
  compact = false,
  onChange,
}: ShipDamageTrackerProps) {
  const [expanded, setExpanded] = useState(!compact);

  const handleSubsystemChange = (
    key: SubsystemKey,
    field: 'minor' | 'major',
    value: string
  ) => {
    if (!onChange) return;
    const current = damage[key] || {};
    const updated: ShipDamage = {
      ...damage,
      [key]: {
        ...current,
        [field]: value || undefined,
      },
    };
    onChange(updated);
  };

  // Count damaged subsystems
  const damagedCount = SUBSYSTEM_KEYS.filter((key) => {
    const subsystem = damage[key];
    return subsystem?.minor || subsystem?.major;
  }).length;

  const hasDamage = damagedCount > 0;

  if (compact && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className={`flex w-full items-center justify-between rounded-lg border p-2 text-left transition-colors ${
          hasDamage ? 'border-red-500/50 bg-red-500/5' : 'border-border bg-card'
        }`}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className={`h-4 w-4 ${hasDamage ? 'text-red-500' : 'text-muted-foreground'}`} />
          <span className="text-sm font-medium">
            Ship Damage {hasDamage && `(${damagedCount} subsystems)`}
          </span>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>
    );
  }

  return (
    <div className={`rounded-lg border ${hasDamage ? 'border-red-500/50' : 'border-border'}`}>
      {/* Header */}
      <div
        className={`flex items-center justify-between p-3 ${compact ? 'cursor-pointer' : ''}`}
        onClick={compact ? () => setExpanded(false) : undefined}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className={`h-4 w-4 ${hasDamage ? 'text-red-500' : 'text-muted-foreground'}`} />
          <span className="text-sm font-medium">Ship Damage</span>
        </div>
        {compact && (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        )}
      </div>

      {/* Damage Grid */}
      <div className="border-t border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Subsystem</th>
              <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Minor</th>
              <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Major</th>
            </tr>
          </thead>
          <tbody>
            {SUBSYSTEM_KEYS.map((key) => {
              const subsystem = damage[key] || {};
              const hasMinor = !!subsystem.minor;
              const hasMajor = !!subsystem.major;
              const label = compact ? SUBSYSTEM_SHORT_LABELS[key] : SUBSYSTEM_LABELS[key];

              return (
                <tr key={key} className="border-b border-border last:border-0">
                  <td className={`px-2 py-1.5 font-medium ${
                    hasMinor || hasMajor ? 'text-red-500' : 'text-foreground'
                  }`}>
                    {label}
                  </td>
                  <td className="px-2 py-1.5">
                    {editable ? (
                      <input
                        type="text"
                        value={subsystem.minor || ''}
                        onChange={(e) => handleSubsystemChange(key, 'minor', e.target.value)}
                        placeholder="—"
                        className={`w-full rounded border bg-transparent px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring ${
                          hasMinor ? 'border-yellow-500' : 'border-border'
                        }`}
                      />
                    ) : (
                      <span className={hasMinor ? 'text-yellow-500' : 'text-muted-foreground'}>
                        {subsystem.minor || '—'}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    {editable ? (
                      <input
                        type="text"
                        value={subsystem.major || ''}
                        onChange={(e) => handleSubsystemChange(key, 'major', e.target.value)}
                        placeholder="—"
                        className={`w-full rounded border bg-transparent px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring ${
                          hasMajor ? 'border-red-500' : 'border-border'
                        }`}
                      />
                    ) : (
                      <span className={hasMajor ? 'text-red-500' : 'text-muted-foreground'}>
                        {subsystem.major || '—'}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * CrewShipPanel -- the party's own ship, shown in the live-play scene.
 * Collapsible: when collapsed, displays just a name badge with a damage
 * indicator. When expanded, shows a pressure tracker and a subsystem damage
 * table (6 subsystems x minor/major) that the DM can edit inline.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, Rocket, Sparkles, ExternalLink } from 'lucide-react';
import { SUBSYSTEM_SHORT_LABELS, type SubsystemKey, type ShipDamage } from '@shared/schemas/ship';

interface CrewShipPanelProps {
  ship: {
    id: string;
    name: string;
    type?: string;
    class?: string;
    image?: string;
    imagePosition?: { x: number; y: number; scale: number };
    pressure?: number;
    damage?: ShipDamage;
  };
  editable?: boolean;
  onUpdatePressure?: (pressure: number) => void;
  onUpdateDamage?: (damage: ShipDamage) => void;
}

const SUBSYSTEM_KEYS: SubsystemKey[] = [
  'helmControl',
  'enginesDrives',
  'sensorsArrays',
  'hullStructure',
  'powerLifeSupport',
  'weaponsBoarding',
];

export function CrewShipPanel({
  ship,
  editable = false,
  onUpdatePressure,
  onUpdateDamage,
}: CrewShipPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const pressure = ship.pressure || 0;
  const damage = ship.damage || {};

  // Check if ship has any damage
  const hasDamage = SUBSYSTEM_KEYS.some((key) => {
    const subsystem = damage[key];
    return subsystem?.minor || subsystem?.major;
  });

  // Clicking a filled dot clears it; clicking an empty one fills up to it
  const handlePressureClick = (index: number) => {
    if (!editable || !onUpdatePressure) return;
    onUpdatePressure(index + 1 === pressure ? index : index + 1);
  };

  const handleDamageChange = (
    key: SubsystemKey,
    field: 'minor' | 'major',
    value: string
  ) => {
    if (!onUpdateDamage) return;
    const current = damage[key] || {};
    const updated: ShipDamage = {
      ...damage,
      [key]: {
        ...current,
        [field]: value || undefined,
      },
    };
    onUpdateDamage(updated);
  };

  // Collapsed view - just the name in a small box
  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors hover:bg-secondary ${
          hasDamage ? 'border-red-500/30' : 'border-primary/30'
        }`}
      >
        <Rocket className="h-4 w-4 text-primary/70 shrink-0" />
        <span className="font-medium text-foreground truncate">{ship.name}</span>
        {hasDamage && (
          <span className="shrink-0 rounded bg-red-500/20 px-1.5 py-0.5 text-xs font-medium text-red-500">
            Damaged
          </span>
        )}
        <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto shrink-0" />
      </button>
    );
  }

  return (
    <div className={`rounded-lg border-2 border-primary/30 bg-card overflow-hidden ${hasDamage ? 'border-red-500/30' : ''}`}>
      <div className="flex flex-col">
          {/* Top row: Name/class/type, Pressure, View Entry */}
          <div className="flex flex-wrap items-center gap-3 md:gap-4 border-b border-border px-3 py-2 md:px-4 md:py-3">
            {/* Name and type info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-foreground truncate">{ship.name}</h2>
                {hasDamage && (
                  <span className="shrink-0 rounded bg-red-500/20 px-1.5 py-0.5 text-xs font-medium text-red-500">
                    Damaged
                  </span>
                )}
              </div>
              {(ship.type || ship.class) && (
                <p className="text-sm text-muted-foreground truncate">
                  {[ship.class, ship.type].filter(Boolean).join(' • ')}
                </p>
              )}
            </div>

            {/* Pressure section */}
            <div className="shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium text-muted-foreground">Pressure</span>
              </div>
              <div className="mt-1 flex gap-1.5">
                {[...Array(5)].map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handlePressureClick(i)}
                    disabled={!editable}
                    className={`h-4 w-4 rounded-full border transition-colors ${
                      i < pressure
                        ? 'border-amber-500 bg-amber-500'
                        : 'border-muted-foreground/30 bg-transparent'
                    } ${editable ? 'cursor-pointer hover:border-amber-500/50' : ''}`}
                  />
                ))}
              </div>
            </div>

            {/* View Entry button */}
            <Link
              to={`/modules/ships/${ship.id}?from=live-play`}
              className="shrink-0 flex items-center gap-1 rounded bg-secondary px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <ExternalLink className="h-3 w-3" />
              View Entry
            </Link>

            {/* Collapse toggle */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="shrink-0 p-1 text-muted-foreground hover:text-foreground"
            >
              <ChevronUp className="h-5 w-5" />
            </button>
          </div>

          {/* Damage section - expanded content */}
          {(
            <div className="flex-1 px-4 py-3">
              <div className="overflow-x-auto">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {SUBSYSTEM_KEYS.map((key) => {
                    const subsystem = damage[key] || {};
                    const hasDmg = subsystem.minor || subsystem.major;
                    return (
                      <div
                        key={key}
                        className={`rounded-lg border p-2 ${hasDmg ? 'border-red-500/30 bg-red-500/5' : 'border-border'}`}
                      >
                        <div className="mb-1 text-xs font-medium text-muted-foreground">
                          {SUBSYSTEM_SHORT_LABELS[key]}
                        </div>
                        <div className="space-y-1">
                          {/* Minor */}
                          <div className="flex items-center gap-1.5">
                            <span className="w-11 shrink-0 text-[10px] font-medium text-yellow-500">Minor</span>
                            {editable ? (
                              <input
                                type="text"
                                value={subsystem.minor || ''}
                                onChange={(e) => handleDamageChange(key, 'minor', e.target.value)}
                                placeholder="—"
                                className={`w-full rounded border bg-transparent px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring ${
                                  subsystem.minor ? 'border-yellow-500 text-foreground' : 'border-border text-muted-foreground'
                                }`}
                              />
                            ) : (
                              <span className={`text-xs ${subsystem.minor ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                                {subsystem.minor || '—'}
                              </span>
                            )}
                          </div>
                          {/* Major */}
                          <div className="flex items-center gap-1.5">
                            <span className="w-11 shrink-0 text-[10px] font-medium text-red-500">Major</span>
                            {editable ? (
                              <input
                                type="text"
                                value={subsystem.major || ''}
                                onChange={(e) => handleDamageChange(key, 'major', e.target.value)}
                                placeholder="—"
                                className={`w-full rounded border bg-transparent px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring ${
                                  subsystem.major ? 'border-red-500 text-foreground' : 'border-border text-muted-foreground'
                                }`}
                              />
                            ) : (
                              <span className={`text-xs ${subsystem.major ? 'text-red-500' : 'text-muted-foreground'}`}>
                                {subsystem.major || '—'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
    </div>
  );
}

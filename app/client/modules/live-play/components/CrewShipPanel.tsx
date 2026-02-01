import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, Rocket, Sparkles, ExternalLink } from 'lucide-react';
import { useCampaign } from '../../../core/providers/CampaignProvider';
import { SUBSYSTEM_SHORT_LABELS, type SubsystemKey, type ShipDamage } from '@shared/schemas/ship';

interface CrewShipPanelProps {
  ship: {
    id: string;
    name: string;
    type?: string;
    class?: string;
    image?: string;
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
  const { campaign } = useCampaign();
  const [expanded, setExpanded] = useState(true);

  const imageUrl = ship.image && campaign
    ? `/api/campaigns/${campaign.id}/assets/${ship.image.replace('assets/', '')}`
    : null;

  const pressure = ship.pressure || 0;
  const damage = ship.damage || {};

  // Check if ship has any damage
  const hasDamage = SUBSYSTEM_KEYS.some((key) => {
    const subsystem = damage[key];
    return subsystem?.minor || subsystem?.major;
  });

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

  return (
    <div className={`rounded-lg border-2 border-primary/30 bg-card overflow-hidden ${hasDamage ? 'border-red-500/30' : ''}`}>
      <div className="flex">
        {/* Large portrait on the left */}
        <div className="w-48 shrink-0 bg-primary/10">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={ship.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full min-h-[180px] w-full items-center justify-center text-primary/50">
              <Rocket className="h-16 w-16" />
            </div>
          )}
        </div>

        {/* Right side content */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Top row: Name/class/type, Pressure, View Entry */}
          <div className="flex items-center gap-4 border-b border-border px-4 py-3">
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
                    className={`h-5 w-5 rounded border-2 transition-colors ${
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
              className="shrink-0 flex items-center gap-1 rounded bg-secondary px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <ExternalLink className="h-3 w-3" />
              View Entry
            </Link>

            {/* Collapse toggle */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="shrink-0 p-1 text-muted-foreground hover:text-foreground"
            >
              {expanded ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* Damage section - expanded content */}
          {expanded && (
            <div className="flex-1 px-4 py-3">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px] text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="w-16 pb-2 text-left font-medium text-muted-foreground"></th>
                      {SUBSYSTEM_KEYS.map((key) => (
                        <th key={key} className="pb-2 text-center font-medium text-muted-foreground">
                          {SUBSYSTEM_SHORT_LABELS[key]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Minor row */}
                    <tr className="border-b border-border">
                      <td className="py-2 text-yellow-500 font-medium">Minor</td>
                      {SUBSYSTEM_KEYS.map((key) => {
                        const subsystem = damage[key] || {};
                        return (
                          <td key={key} className="px-1 py-2">
                            {editable ? (
                              <input
                                type="text"
                                value={subsystem.minor || ''}
                                onChange={(e) => handleDamageChange(key, 'minor', e.target.value)}
                                placeholder="—"
                                className={`w-full rounded border bg-transparent px-2 py-1 text-center text-sm focus:outline-none focus:ring-1 focus:ring-ring ${
                                  subsystem.minor ? 'border-yellow-500 text-foreground' : 'border-border text-muted-foreground'
                                }`}
                              />
                            ) : (
                              <div className={`text-center ${subsystem.minor ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                                {subsystem.minor || '—'}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                    {/* Major row */}
                    <tr>
                      <td className="py-2 text-red-500 font-medium">Major</td>
                      {SUBSYSTEM_KEYS.map((key) => {
                        const subsystem = damage[key] || {};
                        return (
                          <td key={key} className="px-1 py-2">
                            {editable ? (
                              <input
                                type="text"
                                value={subsystem.major || ''}
                                onChange={(e) => handleDamageChange(key, 'major', e.target.value)}
                                placeholder="—"
                                className={`w-full rounded border bg-transparent px-2 py-1 text-center text-sm focus:outline-none focus:ring-1 focus:ring-ring ${
                                  subsystem.major ? 'border-red-500 text-foreground' : 'border-border text-muted-foreground'
                                }`}
                              />
                            ) : (
                              <div className={`text-center ${subsystem.major ? 'text-red-500' : 'text-muted-foreground'}`}>
                                {subsystem.major || '—'}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

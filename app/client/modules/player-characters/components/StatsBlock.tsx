import type { Stats, StatName } from '@shared/schemas/player-character';

const statLabels: Record<StatName, string> = {
  poise: 'Poise',
  insight: 'Insight',
  grit: 'Grit',
  presence: 'Presence',
  resonance: 'Resonance',
};

interface StatsBlockProps {
  stats: Stats;
  editable?: boolean;
  onChange?: (stats: Stats) => void;
}

export function StatsBlock({ stats, editable = false, onChange }: StatsBlockProps) {
  const handleStatChange = (stat: StatName, value: number) => {
    if (!onChange) return;
    const newValue = Math.max(0, Math.min(4, value));
    onChange({ ...stats, [stat]: newValue });
  };

  return (
    <div className="grid grid-cols-5 gap-2">
      {(Object.keys(statLabels) as StatName[]).map((stat) => (
        <div
          key={stat}
          className="flex flex-col items-center rounded-lg border border-border bg-card p-2"
        >
          <span className="text-xs font-medium text-muted-foreground uppercase">
            {statLabels[stat]}
          </span>
          {editable ? (
            <div className="mt-1 flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleStatChange(stat, stats[stat] - 1)}
                className="h-5 w-5 rounded bg-secondary text-xs hover:bg-accent"
                disabled={stats[stat] <= 0}
              >
                -
              </button>
              <span className="w-6 text-center text-lg font-bold text-foreground">
                {stats[stat]}
              </span>
              <button
                type="button"
                onClick={() => handleStatChange(stat, stats[stat] + 1)}
                className="h-5 w-5 rounded bg-secondary text-xs hover:bg-accent"
                disabled={stats[stat] >= 4}
              >
                +
              </button>
            </div>
          ) : (
            <span className="mt-1 text-2xl font-bold text-foreground">
              {stats[stat]}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

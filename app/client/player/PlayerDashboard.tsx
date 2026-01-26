import { Link } from 'react-router-dom';
import { useCampaign } from '../core/providers/CampaignProvider';
import { DynamicIcon } from '../components/ui/DynamicIcon';

export function PlayerDashboard() {
  const { campaign, enabledModules } = useCampaign();

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Welcome */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground">
          Welcome to {campaign?.name}
        </h1>
        {campaign?.description && (
          <p className="mt-2 text-muted-foreground">{campaign.description}</p>
        )}
      </div>

      {/* Module Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {enabledModules.map((module) => (
          <Link
            key={module.id}
            to={`/player/modules/${module.id}`}
            className="group rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary/50 hover:bg-accent"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <DynamicIcon name={module.icon} className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground group-hover:text-primary">
                  {module.name}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Browse {module.name.toLowerCase()}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {enabledModules.length === 0 && (
        <div className="text-center text-muted-foreground">
          <p>No modules have been enabled for this campaign yet.</p>
        </div>
      )}
    </div>
  );
}

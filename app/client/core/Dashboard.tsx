import { Link } from 'react-router-dom';
import { useCampaign } from './providers/CampaignProvider';
import { DynamicIcon } from '../components/ui/DynamicIcon';
import { formatRelativeTime } from '@shared/utils/dates';

export function Dashboard() {
  const { campaign, enabledModules } = useCampaign();

  if (!campaign) return null;

  return (
    <div className="space-y-6">
      {/* Campaign Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{campaign.name}</h1>
        {campaign.description && (
          <p className="mt-1 text-muted-foreground">{campaign.description}</p>
        )}
        {campaign.lastAccessed && (
          <p className="mt-2 text-xs text-muted-foreground">
            Last accessed {formatRelativeTime(campaign.lastAccessed)}
          </p>
        )}
      </div>

      {/* Quick Access Modules */}
      {enabledModules.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Quick Access
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {enabledModules.map((module) => (
              <Link
                key={module.id}
                to={`/modules/${module.id}`}
                className="group flex flex-col rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-accent"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <DynamicIcon name={module.icon} className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground group-hover:text-primary">
                      {module.name}
                    </h3>
                    {module.description && (
                      <p className="text-xs text-muted-foreground">
                        {module.description}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {enabledModules.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <DynamicIcon name="Package" className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            No modules enabled
          </h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            This campaign doesn't have any modules enabled yet. Go to settings
            to configure which modules you want to use.
          </p>
          <Link
            to="/settings"
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Configure Modules
          </Link>
        </div>
      )}

      {/* Campaign Stats */}
      <div className="mt-8 rounded-lg border border-border bg-card p-4">
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Campaign Info
        </h2>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-sm text-muted-foreground">Created</dt>
            <dd className="text-foreground">
              {new Date(campaign.created).toLocaleDateString()}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Modules</dt>
            <dd className="text-foreground">{enabledModules.length} enabled</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Campaign ID</dt>
            <dd className="font-mono text-sm text-foreground">{campaign.id}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Sync</dt>
            <dd className="text-foreground">
              {campaign.sync?.googleDrivePath ? 'Enabled' : 'Not configured'}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

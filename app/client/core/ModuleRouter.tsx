import { useParams } from 'react-router-dom';
import { useCampaign } from './providers/CampaignProvider';
import { DynamicIcon } from '../components/ui/DynamicIcon';

export function ModuleRouter() {
  const { moduleId, fileId } = useParams();
  const { enabledModules } = useCampaign();

  const module = enabledModules.find((m) => m.id === moduleId);

  if (!module) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 p-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <DynamicIcon name="AlertCircle" className="h-6 w-6 text-destructive" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-foreground">
          Module Not Found
        </h3>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          The module "{moduleId}" is either not registered or not enabled for
          this campaign.
        </p>
      </div>
    );
  }

  // Placeholder view for modules - will be replaced when modules are built
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
          <DynamicIcon name={module.icon} className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{module.name}</h1>
          {module.description && (
            <p className="text-muted-foreground">{module.description}</p>
          )}
        </div>
      </div>

      {fileId ? (
        // Detail view placeholder
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="text-muted-foreground">
            Viewing file: <code className="text-foreground">{fileId}</code>
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Module detail views will be implemented when individual modules are
            built.
          </p>
        </div>
      ) : (
        // List view placeholder
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <DynamicIcon name={module.icon} className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            {module.name} Module
          </h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            This module's views will be implemented when individual modules are
            designed and built. The dashboard shell is ready to accept module
            components.
          </p>
        </div>
      )}
    </div>
  );
}

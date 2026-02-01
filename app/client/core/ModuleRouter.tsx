import { useParams } from 'react-router-dom';
import { useCampaign } from './providers/CampaignProvider';
import { DynamicIcon } from '../components/ui/DynamicIcon';

// Import module views
import { LoreList, LoreDetail, LoreEdit } from '../modules/lore';
import { NPCList, NPCDetail, NPCEdit, NPCGenerate } from '../modules/npcs';
import { LocationList, LocationDetail, LocationEdit } from '../modules/locations';
import { RulesList, RulesDetail, RulesEdit } from '../modules/rules';
import { PlayerCharacterList, PlayerCharacterDetail, PlayerCharacterEdit } from '../modules/player-characters';
import { ShipList, ShipDetail, ShipEdit } from '../modules/ships';
import { LivePlayDashboard } from '../modules/live-play';

// Module view registry - maps moduleId to view components
const moduleViews: Record<
  string,
  {
    list: React.ComponentType;
    detail: React.ComponentType;
    edit?: React.ComponentType;
    generate?: React.ComponentType;
  }
> = {
  lore: {
    list: LoreList,
    detail: LoreDetail,
    edit: LoreEdit,
  },
  npcs: {
    list: NPCList,
    detail: NPCDetail,
    edit: NPCEdit,
    generate: NPCGenerate,
  },
  locations: {
    list: LocationList,
    detail: LocationDetail,
    edit: LocationEdit,
  },
  rules: {
    list: RulesList,
    detail: RulesDetail,
    edit: RulesEdit,
  },
  'player-characters': {
    list: PlayerCharacterList,
    detail: PlayerCharacterDetail,
    edit: PlayerCharacterEdit,
  },
  ships: {
    list: ShipList,
    detail: ShipDetail,
    edit: ShipEdit,
  },
  'live-play': {
    list: LivePlayDashboard, // Dashboard is the main view
    detail: LivePlayDashboard, // No detail view, always show dashboard
  },
};

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

  const views = moduleViews[moduleId!];

  // If no views registered for this module, show placeholder
  if (!views) {
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

        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <DynamicIcon name={module.icon} className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            {module.name} Module
          </h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            This module's views are not yet implemented.
          </p>
        </div>
      </div>
    );
  }

  // Check for generate route
  if (fileId === 'generate' && views.generate) {
    const GenerateView = views.generate;
    return <GenerateView />;
  }

  // Check for edit route (fileId ends with /edit or is 'new')
  if (fileId === 'new' || fileId?.endsWith('/edit')) {
    const EditView = views.edit;
    if (EditView) {
      return <EditView />;
    }
  }

  // Check if this is an edit route via URL path
  const isEditRoute = window.location.pathname.endsWith('/edit');
  if (isEditRoute && views.edit) {
    const EditView = views.edit;
    return <EditView />;
  }

  // Render detail or list view
  if (fileId && fileId !== 'new') {
    const DetailView = views.detail;
    return <DetailView />;
  }

  const ListView = views.list;
  return <ListView />;
}

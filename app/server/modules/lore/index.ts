import { loreSchema } from '../../../shared/schemas/lore.js';
import { createBaseRoutes } from '../base-routes.js';
import { moduleRegistry } from '../registry.js';
import type { ModuleDefinition } from '../../../shared/types/module.js';

// Placeholder views - will be replaced by actual React components
const PlaceholderView = () => null;

export const loreModule: ModuleDefinition = {
  id: 'lore',
  name: 'Lore',
  icon: 'BookOpen',
  description: 'Campaign setting, factions, history, and world lore',
  dataFolder: 'lore',
  schema: loreSchema,
  routes: createBaseRoutes('lore'),
  views: {
    list: PlaceholderView,
    detail: PlaceholderView,
  },
};

// Register the module
moduleRegistry.register(loreModule);

export default loreModule;

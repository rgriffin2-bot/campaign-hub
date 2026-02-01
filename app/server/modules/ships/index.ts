import { shipSchema } from '../../../shared/schemas/ship.js';
import { createBaseRoutes } from '../base-routes.js';
import { moduleRegistry } from '../registry.js';
import { relationshipIndex } from '../../core/relationship-index.js';
import type { ModuleDefinition } from '../../../shared/types/module.js';

// Placeholder views - will be replaced by actual React components
const PlaceholderView = () => null;

// Register relationship fields for ships
relationshipIndex.registerFields('ships', ['affiliations']);

// Use base CRUD routes
const baseRoutes = createBaseRoutes('ships');

export const shipsModule: ModuleDefinition = {
  id: 'ships',
  name: 'Ships + Vehicles',
  icon: 'Rocket',
  description: 'Starships, vehicles, mechs, drones, and other vessels',
  dataFolder: 'ships',
  schema: shipSchema,
  routes: baseRoutes,
  views: {
    list: PlaceholderView,
    detail: PlaceholderView,
  },
  playerSite: {
    enabled: true, // Players can view ships (respecting hidden flag)
  },
};

// Register the module
moduleRegistry.register(shipsModule);

export default shipsModule;

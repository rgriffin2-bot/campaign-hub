import { projectSchema } from '../../../shared/schemas/project.js';
import { createBaseRoutes } from '../base-routes.js';
import { moduleRegistry } from '../registry.js';
import type { ModuleDefinition } from '../../../shared/types/module.js';

// Placeholder views - will be replaced by actual React components
const PlaceholderView = () => null;

// Use base CRUD routes
const baseRoutes = createBaseRoutes('projects');

export const projectsModule: ModuleDefinition = {
  id: 'projects',
  name: 'Downtime Projects',
  icon: 'Clock',
  description: 'Track long-term project clocks',
  dataFolder: 'projects',
  schema: projectSchema,
  routes: baseRoutes,
  views: {
    list: PlaceholderView,
    detail: PlaceholderView,
  },
  playerSite: {
    enabled: true, // Players can view projects (respecting hidden flag)
  },
};

// Register the module
moduleRegistry.register(projectsModule);

export default projectsModule;

import { sessionNotesSchema } from '../../../shared/schemas/session-notes.js';
import { createBaseRoutes } from '../base-routes.js';
import { moduleRegistry } from '../registry.js';
import type { ModuleDefinition } from '../../../shared/types/module.js';

// Placeholder views - will be replaced by actual React components
const PlaceholderView = () => null;

export const sessionNotesModule: ModuleDefinition = {
  id: 'session-notes',
  name: 'Session Notes',
  icon: 'StickyNote',
  description: 'Notes and recaps from play sessions',
  dataFolder: 'session-notes',
  schema: sessionNotesSchema,
  routes: createBaseRoutes('session-notes'),
  views: {
    list: PlaceholderView,
    detail: PlaceholderView,
  },
  playerSite: {
    enabled: true,
  },
};

// Register the module
moduleRegistry.register(sessionNotesModule);

export default sessionNotesModule;

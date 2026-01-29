import { moduleRegistry } from '../registry.js';
import type { ModuleDefinition } from '../../../shared/types/module.js';

// Placeholder views - will be replaced by actual React components
const PlaceholderView = () => null;

// Live Play module doesn't have its own data files
// It reads from and writes to Player Characters via their endpoints
export const livePlayModule: ModuleDefinition = {
  id: 'live-play',
  name: 'Live Play',
  icon: 'Play',
  description: 'Session-time tracker for player characters',
  dataFolder: '', // No data folder - uses player-characters data
  routes: [], // No custom routes - uses player-characters endpoints
  views: {
    list: PlaceholderView, // Dashboard is the "list" view
  },
  playerSite: {
    enabled: true,
  },
};

// Register the module
moduleRegistry.register(livePlayModule);

export default livePlayModule;

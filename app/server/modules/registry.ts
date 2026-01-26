import type { Express } from 'express';
import type { ModuleDefinition, ModuleInfo } from '../../shared/types/module.js';
import type { CampaignConfig } from '../../shared/types/campaign.js';

const modules = new Map<string, ModuleDefinition>();

export const moduleRegistry = {
  register(module: ModuleDefinition): void {
    if (modules.has(module.id)) {
      console.warn(`Module ${module.id} is already registered. Overwriting.`);
    }
    modules.set(module.id, module);
    console.log(`Module registered: ${module.id}`);
  },

  getAll(): ModuleDefinition[] {
    return Array.from(modules.values());
  },

  getAllInfo(): ModuleInfo[] {
    return Array.from(modules.values()).map(m => ({
      id: m.id,
      name: m.name,
      icon: m.icon,
      description: m.description,
      dataFolder: m.dataFolder,
    }));
  },

  get(moduleId: string): ModuleDefinition | undefined {
    return modules.get(moduleId);
  },

  getInfo(moduleId: string): ModuleInfo | undefined {
    const module = modules.get(moduleId);
    if (!module) return undefined;

    return {
      id: module.id,
      name: module.name,
      icon: module.icon,
      description: module.description,
      dataFolder: module.dataFolder,
    };
  },

  getForCampaign(campaign: CampaignConfig): ModuleDefinition[] {
    return campaign.modules
      .map(id => modules.get(id))
      .filter((m): m is ModuleDefinition => m !== undefined);
  },

  getInfoForCampaign(campaign: CampaignConfig): ModuleInfo[] {
    return campaign.modules
      .map(id => modules.get(id))
      .filter((m): m is ModuleDefinition => m !== undefined)
      .map(m => ({
        id: m.id,
        name: m.name,
        icon: m.icon,
        description: m.description,
        dataFolder: m.dataFolder,
      }));
  },

  mountRoutes(app: Express): void {
    for (const [moduleId, module] of modules) {
      for (const route of module.routes) {
        const path = `/api/modules/${moduleId}${route.path}`;
        const method = route.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete';
        app[method](path, route.handler);
        console.log(`  Route mounted: ${route.method} ${path}`);
      }
    }
  },
};

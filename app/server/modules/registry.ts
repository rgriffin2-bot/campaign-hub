/**
 * Central registry for all CampaignHub modules (NPCs, locations, rules, etc.).
 *
 * Each module self-registers at import time by calling `moduleRegistry.register()`.
 * The registry provides lookup helpers and mounts each module's Express routes
 * under `/api/modules/<moduleId>/`.
 */

import type { Express } from 'express';
import type { ModuleDefinition, ModuleInfo } from '../../shared/types/module.js';
import type { CampaignConfig } from '../../shared/types/campaign.js';

// ── State ──────────────────────────────────────────────────────────────

const modules = new Map<string, ModuleDefinition>();

// ── Registry API ───────────────────────────────────────────────────────

export const moduleRegistry = {
  /** Register a module definition. Warns and overwrites on duplicate IDs. */
  register(module: ModuleDefinition): void {
    if (modules.has(module.id)) {
      console.warn(`Module ${module.id} is already registered. Overwriting.`);
    }
    modules.set(module.id, module);
    console.log(`Module registered: ${module.id}`);
  },

  /** Return all registered module definitions */
  getAll(): ModuleDefinition[] {
    return Array.from(modules.values());
  },

  /** Return lightweight info (no routes/views) for all modules */
  getAllInfo(): ModuleInfo[] {
    return Array.from(modules.values()).map(m => ({
      id: m.id,
      name: m.name,
      icon: m.icon,
      description: m.description,
      dataFolder: m.dataFolder,
    }));
  },

  /** Look up a single module by ID */
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

  /** Return full definitions for only the modules enabled in a campaign */
  getForCampaign(campaign: CampaignConfig): ModuleDefinition[] {
    return campaign.modules
      .map(id => modules.get(id))
      .filter((m): m is ModuleDefinition => m !== undefined);
  },

  /** Return lightweight info for only the modules enabled in a campaign */
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

  /**
   * Mount every registered module's routes on the Express app.
   * Routes are namespaced under `/api/modules/<moduleId>/`.
   */
  mountRoutes(app: Express): void {
    for (const [moduleId, module] of modules) {
      for (const route of module.routes) {
        const path = `/api/modules/${moduleId}${route.path}`;
        const method = route.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete' | 'patch';
        // Prepend any validation/auth middleware before the handler
        const handlers = route.middleware
          ? [...route.middleware, route.handler]
          : [route.handler];
        app[method](path, ...handlers);
        console.log(`  Route mounted: ${route.method} ${path}`);
      }
    }
  },
};

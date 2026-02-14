/**
 * Shared types for the plugin-style module system.
 * Each feature area (NPCs, Locations, Ships, etc.) is a module
 * that declares its routes, views, schema, and optional integrations.
 */

import type { RequestHandler } from 'express';
import type { ZodSchema } from 'zod';
import type { ComponentType } from 'react';

/** A single Express route contributed by a module */
export interface ModuleRoute {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handler: RequestHandler;
  middleware?: RequestHandler[]; // Optional validation/preprocessing middleware
}

/** Configuration for a module's AI generation features */
export interface ModuleAIConfig {
  enabled: boolean;
  [key: string]: unknown;
}

/** Configuration for a module's player-facing site visibility */
export interface ModulePlayerSiteConfig {
  enabled: boolean;
  [key: string]: unknown;
}

/** Props passed to all module view components */
export interface ModuleViewProps {
  /** When present, the view should render a specific file's detail */
  fileId?: string;
}

/**
 * Full module definition registered on the server.
 * Includes routes, view components, schema, and optional feature flags.
 */
export interface ModuleDefinition {
  id: string;
  name: string;
  /** Lucide icon name displayed in the sidebar */
  icon: string;
  description?: string;
  /** Subfolder name under the campaign directory where this module's files live */
  dataFolder: string;
  schema?: ZodSchema; // Optional for modules that don't have their own data
  routes: ModuleRoute[];
  views: {
    list: ComponentType<ModuleViewProps>;
    detail?: ComponentType<ModuleViewProps>;
    [key: string]: ComponentType<ModuleViewProps> | undefined;
  };
  ai?: ModuleAIConfig;
  playerSite?: ModulePlayerSiteConfig;
}

/** Lightweight module info sent to the client (without server-side handlers) */
export interface ModuleInfo {
  id: string;
  name: string;
  icon: string;
  description?: string;
  dataFolder: string;
}

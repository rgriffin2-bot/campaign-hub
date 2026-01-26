import type { RequestHandler } from 'express';
import type { ZodSchema } from 'zod';
import type { ComponentType } from 'react';

export interface ModuleRoute {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  handler: RequestHandler;
}

export interface ModuleAIConfig {
  enabled: boolean;
  [key: string]: unknown;
}

export interface ModulePlayerSiteConfig {
  enabled: boolean;
  [key: string]: unknown;
}

export interface ModuleViewProps {
  fileId?: string;
}

export interface ModuleDefinition {
  id: string;
  name: string;
  icon: string;
  description?: string;
  dataFolder: string;
  schema: ZodSchema;
  routes: ModuleRoute[];
  views: {
    list: ComponentType<ModuleViewProps>;
    detail: ComponentType<ModuleViewProps>;
    [key: string]: ComponentType<ModuleViewProps>;
  };
  ai?: ModuleAIConfig;
  playerSite?: ModulePlayerSiteConfig;
}

// Lightweight module info for client (without server-side handlers)
export interface ModuleInfo {
  id: string;
  name: string;
  icon: string;
  description?: string;
  dataFolder: string;
}

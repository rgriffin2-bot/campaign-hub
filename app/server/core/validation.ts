/**
 * Validation
 *
 * Zod schemas for every API input surface (body, params, query) and an
 * Express middleware factory that wires them together. If validation fails,
 * the middleware short-circuits the request with a 400 response containing
 * human-readable error messages. Schemas are also used by parseJsonField()
 * to safely extract typed values from multipart form data strings.
 */

import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';

// =============================================================================
// Common Schemas — Reusable building blocks
// =============================================================================

export const campaignIdSchema = z.string().min(1, 'Campaign ID is required');

// File ID parameter
export const fileIdSchema = z.string().min(1, 'File ID is required');

// Module ID parameter
export const moduleIdSchema = z.string().min(1, 'Module ID is required');

// =============================================================================
// File Operation Schemas — Used by the generic CRUD file endpoints
// =============================================================================

export const createFileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  content: z.string().optional().default(''),
  frontmatter: z.record(z.unknown()).optional().default({}),
});

// All fields optional on update — only provided fields are merged
export const updateFileSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  content: z.string().optional(),
  frontmatter: z.record(z.unknown()).optional(),
});

// =============================================================================
// Campaign Schemas
// =============================================================================

export const createCampaignSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500).optional().default(''),
  modules: z.array(z.string()).optional(),
});

export const updateCampaignSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  modules: z.array(z.string()).optional(),
});

// =============================================================================
// Live Play Schemas — Scene NPC and Ship validation.
// Both "stats" and "antagonistStats" are accepted for backwards compatibility
// after a field rename.
// =============================================================================

export const sceneNPCSchema = z.object({
  id: z.string().min(1, 'NPC ID is required'),
  name: z.string().min(1, 'NPC name is required'),
  occupation: z.string().optional(),
  portrait: z.string().optional(),
  portraitPosition: z.object({
    x: z.number(),
    y: z.number(),
    scale: z.number(),
  }).optional(),
  hasStats: z.boolean().optional(),
  disposition: z.enum(['hostile', 'friendly', 'neutral']).optional(),
  stats: z.object({
    damage: z.number().optional(),
    maxDamage: z.number().optional(),
    armor: z.number().optional(),
    moves: z.string().optional(),
  }).optional(),
  visibleToPlayers: z.boolean().optional(),
  // Backwards compatibility
  isAntagonist: z.boolean().optional(),
  antagonistStats: z.object({
    damage: z.number().optional(),
    maxDamage: z.number().optional(),
    armor: z.number().optional(),
    moves: z.string().optional(),
  }).optional(),
});

export const updateSceneNPCSchema = z.object({
  name: z.string().min(1).optional(),
  occupation: z.string().optional(),
  portrait: z.string().optional(),
  portraitPosition: z.object({
    x: z.number(),
    y: z.number(),
    scale: z.number(),
  }).optional(),
  hasStats: z.boolean().optional(),
  disposition: z.enum(['hostile', 'friendly', 'neutral']).optional(),
  stats: z.object({
    damage: z.number().optional(),
    maxDamage: z.number().optional(),
    armor: z.number().optional(),
    moves: z.string().optional(),
  }).optional(),
  visibleToPlayers: z.boolean().optional(),
  isAntagonist: z.boolean().optional(),
  antagonistStats: z.object({
    damage: z.number().optional(),
    maxDamage: z.number().optional(),
    armor: z.number().optional(),
    moves: z.string().optional(),
  }).optional(),
});

// Ship damage tracks six subsystems, each with optional minor/major descriptions
export const sceneShipSchema = z.object({
  id: z.string().min(1, 'Ship ID is required'),
  name: z.string().min(1, 'Ship name is required'),
  type: z.string().optional(),
  class: z.string().optional(),
  image: z.string().optional(),
  isCrewShip: z.boolean().optional(),
  disposition: z.enum(['hostile', 'friendly', 'neutral']).optional(),
  pressure: z.number().min(0).max(5).optional(),
  damage: z.object({
    helmControl: z.object({ minor: z.string().optional(), major: z.string().optional() }).optional(),
    enginesDrives: z.object({ minor: z.string().optional(), major: z.string().optional() }).optional(),
    sensorsArrays: z.object({ minor: z.string().optional(), major: z.string().optional() }).optional(),
    hullStructure: z.object({ minor: z.string().optional(), major: z.string().optional() }).optional(),
    powerLifeSupport: z.object({ minor: z.string().optional(), major: z.string().optional() }).optional(),
    weaponsBoarding: z.object({ minor: z.string().optional(), major: z.string().optional() }).optional(),
  }).optional(),
  visibleToPlayers: z.boolean().optional(),
});

// Update schema: all fields optional, id excluded (comes from URL param)
export const updateSceneShipSchema = sceneShipSchema.partial().omit({ id: true });

// =============================================================================
// Player Character Tracker Schemas
// =============================================================================

export const updateTrackersSchema = z.object({
  pressure: z.number().min(0).max(5).optional(),
  stress: z.number().min(0).optional(),
  harm: z.object({
    wounds: z.array(z.string()).optional(),
    conditions: z.array(z.string()).optional(),
  }).optional(),
  resources: z.record(z.number()).optional(),
});

// =============================================================================
// NPC Generation Schema
// =============================================================================

export const npcGenerateSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(2000, 'Prompt too long'),
  includeSecrets: z.boolean().optional().default(true),
});

// =============================================================================
// Portrait/Image Upload Schemas
// =============================================================================

// Sent as a JSON string inside multipart form data, parsed by parseJsonField()
export const cropPositionSchema = z.object({
  x: z.number(),
  y: z.number(),
  scale: z.number().positive(),
}).optional();

// =============================================================================
// Validation Middleware Factory
// =============================================================================

interface ValidationOptions {
  body?: z.ZodSchema;
  params?: z.ZodSchema;
  query?: z.ZodSchema;
}

/**
 * Creates Express middleware that validates request body, params, and/or query
 * against the provided Zod schemas. On success, req.body/params/query are
 * replaced with the parsed (and possibly transformed/defaulted) values.
 */
export function validate(schemas: ValidationOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as typeof req.params;
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query) as typeof req.query;
      }
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: messages,
        });
        return;
      }
      next(error);
    }
  };
}

/**
 * Parse and validate a JSON string from multipart form data.
 * Returns undefined (rather than throwing) for missing/invalid values,
 * since crop positions and similar fields are optional.
 */
export function parseJsonField<T>(
  value: unknown,
  schema: z.ZodSchema<T>
): T | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return schema.parse(parsed);
  } catch {
    return undefined;
  }
}

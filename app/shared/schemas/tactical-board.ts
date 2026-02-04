import { z } from 'zod';

// Token source types - where the token comes from
export const tokenSourceTypes = [
  'pc',
  'npc',
  'ship',
  'location',
  'custom',
  'text',
] as const;

export type TokenSourceType = (typeof tokenSourceTypes)[number];

// Token shapes
export const tokenShapes = ['circle', 'rectangle'] as const;
export type TokenShape = (typeof tokenShapes)[number];

// Label position options
export const labelPositions = ['below', 'above', 'inside', 'hidden'] as const;
export type LabelPosition = (typeof labelPositions)[number];

// Text alignment options (for text boxes)
export const textAlignments = ['left', 'center', 'right'] as const;
export type TextAlignment = (typeof textAlignments)[number];

// Connection styles
export const connectionStyles = ['solid', 'dashed', 'dotted'] as const;
export type ConnectionStyle = (typeof connectionStyles)[number];

// Initiative panel position options
export const initiativePanelPositions = ['right', 'bottom'] as const;
export type InitiativePanelPosition = (typeof initiativePanelPositions)[number];

// Connection between tokens
export const boardConnectionSchema = z.object({
  id: z.string(),
  fromTokenId: z.string(),
  toTokenId: z.string(),
  label: z.string().optional(),
  color: z.string().default('#00ffff'), // Cyan for sci-fi look
  style: z.enum(connectionStyles).default('solid'),
  thickness: z.number().min(1).max(10).default(2),
  animated: z.boolean().default(true), // Animated glow effect
});

export type BoardConnection = z.infer<typeof boardConnectionSchema>;

// Image position within token (for cropping/positioning)
export const imagePositionSchema = z.object({
  x: z.number().default(0),
  y: z.number().default(0),
  scale: z.number().min(0.1).max(5).default(1),
});

export type ImagePosition = z.infer<typeof imagePositionSchema>;

// Individual token on the board
export const boardTokenSchema = z.object({
  id: z.string(),
  sourceType: z.enum(tokenSourceTypes),
  sourceId: z.string(), // ID from source module, or empty for custom
  label: z.string(),
  image: z.string().optional(), // Image path
  imagePosition: imagePositionSchema.optional(),

  // Canvas positioning (pixels from top-left of canvas)
  x: z.number().default(100),
  y: z.number().default(100),
  size: z.number().min(20).max(400).default(80), // Token diameter/width
  rotation: z.number().default(0), // Rotation in degrees
  zIndex: z.number().default(0), // Layer ordering

  // Display options
  shape: z.enum(tokenShapes).default('circle'),
  showLabel: z.boolean().default(true),
  labelPosition: z.enum(labelPositions).default('below'),

  // Text box specific fields
  textContent: z.string().optional(), // For text box tokens (multi-line content)
  textColor: z.string().optional(), // Text color for text boxes
  backgroundColor: z.string().optional(), // Background color for text boxes
  fontSize: z.number().optional(), // Font size for text boxes
  textAlign: z.enum(textAlignments).optional(), // Text alignment for text boxes
  width: z.number().optional(), // Width for text boxes (independent of size)
  height: z.number().optional(), // Height for text boxes (independent of size)

  // Visibility
  visibleToPlayers: z.boolean().default(true),

  // Locking - prevents movement/resize when true
  locked: z.boolean().default(false),
});

export type BoardToken = z.infer<typeof boardTokenSchema>;

// The tactical board itself
export const tacticalBoardSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),

  // Background image (battle map)
  background: z.string().optional(),
  backgroundScale: z.number().min(0.1).max(5).default(1),
  backgroundX: z.number().default(0),
  backgroundY: z.number().default(0),

  // Grid settings
  gridEnabled: z.boolean().default(false),
  gridSize: z.number().min(10).max(200).default(50), // Pixels per grid square
  gridColor: z.string().default('rgba(255, 255, 255, 0.2)'),
  snapToGrid: z.boolean().default(false),

  // Canvas dimensions (virtual size)
  canvasWidth: z.number().min(400).max(10000).default(2000),
  canvasHeight: z.number().min(400).max(10000).default(2000),

  // Tokens on this board
  tokens: z.array(boardTokenSchema).default([]),

  // Connections between tokens
  connections: z.array(boardConnectionSchema).default([]),

  // Performance settings
  animationsEnabled: z.boolean().default(true), // Disable for better performance on complex boards

  // Fog of war settings
  fogEnabled: z.boolean().default(true), // Master toggle for fog visibility
  fogCells: z.array(z.string()).default([]), // Array of "gridX,gridY" cell coordinates

  // Initiative panel settings
  showInitiativePanel: z.boolean().default(false), // Whether to show initiative panel
  initiativePanelPosition: z.enum(initiativePanelPositions).default('right'), // Position of panel

  // Visibility
  hidden: z.boolean().default(false),

  // Tags for organization
  tags: z.array(z.string()).optional().default([]),
});

export type TacticalBoard = z.infer<typeof tacticalBoardSchema>;

// Default values for new tokens
export const DEFAULT_TOKEN_SIZE = 80;
export const DEFAULT_CANVAS_WIDTH = 2000;
export const DEFAULT_CANVAS_HEIGHT = 2000;
export const DEFAULT_GRID_SIZE = 50;

// Helper to create a new token
export function createToken(
  sourceType: TokenSourceType,
  sourceId: string,
  label: string,
  image?: string,
  x = 100,
  y = 100
): BoardToken {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `token-${Date.now()}`,
    sourceType,
    sourceId,
    label,
    image,
    x,
    y,
    size: DEFAULT_TOKEN_SIZE,
    rotation: 0,
    zIndex: 0,
    shape: 'circle',
    showLabel: true,
    labelPosition: 'below',
    visibleToPlayers: true,
    locked: false,
  };
}

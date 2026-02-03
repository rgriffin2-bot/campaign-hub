import type { RequestHandler } from 'express';
import {
  tacticalBoardSchema,
  boardTokenSchema,
  type BoardToken,
} from '../../../shared/schemas/tactical-board.js';
import { createBaseRoutes } from '../base-routes.js';
import { moduleRegistry } from '../registry.js';
import { fileStore } from '../../core/file-store.js';
import { campaignManager } from '../../core/campaign-manager.js';
import type { ModuleDefinition, ModuleRoute } from '../../../shared/types/module.js';

// Placeholder views - will be replaced by actual React components
const PlaceholderView = () => null;

// Helper to generate unique token IDs
function generateTokenId(): string {
  return `token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Add a token to a board
const addTokenHandler: RequestHandler = async (req, res) => {
  try {
    const campaign = campaignManager.getActive();
    if (!campaign) {
      res.status(400).json({ success: false, error: 'No active campaign' });
      return;
    }

    const { fileId: boardId } = req.params;
    const parsedFile = await fileStore.get(campaign.id, 'tactical-boards', boardId);

    if (!parsedFile) {
      res.status(404).json({ success: false, error: 'Board not found' });
      return;
    }

    const boardData = parsedFile.frontmatter as Record<string, unknown>;

    // Validate the incoming token data
    const tokenData = boardTokenSchema.safeParse({
      ...req.body,
      id: generateTokenId(),
    });

    if (!tokenData.success) {
      res.status(400).json({ success: false, error: 'Invalid token data', details: tokenData.error });
      return;
    }

    // Add the token to the board
    const existingTokens = (boardData.tokens || []) as BoardToken[];
    const tokens = [...existingTokens, tokenData.data];
    const updatedBoard = await fileStore.update(campaign.id, 'tactical-boards', boardId, {
      frontmatter: { ...boardData, tokens },
    });

    res.json({ success: true, data: updatedBoard });
  } catch (error) {
    console.error('Error adding token:', error);
    res.status(500).json({ success: false, error: 'Failed to add token' });
  }
};

// Update a token on a board
const updateTokenHandler: RequestHandler = async (req, res) => {
  try {
    const campaign = campaignManager.getActive();
    if (!campaign) {
      res.status(400).json({ success: false, error: 'No active campaign' });
      return;
    }

    const { fileId: boardId, tokenId } = req.params;
    const parsedFile = await fileStore.get(campaign.id, 'tactical-boards', boardId);

    if (!parsedFile) {
      res.status(404).json({ success: false, error: 'Board not found' });
      return;
    }

    const boardData = parsedFile.frontmatter as Record<string, unknown>;
    const tokens: BoardToken[] = (boardData.tokens || []) as BoardToken[];
    const tokenIndex = tokens.findIndex((t) => t.id === tokenId);

    if (tokenIndex === -1) {
      res.status(404).json({ success: false, error: 'Token not found' });
      return;
    }

    // Merge the updates
    const updatedToken = { ...tokens[tokenIndex], ...req.body, id: tokenId };
    const validated = boardTokenSchema.safeParse(updatedToken);

    if (!validated.success) {
      res.status(400).json({ success: false, error: 'Invalid token data', details: validated.error });
      return;
    }

    tokens[tokenIndex] = validated.data;

    const updatedBoard = await fileStore.update(campaign.id, 'tactical-boards', boardId, {
      frontmatter: { ...boardData, tokens },
    });

    res.json({ success: true, data: updatedBoard });
  } catch (error) {
    console.error('Error updating token:', error);
    res.status(500).json({ success: false, error: 'Failed to update token' });
  }
};

// Bulk update tokens (for efficient position updates)
const bulkUpdateTokensHandler: RequestHandler = async (req, res) => {
  try {
    const campaign = campaignManager.getActive();
    if (!campaign) {
      res.status(400).json({ success: false, error: 'No active campaign' });
      return;
    }

    const { fileId: boardId } = req.params;
    const parsedFile = await fileStore.get(campaign.id, 'tactical-boards', boardId);

    if (!parsedFile) {
      res.status(404).json({ success: false, error: 'Board not found' });
      return;
    }

    const boardData = parsedFile.frontmatter as Record<string, unknown>;
    const updates: Array<{ id: string; [key: string]: unknown }> = req.body.tokens || [];
    const tokens: BoardToken[] = [...((boardData.tokens || []) as BoardToken[])];

    // Apply each update
    for (const update of updates) {
      const tokenIndex = tokens.findIndex((t) => t.id === update.id);
      if (tokenIndex !== -1) {
        tokens[tokenIndex] = { ...tokens[tokenIndex], ...update };
      }
    }

    const updatedBoard = await fileStore.update(campaign.id, 'tactical-boards', boardId, {
      frontmatter: { ...boardData, tokens },
    });

    res.json({ success: true, data: updatedBoard });
  } catch (error) {
    console.error('Error bulk updating tokens:', error);
    res.status(500).json({ success: false, error: 'Failed to update tokens' });
  }
};

// Delete a token from a board
const deleteTokenHandler: RequestHandler = async (req, res) => {
  try {
    const campaign = campaignManager.getActive();
    if (!campaign) {
      res.status(400).json({ success: false, error: 'No active campaign' });
      return;
    }

    const { fileId: boardId, tokenId } = req.params;
    const parsedFile = await fileStore.get(campaign.id, 'tactical-boards', boardId);

    if (!parsedFile) {
      res.status(404).json({ success: false, error: 'Board not found' });
      return;
    }

    const boardData = parsedFile.frontmatter as Record<string, unknown>;
    const tokens: BoardToken[] = (boardData.tokens || []) as BoardToken[];
    const filteredTokens = tokens.filter((t) => t.id !== tokenId);

    if (filteredTokens.length === tokens.length) {
      res.status(404).json({ success: false, error: 'Token not found' });
      return;
    }

    const updatedBoard = await fileStore.update(campaign.id, 'tactical-boards', boardId, {
      frontmatter: { ...boardData, tokens: filteredTokens },
    });

    res.json({ success: true, data: updatedBoard });
  } catch (error) {
    console.error('Error deleting token:', error);
    res.status(500).json({ success: false, error: 'Failed to delete token' });
  }
};

// Get base routes
const baseRoutes = createBaseRoutes('tactical-boards');

// Add custom token routes
const customRoutes: ModuleRoute[] = [
  ...baseRoutes,
  { method: 'POST', path: '/:fileId/tokens', handler: addTokenHandler },
  { method: 'PATCH', path: '/:fileId/tokens/:tokenId', handler: updateTokenHandler },
  { method: 'PATCH', path: '/:fileId/tokens', handler: bulkUpdateTokensHandler },
  { method: 'DELETE', path: '/:fileId/tokens/:tokenId', handler: deleteTokenHandler },
];

export const tacticalBoardModule: ModuleDefinition = {
  id: 'tactical-board',
  name: 'Tactical Board',
  icon: 'LayoutGrid',
  description: 'Visual encounter maps with tokens from your campaign',
  dataFolder: 'tactical-boards',
  schema: tacticalBoardSchema,
  routes: customRoutes,
  views: {
    list: PlaceholderView,
    detail: PlaceholderView,
  },
};

// Register the module
moduleRegistry.register(tacticalBoardModule);

export default tacticalBoardModule;

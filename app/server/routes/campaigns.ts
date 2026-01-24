import { Router, Request, Response } from 'express';
import { FileSystemManager } from '../../src/core/data/fileSystemManager.js';

export function createCampaignRoutes(fm: FileSystemManager) {
  const router = Router();

  // GET /api/campaigns - List all campaigns
  router.get('/', async (req: Request, res: Response) => {
    try {
      const campaigns = await fm.listCampaigns();
      res.json(campaigns);
    } catch (error) {
      console.error('Error in GET /api/campaigns:', error);
      res.status(500).json({ error: 'Failed to load campaigns' });
    }
  });

  // GET /api/campaigns/:id - Get campaign config
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const config = await fm.loadCampaignConfig(req.params.id);
      res.json(config);
    } catch (error) {
      console.error(`Error in GET /api/campaigns/${req.params.id}:`, error);
      res.status(404).json({ error: 'Campaign not found' });
    }
  });

  // GET /api/campaigns/:id/:entityType - List entities of a type
  router.get('/:id/:entityType', async (req: Request, res: Response) => {
    try {
      const { id, entityType } = req.params;
      const entities = await fm.listEntities(id, entityType);
      res.json(entities);
    } catch (error) {
      console.error(
        `Error in GET /api/campaigns/${req.params.id}/${req.params.entityType}:`,
        error
      );
      res.status(500).json({ error: `Failed to load ${req.params.entityType}s` });
    }
  });

  // GET /api/campaigns/:id/:entityType/:entityId - Get specific entity
  router.get('/:id/:entityType/:entityId', async (req: Request, res: Response) => {
    try {
      const { id, entityType, entityId } = req.params;
      const entity = await fm.getEntity(id, entityType, entityId);

      if (!entity) {
        return res.status(404).json({ error: 'Entity not found' });
      }

      res.json(entity);
    } catch (error) {
      console.error(
        `Error in GET /api/campaigns/${req.params.id}/${req.params.entityType}/${req.params.entityId}:`,
        error
      );
      res.status(500).json({ error: 'Failed to load entity' });
    }
  });

  // POST /api/campaigns/:id/:entityType - Create entity
  router.post('/:id/:entityType', async (req: Request, res: Response) => {
    try {
      const { id, entityType } = req.params;
      const entity = await fm.createEntity(id, entityType, req.body);
      res.status(201).json(entity);
    } catch (error) {
      console.error(
        `Error in POST /api/campaigns/${req.params.id}/${req.params.entityType}:`,
        error
      );
      res.status(500).json({ error: 'Failed to create entity' });
    }
  });

  // PUT /api/campaigns/:id/:entityType/:entityId - Update entity
  router.put('/:id/:entityType/:entityId', async (req: Request, res: Response) => {
    try {
      const { id, entityType, entityId } = req.params;
      const entity = await fm.updateEntity(id, entityType, entityId, req.body);

      if (!entity) {
        return res.status(404).json({ error: 'Entity not found' });
      }

      res.json(entity);
    } catch (error) {
      console.error(
        `Error in PUT /api/campaigns/${req.params.id}/${req.params.entityType}/${req.params.entityId}:`,
        error
      );
      res.status(500).json({ error: 'Failed to update entity' });
    }
  });

  // DELETE /api/campaigns/:id/:entityType/:entityId - Delete entity
  router.delete('/:id/:entityType/:entityId', async (req: Request, res: Response) => {
    try {
      const { id, entityType, entityId } = req.params;
      const success = await fm.deleteEntity(id, entityType, entityId);

      if (!success) {
        return res.status(404).json({ error: 'Entity not found' });
      }

      res.json({ success: true });
    } catch (error) {
      console.error(
        `Error in DELETE /api/campaigns/${req.params.id}/${req.params.entityType}/${req.params.entityId}:`,
        error
      );
      res.status(500).json({ error: 'Failed to delete entity' });
    }
  });

  return router;
}

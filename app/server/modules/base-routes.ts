import type { RequestHandler } from 'express';
import { fileStore } from '../core/file-store.js';
import { campaignManager } from '../core/campaign-manager.js';
import type { ModuleRoute } from '../../shared/types/module.js';

export function createBaseRoutes(moduleFolder: string): ModuleRoute[] {
  const listHandler: RequestHandler = async (_req, res) => {
    try {
      const campaign = campaignManager.getActive();
      if (!campaign) {
        res.status(400).json({ success: false, error: 'No active campaign' });
        return;
      }

      const files = await fileStore.list(campaign.id, moduleFolder);
      res.json({ success: true, data: files });
    } catch (error) {
      console.error('Error listing files:', error);
      res.status(500).json({ success: false, error: 'Failed to list files' });
    }
  };

  const getHandler: RequestHandler = async (req, res) => {
    try {
      const campaign = campaignManager.getActive();
      if (!campaign) {
        res.status(400).json({ success: false, error: 'No active campaign' });
        return;
      }

      const { fileId } = req.params;
      const file = await fileStore.get(campaign.id, moduleFolder, fileId);

      if (!file) {
        res.status(404).json({ success: false, error: 'File not found' });
        return;
      }

      res.json({ success: true, data: file });
    } catch (error) {
      console.error('Error getting file:', error);
      res.status(500).json({ success: false, error: 'Failed to get file' });
    }
  };

  const createHandler: RequestHandler = async (req, res) => {
    try {
      const campaign = campaignManager.getActive();
      if (!campaign) {
        res.status(400).json({ success: false, error: 'No active campaign' });
        return;
      }

      const file = await fileStore.create(campaign.id, moduleFolder, req.body);
      res.status(201).json({ success: true, data: file });
    } catch (error) {
      console.error('Error creating file:', error);
      res.status(500).json({ success: false, error: 'Failed to create file' });
    }
  };

  const updateHandler: RequestHandler = async (req, res) => {
    try {
      const campaign = campaignManager.getActive();
      if (!campaign) {
        res.status(400).json({ success: false, error: 'No active campaign' });
        return;
      }

      const { fileId } = req.params;
      const file = await fileStore.update(campaign.id, moduleFolder, fileId, req.body);

      if (!file) {
        res.status(404).json({ success: false, error: 'File not found' });
        return;
      }

      res.json({ success: true, data: file });
    } catch (error) {
      console.error('Error updating file:', error);
      res.status(500).json({ success: false, error: 'Failed to update file' });
    }
  };

  const deleteHandler: RequestHandler = async (req, res) => {
    try {
      const campaign = campaignManager.getActive();
      if (!campaign) {
        res.status(400).json({ success: false, error: 'No active campaign' });
        return;
      }

      const { fileId } = req.params;
      const success = await fileStore.delete(campaign.id, moduleFolder, fileId);

      if (!success) {
        res.status(404).json({ success: false, error: 'File not found' });
        return;
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(500).json({ success: false, error: 'Failed to delete file' });
    }
  };

  return [
    { method: 'GET', path: '/', handler: listHandler },
    { method: 'GET', path: '/:fileId', handler: getHandler },
    { method: 'POST', path: '/', handler: createHandler },
    { method: 'PUT', path: '/:fileId', handler: updateHandler },
    { method: 'DELETE', path: '/:fileId', handler: deleteHandler },
  ];
}

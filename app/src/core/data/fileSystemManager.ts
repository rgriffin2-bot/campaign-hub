import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import YAML from 'yaml';
import type { Campaign, Entity, ParsedMarkdown } from '../types';

export class FileSystemManager {
  private campaignRoot: string;

  constructor(campaignRoot: string) {
    this.campaignRoot = campaignRoot;
  }

  /**
   * Get list of available campaigns
   */
  async listCampaigns(): Promise<Campaign[]> {
    try {
      const entries = await fs.readdir(this.campaignRoot, {
        withFileTypes: true,
      });

      const campaigns: Campaign[] = [];

      for (const entry of entries) {
        if (entry.isDirectory() && entry.name !== '_global') {
          try {
            const config = await this.loadCampaignConfig(entry.name);
            campaigns.push(config);
          } catch (error) {
            // Skip directories without valid campaign config
            console.warn(`Skipping directory ${entry.name}: invalid campaign config`);
          }
        }
      }

      return campaigns;
    } catch (error) {
      console.error('Error listing campaigns:', error);
      return [];
    }
  }

  /**
   * Load campaign configuration from campaigns/[id]/_meta/campaign.yaml
   */
  async loadCampaignConfig(campaignId: string): Promise<Campaign> {
    const configPath = path.join(
      this.campaignRoot,
      campaignId,
      '_meta',
      'campaign.yaml'
    );

    const content = await fs.readFile(configPath, 'utf-8');
    return YAML.parse(content) as Campaign;
  }

  /**
   * Read and parse markdown file with YAML frontmatter
   */
  async readMarkdownFile(filePath: string): Promise<ParsedMarkdown> {
    const fullPath = path.join(this.campaignRoot, filePath);
    const content = await fs.readFile(fullPath, 'utf-8');

    const { data, content: markdown } = matter(content);

    return {
      frontmatter: data,
      content: markdown,
      path: filePath,
    };
  }

  /**
   * Write markdown file with YAML frontmatter
   */
  async writeMarkdownFile(
    filePath: string,
    data: ParsedMarkdown
  ): Promise<void> {
    const fullPath = path.join(this.campaignRoot, filePath);

    // Update modified timestamp
    const frontmatter = {
      ...data.frontmatter,
      modified: new Date().toISOString(),
    };

    const output = matter.stringify(data.content, frontmatter);

    // Ensure directory exists
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, output, 'utf-8');
  }

  /**
   * List all entities of a type in a campaign
   */
  async listEntities(
    campaignId: string,
    entityType: string
  ): Promise<Entity[]> {
    const dirPath = path.join(
      this.campaignRoot,
      campaignId,
      `${entityType}s`
    );

    try {
      const files = await this.getMarkdownFiles(dirPath);
      const entities: Entity[] = [];

      for (const file of files) {
        try {
          const relativePath = path.relative(
            this.campaignRoot,
            file
          );
          const parsed = await this.readMarkdownFile(relativePath);
          entities.push(parsed.frontmatter as Entity);
        } catch (error) {
          console.warn(`Error reading entity file ${file}:`, error);
        }
      }

      return entities;
    } catch (error) {
      console.error(`Error listing entities for ${entityType}:`, error);
      return [];
    }
  }

  /**
   * Get a specific entity
   */
  async getEntity(
    campaignId: string,
    entityType: string,
    entityId: string
  ): Promise<Entity | null> {
    const dirPath = path.join(
      this.campaignRoot,
      campaignId,
      `${entityType}s`
    );

    try {
      const files = await this.getMarkdownFiles(dirPath);

      for (const file of files) {
        const relativePath = path.relative(this.campaignRoot, file);
        const parsed = await this.readMarkdownFile(relativePath);

        if (parsed.frontmatter.id === entityId) {
          return {
            ...parsed.frontmatter,
            _content: parsed.content,
            _path: relativePath,
          } as any;
        }
      }

      return null;
    } catch (error) {
      console.error(`Error getting entity ${entityId}:`, error);
      return null;
    }
  }

  /**
   * Create a new entity
   */
  async createEntity(
    campaignId: string,
    entityType: string,
    data: Partial<Entity> & { name: string }
  ): Promise<Entity> {
    const id = data.id || this.generateId(data.name);
    const now = new Date().toISOString();

    const entity: Entity = {
      ...data,
      id,
      type: entityType,
      name: data.name,
      created: now,
      modified: now,
      visibility: data.visibility || 'dm-only',
    };

    // Extract content if provided
    const content = (data as any)._content || '';
    delete (entity as any)._content;

    const fileName = `${id}.md`;
    const filePath = path.join(campaignId, `${entityType}s`, fileName);

    await this.writeMarkdownFile(filePath, {
      frontmatter: entity,
      content,
      path: filePath,
    });

    return entity;
  }

  /**
   * Update an existing entity
   */
  async updateEntity(
    campaignId: string,
    entityType: string,
    entityId: string,
    updates: Partial<Entity>
  ): Promise<Entity | null> {
    const existing = await this.getEntity(campaignId, entityType, entityId);

    if (!existing) {
      return null;
    }

    const updated = {
      ...existing,
      ...updates,
      id: entityId, // Preserve ID
      modified: new Date().toISOString(),
    };

    // Extract content and path
    const content = (updated as any)._content || '';
    const filePath = (existing as any)._path;
    delete (updated as any)._content;
    delete (updated as any)._path;

    await this.writeMarkdownFile(filePath, {
      frontmatter: updated,
      content,
      path: filePath,
    });

    return updated;
  }

  /**
   * Delete an entity
   */
  async deleteEntity(
    campaignId: string,
    entityType: string,
    entityId: string
  ): Promise<boolean> {
    const existing = await this.getEntity(campaignId, entityType, entityId);

    if (!existing) {
      return false;
    }

    const filePath = (existing as any)._path;
    const fullPath = path.join(this.campaignRoot, filePath);

    try {
      await fs.unlink(fullPath);
      return true;
    } catch (error) {
      console.error(`Error deleting entity ${entityId}:`, error);
      return false;
    }
  }

  /**
   * Recursively get all markdown files in a directory
   */
  private async getMarkdownFiles(dirPath: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          const subFiles = await this.getMarkdownFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
      return [];
    }

    return files;
  }

  /**
   * Generate a URL-safe ID from a name
   */
  private generateId(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}

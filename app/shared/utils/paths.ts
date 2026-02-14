/**
 * Path construction utilities for the campaign filesystem layout.
 * All paths follow the convention: <campaignsDir>/<campaignId>/<moduleFolder>/<file>.
 */

import path from 'path';

/** Returns the root directory for a campaign */
export function getCampaignPath(campaignsDir: string, campaignId: string): string {
  return path.join(campaignsDir, campaignId);
}

/** Returns the data directory for a specific module within a campaign */
export function getModulePath(
  campaignsDir: string,
  campaignId: string,
  moduleFolder: string
): string {
  return path.join(campaignsDir, campaignId, moduleFolder);
}

/** Returns the full path to a specific data file within a module */
export function getFilePath(
  campaignsDir: string,
  campaignId: string,
  moduleFolder: string,
  fileName: string
): string {
  return path.join(campaignsDir, campaignId, moduleFolder, fileName);
}

/** Returns the full path to an asset file (images, uploads, etc.) */
export function getAssetPath(
  campaignsDir: string,
  campaignId: string,
  assetPath: string
): string {
  return path.join(campaignsDir, campaignId, 'assets', assetPath);
}

/** Returns the path to a campaign's configuration YAML file */
export function getCampaignConfigPath(campaignsDir: string, campaignId: string): string {
  return path.join(campaignsDir, campaignId, 'campaign.yaml');
}

/** Replaces backslashes with forward slashes for cross-platform consistency */
export function normalizePathSeparators(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

/** Returns a normalized relative path from basePath to fullPath */
export function getRelativePath(basePath: string, fullPath: string): string {
  return normalizePathSeparators(path.relative(basePath, fullPath));
}

import path from 'path';

export function getCampaignPath(campaignsDir: string, campaignId: string): string {
  return path.join(campaignsDir, campaignId);
}

export function getModulePath(
  campaignsDir: string,
  campaignId: string,
  moduleFolder: string
): string {
  return path.join(campaignsDir, campaignId, moduleFolder);
}

export function getFilePath(
  campaignsDir: string,
  campaignId: string,
  moduleFolder: string,
  fileName: string
): string {
  return path.join(campaignsDir, campaignId, moduleFolder, fileName);
}

export function getAssetPath(
  campaignsDir: string,
  campaignId: string,
  assetPath: string
): string {
  return path.join(campaignsDir, campaignId, 'assets', assetPath);
}

export function getCampaignConfigPath(campaignsDir: string, campaignId: string): string {
  return path.join(campaignsDir, campaignId, 'campaign.yaml');
}

export function normalizePathSeparators(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

export function getRelativePath(basePath: string, fullPath: string): string {
  return normalizePathSeparators(path.relative(basePath, fullPath));
}

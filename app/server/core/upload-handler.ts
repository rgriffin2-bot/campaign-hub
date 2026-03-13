/**
 * Upload Handler
 *
 * Image processing pipeline for all uploaded assets. Uses Sharp to resize,
 * crop, and convert images before persisting them to the campaign's assets/
 * directory. Each asset type (portraits, maps, ships, boards, artefacts) has
 * its own target dimensions and format to balance quality vs. file size.
 *
 * All images are stored in memory via multer during upload, processed by
 * Sharp, then written to disk -- the original upload is never saved.
 */

import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { config } from '../config.js';

// ============================================================================
// Multer Configuration
// ============================================================================

async function ensureUploadDir(campaignId: string): Promise<string> {
  const uploadDir = path.join(config.campaignsDir, campaignId, 'assets', 'portraits');
  await fs.mkdir(uploadDir, { recursive: true });
  return uploadDir;
}

// Memory storage so we can pipe the buffer through Sharp before writing to disk
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Separate multer instance for 3D model uploads (GLB/GLTF, not images)
export const modelUpload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit for 3D models
  },
});

// ============================================================================
// NPC Portraits — 500x500 square JPEG
// ============================================================================

interface CropPosition {
  x: number;
  y: number;
  scale: number;
}

/** Resize an NPC portrait to a 500x500 center-cropped JPEG. */
export async function processAndSavePortrait(
  campaignId: string,
  npcId: string,
  buffer: Buffer,
  _cropPosition?: CropPosition
): Promise<string> {
  const uploadDir = await ensureUploadDir(campaignId);
  const filename = `${npcId}.jpg`;
  const filepath = path.join(uploadDir, filename);

  // Server does a simple center crop; fine positioning (pan/zoom) is stored
  // in NPC frontmatter and applied client-side via CSS object-position.
  await sharp(buffer)
    .resize(500, 500, {
      fit: 'cover',
      position: 'center',
    })
    .jpeg({ quality: 85 })
    .toFile(filepath);

  // Return relative path from campaign root
  return `assets/portraits/${filename}`;
}

export async function deletePortrait(
  campaignId: string,
  portraitPath: string
): Promise<void> {
  const fullPath = path.join(config.campaignsDir, campaignId, portraitPath);
  try {
    await fs.unlink(fullPath);
  } catch {
    // Ignore if file doesn't exist
  }
}

// ============================================================================
// Lore Images — max 1200x600, aspect-ratio-preserving JPEG
// ============================================================================

async function ensureLoreImageDir(campaignId: string): Promise<string> {
  const uploadDir = path.join(config.campaignsDir, campaignId, 'assets', 'lore');
  await fs.mkdir(uploadDir, { recursive: true });
  return uploadDir;
}

export async function processAndSaveLoreImage(
  campaignId: string,
  loreId: string,
  buffer: Buffer
): Promise<string> {
  const uploadDir = await ensureLoreImageDir(campaignId);
  const filename = `${loreId}.jpg`;
  const filepath = path.join(uploadDir, filename);

  // Resize to a reasonable size while maintaining aspect ratio
  // Max width 1200px, height will scale proportionally
  await sharp(buffer)
    .resize(1200, 600, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 85 })
    .toFile(filepath);

  // Return relative path from campaign root
  return `assets/lore/${filename}`;
}

export async function deleteLoreImage(
  campaignId: string,
  imagePath: string
): Promise<void> {
  const fullPath = path.join(config.campaignsDir, campaignId, imagePath);
  try {
    await fs.unlink(fullPath);
  } catch {
    // Ignore if file doesn't exist
  }
}

// ============================================================================
// Location Images — 1200x600 landscape cover-crop JPEG
// ============================================================================

async function ensureLocationImageDir(campaignId: string): Promise<string> {
  const uploadDir = path.join(config.campaignsDir, campaignId, 'assets', 'locations');
  await fs.mkdir(uploadDir, { recursive: true });
  return uploadDir;
}

export async function processAndSaveLocationImage(
  campaignId: string,
  locationId: string,
  buffer: Buffer
): Promise<string> {
  const uploadDir = await ensureLocationImageDir(campaignId);
  const filename = `${locationId}.jpg`;
  const filepath = path.join(uploadDir, filename);

  // Resize to landscape dimensions for location images
  // Max width 1200px, height 600px, maintaining aspect ratio
  await sharp(buffer)
    .resize(1200, 600, {
      fit: 'cover',
      position: 'center',
    })
    .jpeg({ quality: 85 })
    .toFile(filepath);

  // Return relative path from campaign root
  return `assets/locations/${filename}`;
}

export async function deleteLocationImage(
  campaignId: string,
  imagePath: string
): Promise<void> {
  const fullPath = path.join(config.campaignsDir, campaignId, imagePath);
  try {
    await fs.unlink(fullPath);
  } catch {
    // Ignore if file doesn't exist
  }
}

// ============================================================================
// Map Images — Small 200x200 PNG icons for the star system map.
// GIFs are saved as-is to preserve animation (Sharp can't re-encode them).
// ============================================================================

async function ensureMapImageDir(campaignId: string): Promise<string> {
  const uploadDir = path.join(config.campaignsDir, campaignId, 'assets', 'map-images');
  await fs.mkdir(uploadDir, { recursive: true });
  return uploadDir;
}

export async function processAndSaveMapImage(
  campaignId: string,
  locationId: string,
  buffer: Buffer,
  originalFilename: string
): Promise<string> {
  const uploadDir = await ensureMapImageDir(campaignId);

  // Preserve original extension for transparency support (PNG, GIF)
  const ext = path.extname(originalFilename).toLowerCase() || '.png';

  // Get image metadata to determine processing
  const metadata = await sharp(buffer).metadata();

  // For GIFs, preserve the original file to keep animation
  // Sharp doesn't handle animated GIFs well, so we save as-is
  if (ext === '.gif' || metadata.format === 'gif') {
    const gifFilename = `${locationId}.gif`;
    const gifFilepath = path.join(uploadDir, gifFilename);
    await fs.writeFile(gifFilepath, buffer);
    return `assets/map-images/${gifFilename}`;
  }

  // For other formats, resize and convert to PNG
  let sharpInstance = sharp(buffer).resize(200, 200, {
    fit: 'inside',
    withoutEnlargement: true,
  });

  sharpInstance = sharpInstance.png({ quality: 90 });

  const pngFilename = `${locationId}.png`;
  const pngFilepath = path.join(uploadDir, pngFilename);
  await sharpInstance.toFile(pngFilepath);

  // Return relative path from campaign root
  return `assets/map-images/${pngFilename}`;
}

export async function deleteMapImage(
  campaignId: string,
  imagePath: string
): Promise<void> {
  const fullPath = path.join(config.campaignsDir, campaignId, imagePath);
  try {
    await fs.unlink(fullPath);
  } catch {
    // Ignore if file doesn't exist
  }
}

// ============================================================================
// Player Character Portraits — 500x500 square JPEG (same as NPC portraits)
// ============================================================================

async function ensurePCPortraitDir(campaignId: string): Promise<string> {
  const uploadDir = path.join(config.campaignsDir, campaignId, 'assets', 'pc-portraits');
  await fs.mkdir(uploadDir, { recursive: true });
  return uploadDir;
}

export async function processAndSavePCPortrait(
  campaignId: string,
  pcId: string,
  buffer: Buffer
): Promise<string> {
  const uploadDir = await ensurePCPortraitDir(campaignId);
  const filename = `${pcId}.jpg`;
  const filepath = path.join(uploadDir, filename);

  // Resize to 500x500 square for character portraits
  await sharp(buffer)
    .resize(500, 500, {
      fit: 'cover',
      position: 'center',
    })
    .jpeg({ quality: 85 })
    .toFile(filepath);

  // Return relative path from campaign root
  return `assets/pc-portraits/${filename}`;
}

export async function deletePCPortrait(
  campaignId: string,
  imagePath: string
): Promise<void> {
  const fullPath = path.join(config.campaignsDir, campaignId, imagePath);
  try {
    await fs.unlink(fullPath);
  } catch {
    // Ignore if file doesn't exist
  }
}

// ============================================================================
// Ship Images — 800x450 landscape (~16:9) cover-crop JPEG
// ============================================================================

async function ensureShipImageDir(campaignId: string): Promise<string> {
  const uploadDir = path.join(config.campaignsDir, campaignId, 'assets', 'ships');
  await fs.mkdir(uploadDir, { recursive: true });
  return uploadDir;
}

export async function processAndSaveShipImage(
  campaignId: string,
  shipId: string,
  buffer: Buffer
): Promise<string> {
  const uploadDir = await ensureShipImageDir(campaignId);
  const filename = `${shipId}.jpg`;
  const filepath = path.join(uploadDir, filename);

  // Resize to landscape dimensions for ship images (wider aspect ratio)
  // Max width 800px, height 450px (16:9 ish), maintaining aspect ratio
  await sharp(buffer)
    .resize(800, 450, {
      fit: 'cover',
      position: 'center',
    })
    .jpeg({ quality: 85 })
    .toFile(filepath);

  // Return relative path from campaign root
  return `assets/ships/${filename}`;
}

export async function deleteShipImage(
  campaignId: string,
  imagePath: string
): Promise<void> {
  const fullPath = path.join(config.campaignsDir, campaignId, imagePath);
  try {
    await fs.unlink(fullPath);
  } catch {
    // Ignore if file doesn't exist
  }
}

// ============================================================================
// Board Backgrounds — Up to 4000x4000 JPEG for zoomable battle maps
// ============================================================================

async function ensureBoardBackgroundDir(campaignId: string): Promise<string> {
  const uploadDir = path.join(config.campaignsDir, campaignId, 'assets', 'board-backgrounds');
  await fs.mkdir(uploadDir, { recursive: true });
  return uploadDir;
}

export async function processAndSaveBoardBackground(
  campaignId: string,
  boardId: string,
  buffer: Buffer
): Promise<string> {
  const uploadDir = await ensureBoardBackgroundDir(campaignId);
  const filename = `${boardId}.jpg`;
  const filepath = path.join(uploadDir, filename);

  // For board backgrounds, we want to keep them large for zooming
  // Max dimension 4000px to handle large battle maps while keeping file size reasonable
  await sharp(buffer)
    .resize(4000, 4000, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 90 })
    .toFile(filepath);

  // Return relative path from campaign root
  return `assets/board-backgrounds/${filename}`;
}

export async function deleteBoardBackground(
  campaignId: string,
  imagePath: string
): Promise<void> {
  const fullPath = path.join(config.campaignsDir, campaignId, imagePath);
  try {
    await fs.unlink(fullPath);
  } catch {
    // Ignore if file doesn't exist
  }
}

// ============================================================================
// Board Token Images — 500x500 max PNG (preserves transparency).
// Returns a "normalizedSize" hint so the UI can render the token at an
// appropriate default scale based on the original image dimensions.
// ============================================================================

async function ensureBoardTokenImageDir(campaignId: string): Promise<string> {
  const uploadDir = path.join(config.campaignsDir, campaignId, 'assets', 'board-tokens');
  await fs.mkdir(uploadDir, { recursive: true });
  return uploadDir;
}

// Size range for normalized token display size (in board-space pixels).
// The original image dimensions are mapped into this range so large uploads
// don't dominate the board and tiny icons are still legible.
const TOKEN_IMAGE_MIN_SIZE = 100;
const TOKEN_IMAGE_MAX_SIZE = 400;
const TOKEN_IMAGE_DEFAULT_SIZE = 200;

export async function processAndSaveBoardTokenImage(
  campaignId: string,
  tokenId: string,
  buffer: Buffer,
  originalFilename: string
): Promise<{ path: string; normalizedSize: number }> {
  const uploadDir = await ensureBoardTokenImageDir(campaignId);

  // Get image metadata
  const metadata = await sharp(buffer).metadata();
  const originalWidth = metadata.width || TOKEN_IMAGE_DEFAULT_SIZE;
  const originalHeight = metadata.height || TOKEN_IMAGE_DEFAULT_SIZE;

  // Determine the larger dimension
  const largerDimension = Math.max(originalWidth, originalHeight);

  // Linear interpolation: map the original image's larger dimension (50-1000px)
  // onto the display-size range (100-400px), clamping at the extremes.
  let normalizedSize: number;
  if (largerDimension > 1000) {
    normalizedSize = TOKEN_IMAGE_MAX_SIZE;
  } else if (largerDimension < 50) {
    normalizedSize = TOKEN_IMAGE_MIN_SIZE;
  } else {
    const ratio = (largerDimension - 50) / (1000 - 50);
    normalizedSize = Math.round(TOKEN_IMAGE_MIN_SIZE + ratio * (TOKEN_IMAGE_MAX_SIZE - TOKEN_IMAGE_MIN_SIZE));
  }

  // Preserve original extension for transparency support (PNG, GIF)
  const ext = path.extname(originalFilename).toLowerCase() || '.png';

  // For GIFs, preserve the original file to keep animation
  if (ext === '.gif' || metadata.format === 'gif') {
    const gifFilename = `${tokenId}.gif`;
    const gifFilepath = path.join(uploadDir, gifFilename);
    await fs.writeFile(gifFilepath, buffer);
    return { path: `assets/board-tokens/${gifFilename}`, normalizedSize };
  }

  // For other formats, resize to a reasonable size and save as PNG (for transparency)
  const processedFilename = `${tokenId}.png`;
  const processedFilepath = path.join(uploadDir, processedFilename);

  await sharp(buffer)
    .resize(500, 500, {
      fit: 'inside',
      withoutEnlargement: false, // Allow enlargement for very small images
    })
    .png({ quality: 90 })
    .toFile(processedFilepath);

  return { path: `assets/board-tokens/${processedFilename}`, normalizedSize };
}

export async function deleteBoardTokenImage(
  campaignId: string,
  imagePath: string
): Promise<void> {
  const fullPath = path.join(config.campaignsDir, campaignId, imagePath);
  try {
    await fs.unlink(fullPath);
  } catch {
    // Ignore if file doesn't exist
  }
}

// =============================================================================
// Story Artefact Images — Multi-image gallery with full + thumbnail versions.
// Each artefact gets its own subdirectory under assets/artefacts/<artefactId>/
// =============================================================================

// Each artefact stores images in its own folder for easy bulk cleanup on delete
async function ensureArtefactImageDir(campaignId: string, artefactId: string): Promise<string> {
  const uploadDir = path.join(config.campaignsDir, campaignId, 'assets', 'artefacts', artefactId);
  await fs.mkdir(uploadDir, { recursive: true });
  return uploadDir;
}

// Generate a unique image ID based on timestamp
function generateImageId(): string {
  return `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export interface ArtefactImageResult {
  id: string;
  path: string;
  thumbPath: string;
}

export async function processAndSaveArtefactImage(
  campaignId: string,
  artefactId: string,
  buffer: Buffer
): Promise<ArtefactImageResult> {
  const uploadDir = await ensureArtefactImageDir(campaignId, artefactId);
  const imageId = generateImageId();

  // Full-size version: aspect-ratio-preserving, max 2000px on longest side
  const fullFilename = `${imageId}.jpg`;
  const fullFilepath = path.join(uploadDir, fullFilename);

  await sharp(buffer)
    .resize(2000, 2000, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 85 })
    .toFile(fullFilepath);

  // Thumbnail: 500x500 center-crop for gallery grid display
  const thumbFilename = `${imageId}-thumb.jpg`;
  const thumbFilepath = path.join(uploadDir, thumbFilename);

  await sharp(buffer)
    .resize(500, 500, {
      fit: 'cover',
      position: 'center',
    })
    .jpeg({ quality: 80 })
    .toFile(thumbFilepath);

  // Return relative paths from campaign root
  const basePath = `assets/artefacts/${artefactId}`;
  return {
    id: imageId,
    path: `${basePath}/${fullFilename}`,
    thumbPath: `${basePath}/${thumbFilename}`,
  };
}

export async function deleteArtefactImage(
  campaignId: string,
  artefactId: string,
  imageId: string
): Promise<void> {
  const uploadDir = path.join(config.campaignsDir, campaignId, 'assets', 'artefacts', artefactId);

  // Delete both full and thumbnail versions
  const fullPath = path.join(uploadDir, `${imageId}.jpg`);
  const thumbPath = path.join(uploadDir, `${imageId}-thumb.jpg`);

  try {
    await fs.unlink(fullPath);
  } catch {
    // Ignore if file doesn't exist
  }

  try {
    await fs.unlink(thumbPath);
  } catch {
    // Ignore if file doesn't exist
  }
}

export async function deleteArtefactImageFolder(
  campaignId: string,
  artefactId: string
): Promise<void> {
  const folderPath = path.join(config.campaignsDir, campaignId, 'assets', 'artefacts', artefactId);

  try {
    // Remove entire folder and contents
    await fs.rm(folderPath, { recursive: true, force: true });
  } catch {
    // Ignore if folder doesn't exist
  }
}

// ============================================================================
// Faction Images — 800x800 square cover-crop JPEG (logo / emblem style)
// ============================================================================

async function ensureFactionImageDir(campaignId: string): Promise<string> {
  const uploadDir = path.join(config.campaignsDir, campaignId, 'assets', 'factions');
  await fs.mkdir(uploadDir, { recursive: true });
  return uploadDir;
}

export async function processAndSaveFactionImage(
  campaignId: string,
  factionId: string,
  buffer: Buffer
): Promise<string> {
  const uploadDir = await ensureFactionImageDir(campaignId);
  const filename = `${factionId}.jpg`;
  const filepath = path.join(uploadDir, filename);

  await sharp(buffer)
    .resize(800, 800, {
      fit: 'cover',
      position: 'center',
    })
    .jpeg({ quality: 85 })
    .toFile(filepath);

  return `assets/factions/${filename}`;
}

export async function deleteFactionImage(
  campaignId: string,
  imagePath: string
): Promise<void> {
  const fullPath = path.join(config.campaignsDir, campaignId, imagePath);
  try {
    await fs.unlink(fullPath);
  } catch {
    // Ignore if file doesn't exist
  }
}

// ============================================================================
// 3D Models — GLB/GLTF binary passthrough (no image processing)
// ============================================================================

const ALLOWED_3D_EXTENSIONS = new Set(['.glb', '.gltf']);

async function ensure3DModelDir(campaignId: string): Promise<string> {
  const uploadDir = path.join(config.campaignsDir, campaignId, 'assets', '3d-models');
  await fs.mkdir(uploadDir, { recursive: true });
  return uploadDir;
}

/** Save a GLB/GLTF file as-is (no processing). */
export async function processAndSave3DModel(
  campaignId: string,
  locationId: string,
  buffer: Buffer,
  originalFilename: string
): Promise<string> {
  const ext = path.extname(originalFilename).toLowerCase() || '.glb';
  if (!ALLOWED_3D_EXTENSIONS.has(ext)) {
    throw new Error(`Unsupported 3D model format: ${ext}. Use .glb or .gltf`);
  }

  const uploadDir = await ensure3DModelDir(campaignId);
  const filename = `${locationId}${ext}`;
  const filepath = path.join(uploadDir, filename);

  // Binary passthrough — no processing needed
  await fs.writeFile(filepath, buffer);

  return `assets/3d-models/${filename}`;
}

export async function delete3DModel(
  campaignId: string,
  modelPath: string
): Promise<void> {
  const fullPath = path.join(config.campaignsDir, campaignId, modelPath);
  try {
    await fs.unlink(fullPath);
  } catch {
    // Ignore if file doesn't exist
  }
}

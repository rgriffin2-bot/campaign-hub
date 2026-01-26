import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { config } from '../config.js';

// Ensure uploads directory exists
async function ensureUploadDir(campaignId: string): Promise<string> {
  const uploadDir = path.join(config.campaignsDir, campaignId, 'assets', 'portraits');
  await fs.mkdir(uploadDir, { recursive: true });
  return uploadDir;
}

// Configure multer for memory storage (we'll process before saving)
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

interface CropPosition {
  x: number;
  y: number;
  scale: number;
}

export async function processAndSavePortrait(
  campaignId: string,
  npcId: string,
  buffer: Buffer,
  _cropPosition?: CropPosition
): Promise<string> {
  const uploadDir = await ensureUploadDir(campaignId);
  const filename = `${npcId}.jpg`;
  const filepath = path.join(uploadDir, filename);

  // Simply resize to 500x500, cropping from center
  // The position/zoom is stored in the NPC frontmatter and applied via CSS on display
  // This avoids complex server-side crop calculations
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

// Ensure lore images directory exists
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

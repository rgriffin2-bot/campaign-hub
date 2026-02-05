import { z } from 'zod';

// Suggested tags for story artefacts (shown as clickable suggestions in UI)
export const SUGGESTED_ARTEFACT_TAGS = [
  'letter',
  'map',
  'newspaper',
  'dossier',
  'journal',
  'relic',
  'weapon',
  'cursed',
  'evidence',
  'quest-item',
  'diagram',
  'wanted-poster',
  'photograph',
  'artifact',
] as const;

// Individual image within an artefact's gallery
export const artefactImageSchema = z.object({
  id: z.string(), // Unique image ID (timestamp-based)
  path: z.string(), // Relative path: assets/artefacts/{artefactId}/{imageId}.jpg
  thumbPath: z.string().optional(), // Thumbnail path: assets/artefacts/{artefactId}/{imageId}-thumb.jpg
  caption: z.string().optional(),
  isPrimary: z.boolean().optional().default(false), // Display image for list views
});

export type ArtefactImage = z.infer<typeof artefactImageSchema>;

// DM-only content (secrets, notes)
export const storyArtefactDmOnlySchema = z.object({
  secrets: z.string().optional(),
  notes: z.string().optional(),
});

export type StoryArtefactDmOnly = z.infer<typeof storyArtefactDmOnlySchema>;

// Main schema for story artefacts
export const storyArtefactSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name is required'),
  tags: z.array(z.string()).optional().default([]),

  // Multi-image gallery support
  images: z.array(artefactImageSchema).optional().default([]),

  // Player visibility
  hidden: z.boolean().optional().default(false), // Hidden from players until revealed

  // DM-only content
  dmOnly: storyArtefactDmOnlySchema.optional(),
});

export type StoryArtefactFrontmatter = z.infer<typeof storyArtefactSchema>;

export interface StoryArtefactFile {
  frontmatter: StoryArtefactFrontmatter;
  content: string;
  filePath: string;
}

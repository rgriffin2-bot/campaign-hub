import { z } from 'zod';

export const npcDmOnlySchema = z.object({
  secrets: z.string().optional(),
  voice: z.string().optional(),
  notes: z.string().optional(),
});

export const npcSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name is required'),
  occupation: z.string().optional(),
  location: z.string().optional(),
  appearance: z.string().optional(),
  personality: z.string().optional(),
  goals: z.string().optional(),
  dmOnly: npcDmOnlySchema.optional(),
  relatedCharacters: z.array(z.string()).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
});

export type NPCFrontmatter = z.infer<typeof npcSchema>;
export type NPCDmOnly = z.infer<typeof npcDmOnlySchema>;

export interface NPCFile {
  frontmatter: NPCFrontmatter;
  content: string;
  filePath: string;
}

// For AI generation input
export interface NPCGenerateInput {
  prompt: string;
  includeSecrets?: boolean;
}

// For AI generation output
export interface GeneratedNPC {
  name: string;
  occupation?: string;
  location?: string;
  appearance?: string;
  personality?: string;
  goals?: string;
  dmOnly?: {
    secrets?: string;
    voice?: string;
  };
  content?: string;
  tags?: string[];
}

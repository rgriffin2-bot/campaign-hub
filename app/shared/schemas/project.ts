import { z } from 'zod';

// Clock sizes based on project complexity
export const clockSizeSchema = z.enum(['4', '6', '8']);
export type ClockSize = z.infer<typeof clockSizeSchema>;

// Main project schema
export const projectSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(), // What this project is about
  clockSize: clockSizeSchema.default('6'), // 4, 6, or 8 segments
  progress: z.number().int().min(0).default(0), // Current filled segments
  owner: z.string().optional(), // Who's working on this project
  phase: z.number().int().min(1).default(1), // For multi-phase projects
  totalPhases: z.number().int().min(1).default(1), // Total phases if multi-phase
  hidden: z.boolean().optional().default(false), // Hidden from players
  tags: z.array(z.string()).optional().default([]),
  notes: z.string().optional(), // DM notes about this project
});

export type ProjectFrontmatter = z.infer<typeof projectSchema>;

export interface ProjectFile {
  frontmatter: ProjectFrontmatter;
  content: string;
  filePath: string;
}

// Clock size labels for display
export const CLOCK_SIZE_LABELS: Record<ClockSize, string> = {
  '4': 'Simple (4 segments)',
  '6': 'Standard (6 segments)',
  '8': 'Complex (8 segments)',
};

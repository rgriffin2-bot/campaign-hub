import { z } from 'zod';

// Session notes schema
export const sessionNotesSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Title is required'),
  date: z.string().optional(), // Session date (ISO string or readable format)
  author: z.string().optional(), // Who wrote these notes (player name or "DM")
  playerOnly: z.boolean().optional().default(false), // If true, only visible to players (not DM's private notes)
  tags: z.array(z.string()).optional().default([]),
});

export type SessionNotesFrontmatter = z.infer<typeof sessionNotesSchema>;

export interface SessionNotesFile {
  frontmatter: SessionNotesFrontmatter;
  content: string;
  filePath: string;
}

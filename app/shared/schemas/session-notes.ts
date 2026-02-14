/**
 * Session Notes schema.
 * Validates frontmatter for session recap/note files stored in the session-notes/ folder.
 * Supports per-note author attribution and a player-only visibility flag.
 */

import { z } from 'zod';

export const sessionNotesSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Title is required'),
  date: z.string().optional(), // Session date (ISO string or readable format)
  author: z.string().optional(), // Who wrote these notes (player name or "DM")
  playerOnly: z.boolean().optional().default(false), // If true, only visible to players (not DM's private notes)
  tags: z.array(z.string()).optional().default([]),
});

export type SessionNotesFrontmatter = z.infer<typeof sessionNotesSchema>;

/** A fully parsed session notes file (frontmatter + markdown body + path) */
export interface SessionNotesFile {
  frontmatter: SessionNotesFrontmatter;
  content: string;
  filePath: string;
}

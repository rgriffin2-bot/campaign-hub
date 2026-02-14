/**
 * ID and slug generation utilities.
 * Used throughout the app when creating new files and entities.
 */

import { nanoid } from 'nanoid';

/** Generates a random alphanumeric ID using nanoid */
export function generateId(length = 12): string {
  return nanoid(length);
}

/** Converts a display name into a URL-safe kebab-case slug */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Generates a file ID by combining a slugified name with a short random suffix */
export function generateFileId(name: string): string {
  const slug = slugify(name);
  const shortId = nanoid(6);
  return `${slug}-${shortId}`;
}

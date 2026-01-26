import { nanoid } from 'nanoid';

export function generateId(length = 12): string {
  return nanoid(length);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function generateFileId(name: string): string {
  const slug = slugify(name);
  const shortId = nanoid(6);
  return `${slug}-${shortId}`;
}

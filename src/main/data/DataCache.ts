import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { app } from 'electron';

/**
 * Returns the path to static game data (champions, traits, items, augments)
 * for a given set and locale.
 */
export function getStaticDataPath(set: string, locale: string): string {
  return path.join(app.getPath('userData'), 'static', set, locale + '.json');
}

/**
 * Returns the path to the cached meta data file.
 */
export function getMetaCachePath(): string {
  return path.join(app.getPath('userData'), 'meta', 'meta_cache.json');
}

/**
 * Returns the path to the image cache directory for a given set.
 */
export function getImageCachePath(set: string): string {
  return path.join(app.getPath('userData'), 'static', set, 'images');
}

/**
 * Writes data as JSON to the given file path, creating parent directories if needed.
 */
export async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Reads and parses a JSON file. Returns null if the file does not exist (ENOENT).
 * Throws for other errors.
 */
export async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw err;
  }
}

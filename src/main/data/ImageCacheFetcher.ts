import axios from 'axios';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { getImageCachePath } from './DataCache';
import type { Champion, Trait, Item, Augment } from './types';

const CDRAGON_ICON_BASE_URL =
  'https://raw.communitydragon.org/latest/game';

/**
 * Derives the local file path for a given CommunityDragon icon URL.
 *
 * CommunityDragon icon paths look like:
 *   "ASSETS/UX/TFT/ChampionSplashes/TFT13_Ahri.TFT_Set13.tex"
 *
 * The .tex extension is replaced with .png (CDN serves png at the .png path).
 * The local filename is the basename of the icon path.
 */
export function getIconPath(set: string, iconUrl: string): string {
  const basename = path.basename(iconUrl);
  const localFilename = basename.replace(/\.tex$/i, '.png');
  return path.join(getImageCachePath(set), localFilename);
}

/**
 * Builds a CommunityDragon CDN URL from an icon path.
 *
 * CommunityDragon serves assets via a path mirroring the ASSETS/ prefix
 * but lowercased, under the rcp-be-lol-game-data plugin path.
 * The .tex extension is replaced with .png.
 */
function buildCdnUrl(iconPath: string): string {
  const normalized = iconPath.toLowerCase().replace(/\.tex$/i, '.png');
  return `${CDRAGON_ICON_BASE_URL}/${normalized}`;
}

/**
 * Downloads all champion, trait, item, and augment icons from the CommunityDragon CDN.
 *
 * Behavior:
 * - Deduplicates icon paths before downloading
 * - Creates the cache directory if it does not exist
 * - Skips icons already present on disk (lazy caching)
 * - Continues on individual download failures (does not abort)
 * - Logs a summary of results
 *
 * @param set  - e.g. "set13" (determines cache directory)
 * @param data - Validated game entity arrays
 */
export async function downloadIcons(
  set: string,
  data: { champions: Champion[]; traits: Trait[]; items: Item[]; augments: Augment[] }
): Promise<void> {
  // Collect and deduplicate all icon paths
  const allIcons = [
    ...data.champions.map((c) => c.icon),
    ...data.traits.map((t) => t.icon),
    ...data.items.map((i) => i.icon),
    ...data.augments.map((a) => a.icon),
  ];
  const uniqueIcons = [...new Set(allIcons)];

  if (uniqueIcons.length === 0) {
    console.log('[ImageCacheFetcher] No icons to download.');
    return;
  }

  const cacheDir = getImageCachePath(set);
  await fs.mkdir(cacheDir, { recursive: true });

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  // Download in parallel batches of 20 for speed
  const BATCH_SIZE = 20;
  for (let i = 0; i < uniqueIcons.length; i += BATCH_SIZE) {
    const batch = uniqueIcons.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async (iconPath) => {
      const localPath = getIconPath(set, iconPath);

      // Skip if already cached
      try {
        await fs.access(localPath);
        skipped++;
        return;
      } catch {
        // File does not exist — proceed to download
      }

      // Download from CDN
      const cdnUrl = buildCdnUrl(iconPath);
      try {
        const response = await axios.get(cdnUrl, {
          responseType: 'arraybuffer',
          timeout: 10000,
        });
        await fs.writeFile(localPath, response.data as Buffer);
        downloaded++;
      } catch (err) {
        failed++;
      }
    }));
  }

  console.log(
    `[ImageCacheFetcher] Downloaded ${downloaded}/${uniqueIcons.length} icons ` +
      `(${skipped} skipped, ${failed} failed)`
  );
}

import axios from 'axios';
import { getStaticDataPath, writeJsonFile, readJsonFile } from './DataCache';
import { ChampionSchema, TraitSchema, ItemSchema, AugmentSchema } from './types';
import type { Champion, Trait, Item, Augment } from './types';

const CDRAGON_BASE_URL = 'https://raw.communitydragon.org/latest/cdragon/tft';

/**
 * Downloads the CommunityDragon locale JSON and writes it to disk.
 * The JSON file is ~21MB so timeout is set to 30s.
 *
 * @param locale - e.g. "en_us", "pt_BR" (converted to lowercase for URL)
 * @param set    - e.g. "set13" (used for cache directory)
 */
export async function downloadStaticData(locale: string, set: string): Promise<void> {
  const localeLower = locale.toLowerCase();
  const url = `${CDRAGON_BASE_URL}/${localeLower}.json`;

  console.log(`[CommunityDragonFetcher] Downloading static data from ${url}`);

  const response = await axios.get(url, { timeout: 30000 });

  // Log top-level keys for debugging structure changes
  if (response.data && typeof response.data === 'object') {
    console.log('[CommunityDragonFetcher] Top-level keys:', Object.keys(response.data));
  }

  const filePath = getStaticDataPath(set, localeLower);
  await writeJsonFile(filePath, response.data);

  console.log(`[CommunityDragonFetcher] Static data written to ${filePath}`);
}

/**
 * Extracts and validates current set data from the raw CommunityDragon JSON.
 *
 * CommunityDragon structure:
 * {
 *   setData: [{ number: 12, champions: [...], traits: [...] }, { number: 13, ... }],
 *   items: [...],
 *   augments: [...],
 * }
 *
 * The current set is the element in setData with the highest `number` value.
 * Items and augments live at the top level (not per-set).
 *
 * IMPORTANT: This structure was confirmed as LOW confidence in the plan.
 * If the structure differs, adapt accordingly and update this comment.
 */
export function extractCurrentSetData(rawData: unknown): {
  champions: Champion[];
  traits: Trait[];
  items: Item[];
  augments: Augment[];
} {
  const data = rawData as Record<string, unknown>;

  // Find the current set (highest set number in setData array)
  const setDataArray = data.setData as Array<Record<string, unknown>>;
  if (!Array.isArray(setDataArray) || setDataArray.length === 0) {
    console.warn('[CommunityDragonFetcher] setData is missing or empty');
    return { champions: [], traits: [], items: [], augments: [] };
  }

  const currentSet = setDataArray.reduce((best, current) => {
    const bestNum = typeof best.number === 'number' ? best.number : 0;
    const currNum = typeof current.number === 'number' ? current.number : 0;
    return currNum > bestNum ? current : best;
  });

  console.log(`[CommunityDragonFetcher] Using set ${currentSet.number} (${currentSet.name})`);

  // Validate champions
  const rawChampions = Array.isArray(currentSet.champions) ? currentSet.champions : [];
  const champions = validateArray(rawChampions, ChampionSchema, 'champion');

  // Validate traits
  const rawTraits = Array.isArray(currentSet.traits) ? currentSet.traits : [];
  const traits = validateArray(rawTraits, TraitSchema, 'trait');

  // Items and augments share the same top-level `items` array.
  // Augments have apiName containing "Augment" or "Teamup".
  // Real items are everything else (components, completed items, etc.).
  const allRawItems = Array.isArray(data.items) ? data.items : [];

  const rawItems: unknown[] = [];
  const rawAugments: unknown[] = [];
  for (const entry of allRawItems) {
    const apiName = (entry as Record<string, unknown>)?.apiName as string | undefined;
    if (apiName && (apiName.includes('Augment') || apiName.includes('Teamup'))) {
      rawAugments.push(entry);
    } else {
      rawItems.push(entry);
    }
  }

  const items = validateArray(rawItems, ItemSchema, 'item');
  const augments = validateArray(rawAugments, AugmentSchema, 'augment');

  console.log(
    `[CommunityDragonFetcher] Extracted: ${champions.length} champions, ${traits.length} traits, ${items.length} items, ${augments.length} augments`
  );

  return { champions, traits, items, augments };
}

/**
 * Reads static data from the disk cache.
 * Returns null if the file does not exist.
 */
export async function loadStaticData(set: string, locale: string): Promise<object | null> {
  const filePath = getStaticDataPath(set, locale);
  return readJsonFile<object>(filePath);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function validateArray<T>(
  rawItems: unknown[],
  schema: { safeParse(data: unknown): { success: boolean; data?: T; error?: unknown } },
  typeName: string
): T[] {
  const results: T[] = [];

  for (const item of rawItems) {
    const parsed = schema.safeParse(item);
    if (parsed.success && parsed.data !== undefined) {
      results.push(parsed.data);
    } else {
      const identifier =
        (item as Record<string, unknown>)?.apiName ??
        (item as Record<string, unknown>)?.name ??
        (item as Record<string, unknown>)?.id ??
        'unknown';
      console.warn(
        `[CommunityDragonFetcher] Invalid ${typeName} (skipping): ${identifier}`
      );
    }
  }

  return results;
}

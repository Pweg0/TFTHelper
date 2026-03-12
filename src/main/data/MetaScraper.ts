import axios from 'axios';
import * as cheerio from 'cheerio';
import { MetaCompSchema } from './types';
import type { MetaComp } from './types';
import { getMetaCachePath, writeJsonFile, readJsonFile } from './DataCache';

const TACTICS_TOOLS_URL = 'https://tactics.tools/team-compositions';
const SCRAPE_TIMEOUT_MS = 15_000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface MetaCacheFile {
  comps: MetaComp[];
  scrapedAt: number;
}

/**
 * A minimal interface for the electron-store-like Store object used by refreshMetaIfStale.
 * The store must support .get(key) and .set(key, value) for:
 *   - metaScrapedPatch: string
 *   - metaScrapedAt: number
 */
export interface Store {
  get(key: 'metaScrapedPatch'): string;
  get(key: 'metaScrapedAt'): number;
  set(key: string, value: unknown): void;
}

/**
 * Scrapes team composition data from tactics.tools using cheerio to parse the __NEXT_DATA__
 * JSON embedded in the page HTML.
 *
 * Returns an array of validated MetaComp objects, or null on any error.
 * Never throws.
 */
export async function scrapeMetaComps(): Promise<MetaComp[] | null> {
  try {
    const response = await axios.get<string>(TACTICS_TOOLS_URL, {
      timeout: SCRAPE_TIMEOUT_MS,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    const $ = cheerio.load(response.data);
    const nextDataEl = $('#__NEXT_DATA__');

    if (nextDataEl.length === 0) {
      console.error('[MetaScraper] __NEXT_DATA__ script tag not found in page HTML');
      return null;
    }

    const rawJson = nextDataEl.html();
    if (!rawJson) {
      console.error('[MetaScraper] __NEXT_DATA__ element is empty');
      return null;
    }

    const nextData = JSON.parse(rawJson) as {
      props?: { pageProps?: Record<string, unknown> };
    };

    const pageProps = nextData?.props?.pageProps;
    if (!pageProps) {
      console.error('[MetaScraper] pageProps not found in __NEXT_DATA__');
      return null;
    }

    // Log all pageProps keys at debug level for data discovery
    console.debug('[MetaScraper] pageProps keys:', Object.keys(pageProps));

    // Extract compositions — path is pageProps.compositions
    // Adapt if tactics.tools changes their data structure
    const rawComps = pageProps.compositions as unknown[];
    if (!Array.isArray(rawComps)) {
      console.error('[MetaScraper] compositions not found or not an array in pageProps');
      return null;
    }

    // Validate each comp with MetaCompSchema, filter failures
    const comps: MetaComp[] = [];
    for (const raw of rawComps) {
      const parsed = MetaCompSchema.safeParse(raw);
      if (parsed.success) {
        comps.push(parsed.data);
      } else {
        console.warn('[MetaScraper] Invalid comp filtered out:', parsed.error.issues[0]?.message);
      }
    }

    return comps;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[MetaScraper] scrapeMetaComps error:', msg);
    return null;
  }
}

/**
 * Returns meta comps from cache if fresh, otherwise scrapes and updates cache.
 *
 * Cache is considered fresh when:
 *   - store.metaScrapedPatch === currentPatch AND
 *   - cache is less than 24 hours old
 *
 * Falls back to stale cache if scrape fails.
 * Returns null only when scrape fails AND no cache exists at all.
 */
export async function refreshMetaIfStale(
  store: Store,
  currentPatch: string,
): Promise<MetaComp[] | null> {
  const cachedPatch = store.get('metaScrapedPatch');
  const cachedAt = store.get('metaScrapedAt');
  const isFresh =
    cachedPatch === currentPatch &&
    typeof cachedAt === 'number' &&
    Date.now() - cachedAt < CACHE_TTL_MS;

  if (isFresh) {
    const cacheFile = await readJsonFile<MetaCacheFile>(getMetaCachePath());
    if (cacheFile?.comps) {
      return cacheFile.comps;
    }
  }

  // Need to scrape
  const comps = await scrapeMetaComps();

  if (comps !== null) {
    const now = Date.now();
    await writeJsonFile(getMetaCachePath(), { comps, scrapedAt: now });
    store.set('metaScrapedPatch', currentPatch);
    store.set('metaScrapedAt', now);
    return comps;
  }

  // Scrape failed — try stale cache as fallback
  console.warn('[MetaScraper] Meta data unavailable — using cached data');
  const staleCache = await readJsonFile<MetaCacheFile>(getMetaCachePath());
  if (staleCache?.comps) {
    return staleCache.comps;
  }

  return null;
}

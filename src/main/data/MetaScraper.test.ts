import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

// Mock axios before importing MetaScraper
vi.mock('axios');
vi.mock('./DataCache');
vi.mock('electron', () => ({
  app: { getPath: () => '/fake/userData' },
}));

import axios from 'axios';
import * as DataCache from './DataCache';
import { scrapeMetaComps, refreshMetaIfStale } from './MetaScraper';

const mockAxiosGet = vi.mocked(axios.get);
const mockReadJsonFile = vi.mocked(DataCache.readJsonFile);
const mockWriteJsonFile = vi.mocked(DataCache.writeJsonFile);
const mockGetMetaCachePath = vi.mocked(DataCache.getMetaCachePath);

// Load the fixture HTML synchronously for tests
const fixturePath = path.resolve(__dirname, '__fixtures__/tactics_tools_sample.html');

async function loadFixture(): Promise<string> {
  return fs.readFile(fixturePath, 'utf-8');
}

describe('scrapeMetaComps', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMetaCachePath.mockReturnValue('/fake/userData/meta/meta_cache.json');
  });

  it('extracts valid comps from fixture HTML', async () => {
    const html = await loadFixture();
    mockAxiosGet.mockResolvedValue({ data: html });

    const result = await scrapeMetaComps();

    expect(result).not.toBeNull();
    expect(result!.length).toBe(2); // Invalid comp filtered out
    expect(result![0].name).toBe('Mage Ahri');
    expect(result![1].name).toBe('Gunner Jinx');
  });

  it('extracts itemPriorities from fixture HTML', async () => {
    const html = await loadFixture();
    mockAxiosGet.mockResolvedValue({ data: html });

    const result = await scrapeMetaComps();

    expect(result).not.toBeNull();
    expect(result![0].itemPriorities).toEqual(['Jeweled Gauntlet', 'Hextech Gunblade', 'Archangels Staff']);
    expect(result![1].itemPriorities).toEqual(['Infinity Edge', 'Last Whisper', 'Giant Slayer']);
  });

  it('extracts positioning from fixture HTML when present', async () => {
    const html = await loadFixture();
    mockAxiosGet.mockResolvedValue({ data: html });

    const result = await scrapeMetaComps();

    expect(result).not.toBeNull();
    expect(result![0].positioning).toEqual({
      TFT_Ahri: { row: 3, col: 2 },
      TFT_Lux: { row: 3, col: 4 },
    });
    // Comp B has no positioning — should be undefined or absent
    expect(result![1].positioning).toBeUndefined();
  });

  it('filters out invalid comps (units is not array)', async () => {
    const html = await loadFixture();
    mockAxiosGet.mockResolvedValue({ data: html });

    const result = await scrapeMetaComps();

    expect(result).not.toBeNull();
    const names = result!.map(c => c.name);
    expect(names).not.toContain('Invalid Comp');
  });

  it('returns null when __NEXT_DATA__ script tag is missing', async () => {
    const html = '<html><body><p>No data here</p></body></html>';
    mockAxiosGet.mockResolvedValue({ data: html });

    const result = await scrapeMetaComps();

    expect(result).toBeNull();
  });

  it('returns null on network error (does not throw)', async () => {
    mockAxiosGet.mockRejectedValue(new Error('Network error'));

    const result = await scrapeMetaComps();

    expect(result).toBeNull();
  });

  it('returns null on ECONNREFUSED without throwing', async () => {
    const err = new Error('connect ECONNREFUSED');
    mockAxiosGet.mockRejectedValue(err);

    await expect(scrapeMetaComps()).resolves.toBeNull();
  });

  it('validates comps with MetaCompSchema and returns well-shaped objects', async () => {
    const html = await loadFixture();
    mockAxiosGet.mockResolvedValue({ data: html });

    const result = await scrapeMetaComps();

    expect(result).not.toBeNull();
    for (const comp of result!) {
      expect(comp).toMatchObject({
        name: expect.any(String),
        units: expect.any(Array),
        traits: expect.any(Array),
        avgPlace: expect.any(Number),
        top4Rate: expect.any(Number),
        winRate: expect.any(Number),
        playRate: expect.any(Number),
      });
    }
  });
});

describe('refreshMetaIfStale', () => {
  const NOW = Date.now();
  const TWENTY_THREE_HOURS_AGO = NOW - 23 * 60 * 60 * 1000;
  const TWENTY_FIVE_HOURS_AGO = NOW - 25 * 60 * 60 * 1000;

  // Minimal store mock
  const makeStore = (patch: string, scrapedAt: number) => ({
    get: (key: string) => {
      if (key === 'metaScrapedPatch') return patch;
      if (key === 'metaScrapedAt') return scrapedAt;
      return undefined;
    },
    set: vi.fn(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMetaCachePath.mockReturnValue('/fake/userData/meta/meta_cache.json');
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns cached data when patch matches and cache is fresh (< 24h)', async () => {
    const store = makeStore('14.5', TWENTY_THREE_HOURS_AGO);
    const cachedComps = [{ name: 'Cached Comp', units: [], traits: [], avgPlace: 3, top4Rate: 0.5, winRate: 0.1, playRate: 0.05 }];
    mockReadJsonFile.mockResolvedValue({ comps: cachedComps, scrapedAt: TWENTY_THREE_HOURS_AGO });

    const result = await refreshMetaIfStale(store as any, '14.5');

    expect(result).toEqual(cachedComps);
    expect(mockAxiosGet).not.toHaveBeenCalled();
  });

  it('scrapes and writes cache when no cache exists (metaScrapedPatch empty)', async () => {
    const store = makeStore('', 0);
    const html = await loadFixture();
    mockAxiosGet.mockResolvedValue({ data: html });
    mockWriteJsonFile.mockResolvedValue(undefined);

    const result = await refreshMetaIfStale(store as any, '14.5');

    expect(result).not.toBeNull();
    expect(result!.length).toBeGreaterThan(0);
    expect(mockWriteJsonFile).toHaveBeenCalledWith(
      '/fake/userData/meta/meta_cache.json',
      expect.objectContaining({ comps: expect.any(Array) })
    );
    expect(store.set).toHaveBeenCalledWith('metaScrapedPatch', '14.5');
    expect(store.set).toHaveBeenCalledWith('metaScrapedAt', expect.any(Number));
  });

  it('scrapes and writes cache when cached patch differs from current patch', async () => {
    const store = makeStore('14.4', TWENTY_THREE_HOURS_AGO);
    const html = await loadFixture();
    mockAxiosGet.mockResolvedValue({ data: html });
    mockWriteJsonFile.mockResolvedValue(undefined);

    const result = await refreshMetaIfStale(store as any, '14.5');

    expect(result).not.toBeNull();
    expect(mockAxiosGet).toHaveBeenCalled();
    expect(store.set).toHaveBeenCalledWith('metaScrapedPatch', '14.5');
  });

  it('scrapes when cache is stale (same patch but older than 24h)', async () => {
    const store = makeStore('14.5', TWENTY_FIVE_HOURS_AGO);
    const html = await loadFixture();
    mockAxiosGet.mockResolvedValue({ data: html });
    mockWriteJsonFile.mockResolvedValue(undefined);

    const result = await refreshMetaIfStale(store as any, '14.5');

    expect(result).not.toBeNull();
    expect(mockAxiosGet).toHaveBeenCalled();
  });

  it('falls back to stale cache when scrape fails', async () => {
    const store = makeStore('14.4', TWENTY_FIVE_HOURS_AGO);
    mockAxiosGet.mockRejectedValue(new Error('Network error'));
    const staleComps = [{ name: 'Stale Comp', units: [], traits: [], avgPlace: 4, top4Rate: 0.4, winRate: 0.08, playRate: 0.04 }];
    mockReadJsonFile.mockResolvedValue({ comps: staleComps, scrapedAt: TWENTY_FIVE_HOURS_AGO });

    const result = await refreshMetaIfStale(store as any, '14.5');

    expect(result).toEqual(staleComps);
  });

  it('returns null when scrape fails and no cache exists', async () => {
    const store = makeStore('', 0);
    mockAxiosGet.mockRejectedValue(new Error('Network error'));
    mockReadJsonFile.mockResolvedValue(null);

    const result = await refreshMetaIfStale(store as any, '14.5');

    expect(result).toBeNull();
  });
});

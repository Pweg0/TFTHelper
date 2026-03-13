import { describe, it, expect, vi, beforeEach } from 'vitest';
import pixelmatch from 'pixelmatch';
import type { ChampionMatcher } from './ChampionMatcher';

// ---------------------------------------------------------------------------
// Mocks — must be declared before the module is imported
// ---------------------------------------------------------------------------

const mockRecognize = vi.hoisted(() => vi.fn());
const mockCropRegion = vi.hoisted(() => vi.fn());
const mockJimpFromBuffer = vi.hoisted(() => vi.fn());
const mockReadFile = vi.hoisted(() => vi.fn());

vi.mock('tesseract.js', () => ({
  PSM: { SINGLE_LINE: '7' },
}));

vi.mock('./RegionCropper', () => ({
  cropRegion: mockCropRegion,
}));

vi.mock('jimp', () => ({
  Jimp: {
    fromBuffer: mockJimpFromBuffer,
  },
}));

vi.mock('pixelmatch', () => ({
  default: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  readFile: mockReadFile,
}));

// Import after mocks are registered
const { BoardOCR } = await import('./BoardOCR');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a 24x24 RGBA buffer filled with a single color */
function makeRGBABuffer(r: number, g: number, b: number, a = 255): Buffer {
  const buf = Buffer.alloc(24 * 24 * 4);
  for (let i = 0; i < 24 * 24; i++) {
    buf[i * 4] = r;
    buf[i * 4 + 1] = g;
    buf[i * 4 + 2] = b;
    buf[i * 4 + 3] = a;
  }
  return buf;
}

/** A minimal mock Tesseract worker */
function makeWorker() {
  return { recognize: mockRecognize };
}

/** A minimal mock ChampionMatcher */
function makeMatcher(result: { apiName: string; cost: number } | null = null): ChampionMatcher {
  return { match: vi.fn().mockReturnValue(result) } as unknown as ChampionMatcher;
}

/** A fake 1920x1080 PNG buffer (just needs to be a Buffer, Jimp is mocked) */
const FAKE_PNG = Buffer.from('fake-png-data');

// ---------------------------------------------------------------------------
// Mock Jimp image that returns RGBA bitmap data
// ---------------------------------------------------------------------------

function makeJimpImage(rgbaBuffer: Buffer): object {
  const self = {
    crop: vi.fn().mockReturnThis(),
    resize: vi.fn().mockReturnThis(),
    getPixelColor: vi.fn().mockReturnValue(0),
    bitmap: { data: rgbaBuffer, width: 24, height: 24 },
  };
  // crop() returns itself, so bitmap is accessible after crop
  (self.crop as ReturnType<typeof vi.fn>).mockReturnValue(self);
  return self;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BoardOCR', () => {
  let boardOCR: InstanceType<typeof BoardOCR>;
  const redBuffer = makeRGBABuffer(255, 0, 0);

  beforeEach(() => {
    vi.clearAllMocks();

    // Default: cropRegion returns a small buffer (mocked, content doesn't matter)
    mockCropRegion.mockResolvedValue(Buffer.alloc(10));

    // Default: Jimp.fromBuffer returns a mock image with a red RGBA buffer
    mockJimpFromBuffer.mockResolvedValue(makeJimpImage(redBuffer));

    // Default: readFile (fs/promises) returns a fake buffer
    mockReadFile.mockResolvedValue(Buffer.alloc(100));

    boardOCR = new BoardOCR(makeWorker() as never);
  });

  // -----------------------------------------------------------------------
  // loadItemIconCache
  // -----------------------------------------------------------------------

  describe('loadItemIconCache()', () => {
    it('loads item icon paths into the cache', async () => {
      // Jimp returns a mock image; we verify it was called for each item
      const itemIconPaths = new Map([
        ['TFT_Item_BFSword', '/path/to/bfsword.png'],
        ['TFT_Item_ChainVest', '/path/to/chainvest.png'],
      ]);

      await boardOCR.loadItemIconCache(itemIconPaths);

      // Jimp.fromBuffer should have been called for each item path
      expect(mockJimpFromBuffer).toHaveBeenCalledTimes(2);
    });
  });

  // -----------------------------------------------------------------------
  // readItems
  // -----------------------------------------------------------------------

  describe('readItems()', () => {
    it('returns empty array when no items match below threshold', async () => {
      // pixelmatch returns high mismatch count (above threshold)
      vi.mocked(pixelmatch).mockReturnValue(200);

      // Load a single item into cache
      const itemIconPaths = new Map([['TFT_Item_BFSword', '/path/to/bfsword.png']]);
      await boardOCR.loadItemIconCache(itemIconPaths);

      const result = await boardOCR.readItems(FAKE_PNG, { x: 100, y: 100 }, 1920, 1080);
      expect(result).toEqual([]);
    });

    it('returns matched item apiNames when pixelmatch is below threshold', async () => {
      // pixelmatch returns low mismatch count (below threshold — good match)
      vi.mocked(pixelmatch).mockReturnValue(10);

      const itemIconPaths = new Map([['TFT_Item_BFSword', '/path/to/bfsword.png']]);
      await boardOCR.loadItemIconCache(itemIconPaths);

      const result = await boardOCR.readItems(FAKE_PNG, { x: 100, y: 100 }, 1920, 1080);
      // Up to 3 item slots, all matching the same item
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0]).toBe('TFT_Item_BFSword');
    });

    it('returns up to 3 items', async () => {
      // pixelmatch returns low mismatch count for all slots
      vi.mocked(pixelmatch).mockReturnValue(5);

      const itemIconPaths = new Map([
        ['TFT_Item_BFSword', '/path/to/bfsword.png'],
        ['TFT_Item_ChainVest', '/path/to/chainvest.png'],
      ]);
      await boardOCR.loadItemIconCache(itemIconPaths);

      const result = await boardOCR.readItems(FAKE_PNG, { x: 100, y: 100 }, 1920, 1080);
      expect(result.length).toBeLessThanOrEqual(3);
    });

    it('returns empty array when item cache is empty', async () => {
      const result = await boardOCR.readItems(FAKE_PNG, { x: 100, y: 100 }, 1920, 1080);
      expect(result).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // readBench
  // -----------------------------------------------------------------------

  describe('readBench()', () => {
    it('processes exactly 9 bench slots', async () => {
      // All slots return garbage text → filtered out (empty array)
      mockRecognize.mockResolvedValue({ data: { text: 'xyzgarbage', confidence: 0 } });
      const matcher = makeMatcher(null);

      const result = await boardOCR.readBench(FAKE_PNG, 1920, 1080, matcher);

      // recognize should have been called 9 times (one per slot)
      expect(mockRecognize).toHaveBeenCalledTimes(9);
      // All slots empty → result is empty array
      expect(result).toEqual([]);
    });

    it('returns OCRChampion[] for recognized slots', async () => {
      // All slots return high-confidence text
      mockRecognize.mockResolvedValue({ data: { text: 'Ahri', confidence: 85 } });
      // pixelmatch returns no matches for items
      vi.mocked(pixelmatch).mockReturnValue(200);

      const matcher = makeMatcher({ apiName: 'TFT13_Ahri', cost: 3 });

      const result = await boardOCR.readBench(FAKE_PNG, 1920, 1080, matcher);

      expect(result).toHaveLength(9);
      for (const champ of result) {
        expect(champ.apiName).toBe('TFT13_Ahri');
        expect(champ.starLevel).toBe(1);
        expect(champ.itemApiNames).toEqual([]);
      }
    });

    it('filters out unrecognized slots (matcher returns null, low confidence)', async () => {
      mockRecognize.mockResolvedValue({ data: { text: '', confidence: 0 } });
      const matcher = makeMatcher(null);

      const result = await boardOCR.readBench(FAKE_PNG, 1920, 1080, matcher);
      expect(result).toEqual([]);
    });

    it('includes item apiNames from readItems when champion is recognized', async () => {
      mockRecognize.mockResolvedValue({ data: { text: 'Ahri', confidence: 85 } });
      // pixelmatch returns low mismatch for item detection
      vi.mocked(pixelmatch).mockReturnValue(10);

      const itemIconPaths = new Map([['TFT_Item_BFSword', '/path/to/bfsword.png']]);
      await boardOCR.loadItemIconCache(itemIconPaths);

      const matcher = makeMatcher({ apiName: 'TFT13_Ahri', cost: 3 });

      const result = await boardOCR.readBench(FAKE_PNG, 1920, 1080, matcher);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].itemApiNames.length).toBeGreaterThan(0);
    });
  });

  // -----------------------------------------------------------------------
  // readBoard
  // -----------------------------------------------------------------------

  describe('readBoard()', () => {
    it('processes exactly 28 board slots', async () => {
      // All slots return low-confidence garbage → filtered out
      mockRecognize.mockResolvedValue({ data: { text: 'xyzgarbage', confidence: 0 } });
      const matcher = makeMatcher(null);

      await boardOCR.readBoard(FAKE_PNG, 1920, 1080, matcher);

      expect(mockRecognize).toHaveBeenCalledTimes(28);
    });

    it('returns empty array when all board slots are empty', async () => {
      mockRecognize.mockResolvedValue({ data: { text: '', confidence: 0 } });
      const matcher = makeMatcher(null);

      const result = await boardOCR.readBoard(FAKE_PNG, 1920, 1080, matcher);
      expect(result).toEqual([]);
    });

    it('returns recognized champions from board slots', async () => {
      mockRecognize.mockResolvedValue({ data: { text: 'Jinx', confidence: 90 } });
      vi.mocked(pixelmatch).mockReturnValue(200);

      const matcher = makeMatcher({ apiName: 'TFT13_Jinx', cost: 1 });

      const result = await boardOCR.readBoard(FAKE_PNG, 1920, 1080, matcher);

      expect(result.length).toBe(28);
      for (const champ of result) {
        expect(champ.apiName).toBe('TFT13_Jinx');
        expect(champ.starLevel).toBe(1);
      }
    });
  });
});

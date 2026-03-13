import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Champion } from '../data/types';
import { ChampionMatcher } from './ChampionMatcher';

// ---------------------------------------------------------------------------
// Mock tesseract.js before importing ShopOCR (hoisted by Vitest)
// ---------------------------------------------------------------------------

const mockRecognize = vi.hoisted(() => vi.fn());
const mockSetParameters = vi.hoisted(() => vi.fn());
const mockTerminate = vi.hoisted(() => vi.fn());
const mockCreateWorker = vi.hoisted(() => vi.fn());

vi.mock('tesseract.js', () => ({
  createWorker: mockCreateWorker,
  PSM: {
    SINGLE_LINE: '7',
  },
}));

// Import after mock is registered
const { ShopOCR } = await import('./ShopOCR');

// ---------------------------------------------------------------------------
// Fixture data
// ---------------------------------------------------------------------------

const FIXTURE_CHAMPIONS: Champion[] = [
  { apiName: 'TFT13_Ahri', name: 'Ahri', cost: 3, traits: [], icon: '' },
  { apiName: 'TFT13_Jinx', name: 'Jinx', cost: 1, traits: [], icon: '' },
  { apiName: 'TFT13_Wukong', name: 'Wukong', cost: 4, traits: [], icon: '' },
  { apiName: 'TFT13_TwistedFate', name: 'Twisted Fate', cost: 2, traits: [], icon: '' },
  { apiName: 'TFT13_Jayce', name: 'Jayce', cost: 5, traits: [], icon: '' },
];

const MOCK_WORKER = {
  recognize: mockRecognize,
  setParameters: mockSetParameters,
  terminate: mockTerminate,
};

describe('ShopOCR', () => {
  let shopOCR: InstanceType<typeof ShopOCR>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateWorker.mockResolvedValue(MOCK_WORKER);
    mockSetParameters.mockResolvedValue(undefined);
    mockTerminate.mockResolvedValue(undefined);
    shopOCR = new ShopOCR();
  });

  afterEach(async () => {
    // Clean up if initialized
    try {
      await shopOCR.terminate();
    } catch {
      // ignore — may not have been initialized
    }
  });

  describe('initialize()', () => {
    it('creates a Tesseract worker with eng language', async () => {
      mockRecognize.mockResolvedValue({ data: { text: '', confidence: 0 } });
      await shopOCR.initialize();
      // We only care that createWorker was called and the first argument is 'eng'
      expect(mockCreateWorker).toHaveBeenCalled();
      expect(mockCreateWorker.mock.calls[0][0]).toBe('eng');
    });

    it('sets single-line PSM and letter+space whitelist parameters', async () => {
      mockRecognize.mockResolvedValue({ data: { text: '', confidence: 0 } });
      await shopOCR.initialize();
      expect(mockSetParameters).toHaveBeenCalledWith(
        expect.objectContaining({
          tessedit_char_whitelist: expect.stringContaining('A'),
          tessedit_pageseg_mode: expect.any(String),
        })
      );
    });

    it('runs a warmup recognize call after init', async () => {
      mockRecognize.mockResolvedValue({ data: { text: '', confidence: 0 } });
      await shopOCR.initialize();
      // At least one call from the warmup
      expect(mockRecognize).toHaveBeenCalled();
    });
  });

  describe('readShop()', () => {
    beforeEach(async () => {
      // Default: warmup + 5 slot reads all return high-confidence Ahri
      mockRecognize.mockResolvedValue({
        data: { text: 'Ahri', confidence: 85 },
      });
      await shopOCR.initialize();
    });

    it('returns exactly 5 ShopSlots', async () => {
      // Create a minimal valid PNG buffer (1x1 black pixel)
      const { Jimp } = await import('jimp');
      const img = new Jimp({ width: 1920, height: 1080, color: 0x000000ff });
      const pngBuffer = await img.getBuffer('image/png') as Buffer;

      const matcher = new ChampionMatcher(FIXTURE_CHAMPIONS);
      const slots = await shopOCR.readShop(pngBuffer, 1920, 1080, matcher);

      expect(slots).toHaveLength(5);
    });

    it('calls recognize once per shop slot (5 times, plus warmup)', async () => {
      const { Jimp } = await import('jimp');
      const img = new Jimp({ width: 1920, height: 1080, color: 0x000000ff });
      const pngBuffer = await img.getBuffer('image/png') as Buffer;

      const matcher = new ChampionMatcher(FIXTURE_CHAMPIONS);
      await shopOCR.readShop(pngBuffer, 1920, 1080, matcher);

      // warmup (1) + 5 slots = 6 total recognize calls
      expect(mockRecognize).toHaveBeenCalledTimes(6);
    });

    it('resolves champion names via fuzzy matching', async () => {
      // All slots return "Ahri" with high confidence
      const { Jimp } = await import('jimp');
      const img = new Jimp({ width: 1920, height: 1080, color: 0x000000ff });
      const pngBuffer = await img.getBuffer('image/png') as Buffer;

      const matcher = new ChampionMatcher(FIXTURE_CHAMPIONS);
      const slots = await shopOCR.readShop(pngBuffer, 1920, 1080, matcher);

      for (const slot of slots) {
        expect(slot.apiName).toBe('TFT13_Ahri');
        expect(slot.cost).toBe(3);
        expect(slot.owned).toBe(false);
      }
    });

    it('sets apiName to null when confidence is below 60', async () => {
      // Override: return low-confidence result for all slots
      mockRecognize
        .mockResolvedValueOnce({ data: { text: '', confidence: 0 } }) // warmup
        .mockResolvedValue({ data: { text: 'Ahri', confidence: 40 } }); // slots

      const { Jimp } = await import('jimp');
      const img = new Jimp({ width: 1920, height: 1080, color: 0x000000ff });
      const pngBuffer = await img.getBuffer('image/png') as Buffer;

      const matcher = new ChampionMatcher(FIXTURE_CHAMPIONS);
      const slots = await shopOCR.readShop(pngBuffer, 1920, 1080, matcher);

      for (const slot of slots) {
        expect(slot.apiName).toBeNull();
      }
    });

    it('sets apiName to null when text does not fuzzy-match any champion', async () => {
      mockRecognize
        .mockResolvedValueOnce({ data: { text: '', confidence: 0 } }) // warmup
        .mockResolvedValue({ data: { text: 'xyzgarbage', confidence: 90 } }); // slots

      const { Jimp } = await import('jimp');
      const img = new Jimp({ width: 1920, height: 1080, color: 0x000000ff });
      const pngBuffer = await img.getBuffer('image/png') as Buffer;

      const matcher = new ChampionMatcher(FIXTURE_CHAMPIONS);
      const slots = await shopOCR.readShop(pngBuffer, 1920, 1080, matcher);

      for (const slot of slots) {
        expect(slot.apiName).toBeNull();
      }
    });

    it('sets owned to false (will be updated later during integration)', async () => {
      const { Jimp } = await import('jimp');
      const img = new Jimp({ width: 1920, height: 1080, color: 0x000000ff });
      const pngBuffer = await img.getBuffer('image/png') as Buffer;

      const matcher = new ChampionMatcher(FIXTURE_CHAMPIONS);
      const slots = await shopOCR.readShop(pngBuffer, 1920, 1080, matcher);

      for (const slot of slots) {
        expect(slot.owned).toBe(false);
      }
    });
  });

  describe('terminate()', () => {
    it('calls worker.terminate()', async () => {
      mockRecognize.mockResolvedValue({ data: { text: '', confidence: 0 } });
      await shopOCR.initialize();
      await shopOCR.terminate();
      expect(mockTerminate).toHaveBeenCalled();
    });
  });
});

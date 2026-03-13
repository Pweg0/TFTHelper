import { createWorker, PSM } from 'tesseract.js';
import type { Worker } from 'tesseract.js';
import { ScreenCapturer } from './ScreenCapturer';
import { ShopOCR } from './ShopOCR';
import { BoardOCR } from './BoardOCR';
import { ChampionMatcher } from './ChampionMatcher';
import { isShopVisible } from './ShopVisibilityDetector';
import type { OCRResult, ShopSlot } from './types';
import type { Champion, Item } from '../data/types';

/** TFT window title used for screen capture */
const TFT_WINDOW_TITLE = 'League of Legends (TM) Client';

/** How long to keep a stale OCR result before declaring offline (ms) */
const STALE_TTL_MS = 10_000;

/** Offline OCR result returned when capture is null and stale window has expired */
const OFFLINE_RESULT: OCRResult = {
  board: [],
  bench: [],
  shop: [],
  shopVisible: false,
  ocrStatus: 'offline',
};

/**
 * Single-tick OCR orchestrator that owns all OCR modules.
 *
 * Responsibility:
 * 1. Capture a screenshot of the TFT window
 * 2. Check shop visibility
 * 3. Run ShopOCR if shop is visible
 * 4. Run BoardOCR for bench and board champion detection (with items)
 * 5. Compute `owned` flag on shop slots based on board/bench champion presence
 * 6. Apply stale data policy: keep last valid result for 10 seconds, then clear
 *
 * Usage:
 *   const pipeline = new OCRPipeline();
 *   await pipeline.initialize(champions, items);
 *   const result = await pipeline.tick();
 *   await pipeline.terminate();
 */
export class OCRPipeline {
  private capturer: ScreenCapturer = new ScreenCapturer();
  private shopOCR: ShopOCR = new ShopOCR();
  private boardOCR: BoardOCR | null = null;
  private matcher: ChampionMatcher | null = null;
  private worker: Worker | null = null;

  /** Last valid OCR result (for stale data policy) */
  private lastValidResult: OCRResult | null = null;
  /** Epoch ms of the last valid result */
  private lastValidAt: number = 0;

  /**
   * Initializes all OCR modules.
   *
   * - Creates a single shared Tesseract.js worker (used by both ShopOCR and BoardOCR)
   * - Builds a ChampionMatcher from the champion list
   * - Loads item icon cache into BoardOCR from the item icon file paths (Phase 1 cached PNGs)
   *
   * @param champions - All champions available in the current patch
   * @param items - All items (with `.icon` = local cached PNG path)
   */
  async initialize(champions: Champion[], items: Item[]): Promise<void> {
    // Create a single shared Tesseract.js worker for all OCR modules
    this.worker = await createWorker('eng', undefined, {
      logger: () => {},
    });

    await this.worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_LINE,
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ',
    });

    // Warmup: force WASM model load before first real scan
    await this.worker.recognize(Buffer.alloc(0));

    // Share the worker with ShopOCR (inject after initialization since ShopOCR
    // normally creates its own; here we override its internal state)
    // Instead of the normal ShopOCR.initialize(), we share our worker:
    this.shopOCR = new ShopOCR(this.worker);

    this.boardOCR = new BoardOCR(this.worker);

    this.matcher = new ChampionMatcher(champions);

    // Load item icon cache: Map<apiName, iconFilePath>
    const iconPaths = new Map<string, string>();
    for (const item of items) {
      if (item.icon) {
        iconPaths.set(item.apiName, item.icon);
      }
    }
    await this.boardOCR.loadItemIconCache(iconPaths);
  }

  /**
   * Executes one OCR scan cycle.
   *
   * Returns an OCRResult with ocrStatus:
   * - 'active'  — fresh data from this tick
   * - 'stale'   — capture failed but last valid result is < 10s old
   * - 'offline' — capture failed and stale window has expired
   */
  async tick(): Promise<OCRResult> {
    if (!this.matcher || !this.boardOCR) {
      return OFFLINE_RESULT;
    }

    // Capture screenshot
    const captured = await this.capturer.capture(TFT_WINDOW_TITLE);

    if (!captured) {
      return this.staleFallback();
    }

    const { png, width, height } = captured;

    // Check shop visibility (gates shop OCR)
    const shopVisible = await isShopVisible(png, width, height);

    // Run shop OCR if shop is open
    let shop: ShopSlot[] = [];
    if (shopVisible) {
      shop = await this.shopOCR.readShop(png, width, height, this.matcher);
    }

    // Always run board/bench OCR
    const [bench, board] = await Promise.all([
      this.boardOCR.readBench(png, width, height, this.matcher),
      this.boardOCR.readBoard(png, width, height, this.matcher),
    ]);

    // Compute owned flag: shop slot is owned if that champion is on board or bench
    const ownedApiNames = new Set<string>();
    for (const champ of [...board, ...bench]) {
      if (champ.apiName !== null) {
        ownedApiNames.add(champ.apiName);
      }
    }

    const shopWithOwned = shop.map((slot) => ({
      ...slot,
      owned: slot.apiName !== null && ownedApiNames.has(slot.apiName),
    }));

    const result: OCRResult = {
      board,
      bench,
      shop: shopWithOwned,
      shopVisible,
      ocrStatus: 'active',
    };

    // Update stale data tracking
    this.lastValidResult = result;
    this.lastValidAt = Date.now();

    return result;
  }

  /**
   * Terminates the shared Tesseract.js worker and releases WASM resources.
   */
  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
    this.boardOCR = null;
    this.matcher = null;
    this.lastValidResult = null;
    this.lastValidAt = 0;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Returns stale or offline result based on how long ago the last valid
   * OCR result was recorded.
   */
  private staleFallback(): OCRResult {
    if (this.lastValidResult && Date.now() - this.lastValidAt < STALE_TTL_MS) {
      return { ...this.lastValidResult, ocrStatus: 'stale' };
    }
    return OFFLINE_RESULT;
  }
}

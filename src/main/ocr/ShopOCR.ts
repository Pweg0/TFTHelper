import { createWorker, PSM } from 'tesseract.js';
import type { Worker } from 'tesseract.js';
import { SHOP_SLOT_CENTERS, SHOP_NAME_BAND_HALF_W, SHOP_NAME_BAND_HALF_H, SHOP_NAME_BAND_Y_OFFSET } from './OCRCoordinates';
import { cropRegion } from './RegionCropper';
import type { ChampionMatcher } from './ChampionMatcher';
import type { ShopSlot } from './types';

/** Minimum Tesseract confidence score (0-100) to use the OCR result */
const CONFIDENCE_THRESHOLD = 60;

/**
 * Reads the 5-slot TFT shop using Tesseract.js OCR.
 *
 * Usage (standalone):
 *   const ocr = new ShopOCR();
 *   await ocr.initialize();
 *   const slots = await ocr.readShop(pngBuffer, width, height, matcher);
 *   await ocr.terminate();
 *
 * Usage (shared worker — OCRPipeline):
 *   const ocr = new ShopOCR(sharedWorker);  // skip initialize()
 *   const slots = await ocr.readShop(pngBuffer, width, height, matcher);
 *   // terminate() is a no-op; the shared worker is managed by OCRPipeline
 */
export class ShopOCR {
  private worker: Worker | null = null;
  /** When true, terminate() is a no-op (worker lifetime is managed externally) */
  private readonly workerIsShared: boolean;

  constructor(sharedWorker?: Worker) {
    if (sharedWorker !== undefined) {
      this.worker = sharedWorker;
      this.workerIsShared = true;
    } else {
      this.workerIsShared = false;
    }
  }

  /**
   * Creates and configures a persistent Tesseract.js worker.
   *
   * Worker is configured for single-line PSM and restricted to the characters
   * that appear in TFT champion names (letters + space) to reduce OCR noise.
   * Runs a warmup recognize call to load WASM modules before the first read.
   */
  async initialize(): Promise<void> {
    this.worker = await createWorker('eng', undefined, {
      // Suppress verbose Tesseract logging in the main process
      logger: () => {},
    });

    await this.worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_LINE,
      // Whitelist: A-Z, a-z, space — champion names only contain these
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ',
    });

    // Warmup: loading WASM/model is lazy; a warmup call ensures the first
    // real recognize() call is not penalized by initialization overhead.
    await this.worker.recognize(Buffer.alloc(0));
  }

  /**
   * Reads all 5 shop slots from a screenshot and returns matched ShopSlots.
   *
   * For each slot, the name text band is cropped (and preprocessed by
   * RegionCropper), then passed to Tesseract. The raw text is fuzzy-matched
   * against the known champion list via ChampionMatcher.
   *
   * @param pngBuffer - Full screenshot as PNG Buffer
   * @param width - Actual captured image width (for DPI scaling)
   * @param height - Actual captured image height (for DPI scaling)
   * @param matcher - ChampionMatcher initialized with the current champion list
   * @returns Array of 5 ShopSlots (apiName null if unrecognized)
   */
  async readShop(
    pngBuffer: Buffer,
    width: number,
    height: number,
    matcher: ChampionMatcher
  ): Promise<ShopSlot[]> {
    if (!this.worker) {
      throw new Error('ShopOCR not initialized — call initialize() first');
    }

    const scaleX = width / 1920;
    const scaleY = height / 1080;
    const slots: ShopSlot[] = [];

    for (const center of SHOP_SLOT_CENTERS) {
      // Compute name band coordinates in the actual captured image
      const scaledCenterX = Math.round(center.x * scaleX);
      const scaledCenterY = Math.round(center.y * scaleY);
      const scaledHalfW = Math.round(SHOP_NAME_BAND_HALF_W * scaleX);
      const scaledHalfH = Math.round(SHOP_NAME_BAND_HALF_H * scaleY);
      const scaledYOffset = Math.round(SHOP_NAME_BAND_Y_OFFSET * scaleY);

      const x = scaledCenterX - scaledHalfW;
      const y = scaledCenterY + scaledYOffset - scaledHalfH;
      const w = scaledHalfW * 2;
      const h = scaledHalfH * 2;

      // Crop + preprocess (greyscale, binarize, 3x upscale) for OCR
      const croppedBuffer = await cropRegion(pngBuffer, x, y, w, h);

      const { data } = await this.worker.recognize(croppedBuffer);
      const rawText = data.text.trim();
      const confidence = data.confidence;

      let apiName: string | null = null;
      let cost: number | null = null;

      if (confidence >= CONFIDENCE_THRESHOLD) {
        const matchResult = matcher.match(rawText);
        if (matchResult) {
          apiName = matchResult.apiName;
          cost = matchResult.cost;
        }
      }

      slots.push({ apiName, cost, owned: false });
    }

    return slots;
  }

  /**
   * Terminates the Tesseract worker and releases WASM resources.
   *
   * No-op when the worker was injected via constructor (shared worker pattern).
   * In that case, the caller (OCRPipeline) is responsible for termination.
   */
  async terminate(): Promise<void> {
    if (!this.workerIsShared && this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}

import { Jimp } from 'jimp';
import pixelmatch from 'pixelmatch';
import type { Worker } from 'tesseract.js';
import { BENCH_SLOTS, BOARD_SLOTS } from './OCRCoordinates';
import { cropRegion } from './RegionCropper';
import type { ChampionMatcher } from './ChampionMatcher';
import type { OCRChampion } from './types';

/**
 * Minimum Tesseract confidence score (0-100) to use the OCR result.
 * Matches the threshold used by ShopOCR for consistency.
 */
const CONFIDENCE_THRESHOLD = 60;

/**
 * Maximum number of pixel mismatches (out of 24*24=576 pixels) to consider
 * an item icon match valid. Higher values are more permissive.
 */
const ITEM_MATCH_THRESHOLD = 150;

/**
 * The 3 item slot positions relative to a champion's slot center.
 * Items appear at the bottom edge of the champion cell.
 */
const ITEM_SLOT_OFFSETS = [
  { x: -20, y: 20 },
  { x: 0, y: 20 },
  { x: 20, y: 20 },
] as const;

/** Size of each item icon region (pixels) */
const ITEM_ICON_SIZE = 24;

/**
 * Reads champion names and item loadouts from TFT bench and board slots
 * via text OCR (Tesseract.js) and item icon template matching (pixelmatch).
 *
 * A single Tesseract worker is shared with ShopOCR (passed in constructor)
 * to avoid spawning multiple WASM instances.
 *
 * Usage:
 *   const boardOCR = new BoardOCR(worker);
 *   await boardOCR.loadItemIconCache(itemIconPaths);
 *   const bench = await boardOCR.readBench(png, width, height, matcher);
 *   const board = await boardOCR.readBoard(png, width, height, matcher);
 */
export class BoardOCR {
  /** Shared Tesseract.js worker (owned by OCRPipeline) */
  private readonly worker: Worker;

  /** apiName -> 24x24 RGBA pixel buffer */
  private itemIconCache: Map<string, Buffer> = new Map();

  constructor(worker: Worker) {
    this.worker = worker;
  }

  /**
   * Loads item icon PNGs from disk, resizes each to 24x24, and stores their
   * raw RGBA bitmap data for pixelmatch comparison.
   *
   * @param itemIconPaths - Map from item apiName to local file path of the cached icon PNG
   */
  async loadItemIconCache(itemIconPaths: Map<string, string>): Promise<void> {
    this.itemIconCache = new Map();

    for (const [apiName, iconPath] of itemIconPaths) {
      const img = await Jimp.fromBuffer(await this.readFileAsBuffer(iconPath));
      img.resize({ w: ITEM_ICON_SIZE, h: ITEM_ICON_SIZE });
      // Extract raw RGBA bitmap data
      const rgba = Buffer.from(img.bitmap.data);
      this.itemIconCache.set(apiName, rgba);
    }
  }

  /**
   * Reads item icons at up to 3 positions around a champion slot center.
   *
   * For each of the 3 item slot offsets: crops a 24x24 region from the
   * screenshot, converts to RGBA, then uses pixelmatch to compare against
   * every icon in the cache. The best match below ITEM_MATCH_THRESHOLD is
   * considered a valid item.
   *
   * @param pngBuffer - Full screenshot PNG buffer
   * @param slotCenter - Champion slot center in the ACTUAL captured image (already scaled)
   * @param width - Captured image width (for DPI scale calculation — not used here, center is pre-scaled)
   * @param height - Captured image height
   * @returns Array of matched item apiNames (0-3 items)
   */
  async readItems(
    pngBuffer: Buffer,
    slotCenter: { x: number; y: number },
    _width: number,
    _height: number
  ): Promise<string[]> {
    if (this.itemIconCache.size === 0) return [];

    const matched: string[] = [];

    for (const offset of ITEM_SLOT_OFFSETS) {
      const itemX = slotCenter.x + offset.x - Math.floor(ITEM_ICON_SIZE / 2);
      const itemY = slotCenter.y + offset.y - Math.floor(ITEM_ICON_SIZE / 2);

      // Get raw RGBA of the screenshot region for this item slot
      const slotRGBA = await this.extractRGBA(pngBuffer, itemX, itemY, ITEM_ICON_SIZE, ITEM_ICON_SIZE);
      if (!slotRGBA) continue;

      // Compare against every icon in cache
      let bestName: string | null = null;
      let bestMismatch = ITEM_MATCH_THRESHOLD; // must beat this threshold

      for (const [apiName, iconRGBA] of this.itemIconCache) {
        const mismatch = pixelmatch(
          slotRGBA,
          iconRGBA,
          null,
          ITEM_ICON_SIZE,
          ITEM_ICON_SIZE,
          { threshold: 0.1 }
        );
        if (mismatch < bestMismatch) {
          bestMismatch = mismatch;
          bestName = apiName;
        }
      }

      if (bestName !== null) {
        matched.push(bestName);
      }
    }

    return matched;
  }

  /**
   * Reads champion names from the 9 TFT bench slots via text OCR.
   *
   * For each slot:
   * - Crops and preprocesses a name label band below the slot center
   * - Runs Tesseract OCR and fuzzy-matches the result via ChampionMatcher
   * - If recognized, also runs readItems() to detect item loadouts
   * - Unrecognized slots (null match AND low confidence) are filtered out
   *
   * @returns Array of recognized OCRChampions (may be empty if bench is empty)
   */
  async readBench(
    pngBuffer: Buffer,
    width: number,
    height: number,
    matcher: ChampionMatcher
  ): Promise<OCRChampion[]> {
    return this.readSlots(pngBuffer, width, height, matcher, [...BENCH_SLOTS]);
  }

  /**
   * Reads champion names from the 28 TFT board slots via text OCR.
   *
   * Same approach as readBench() but for the board positions.
   * Most board slots will be empty — they are filtered out.
   *
   * @returns Array of recognized OCRChampions (may be empty)
   */
  async readBoard(
    pngBuffer: Buffer,
    width: number,
    height: number,
    matcher: ChampionMatcher
  ): Promise<OCRChampion[]> {
    return this.readSlots(pngBuffer, width, height, matcher, [...BOARD_SLOTS]);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Shared slot-reading logic for bench and board.
   *
   * For each slot: crops name label region, runs OCR, fuzzy-matches,
   * and calls readItems() for recognized champions.
   */
  private async readSlots(
    pngBuffer: Buffer,
    width: number,
    height: number,
    matcher: ChampionMatcher,
    slots: ReadonlyArray<{ x: number; y: number }>
  ): Promise<OCRChampion[]> {
    const scaleX = width / 1920;
    const scaleY = height / 1080;

    // Name label region dimensions (relative to slot center, unscaled 1920x1080)
    const NAME_BAND_HALF_W = 30; // 60px wide total
    const NAME_BAND_HALF_H = 8;  // 15px tall total
    const NAME_BAND_Y_OFFSET = 35; // below center

    const results: OCRChampion[] = [];

    for (const slot of slots) {
      const scaledCenterX = Math.round(slot.x * scaleX);
      const scaledCenterY = Math.round(slot.y * scaleY);

      const halfW = Math.round(NAME_BAND_HALF_W * scaleX);
      const halfH = Math.round(NAME_BAND_HALF_H * scaleY);
      const yOffset = Math.round(NAME_BAND_Y_OFFSET * scaleY);

      const x = scaledCenterX - halfW;
      const y = scaledCenterY + yOffset - halfH;
      const w = halfW * 2;
      const h = halfH * 2;

      // Crop + preprocess (greyscale, binarize, 3x upscale) for OCR
      const croppedBuffer = await cropRegion(pngBuffer, x, y, w, h);

      const { data } = await this.worker.recognize(croppedBuffer);
      const rawText = data.text.trim();
      const confidence = data.confidence;

      // Dual gate: both confidence AND fuzzy ratio must pass
      const matchResult = confidence >= CONFIDENCE_THRESHOLD ? matcher.match(rawText) : null;

      if (matchResult !== null) {
        // Recognized champion — detect items at this slot position
        const itemApiNames = await this.readItems(
          pngBuffer,
          { x: scaledCenterX, y: scaledCenterY },
          width,
          height
        );

        results.push({
          apiName: matchResult.apiName,
          starLevel: 1,
          itemApiNames,
        });
      }
      // Empty slots (null match + low confidence) are filtered out by not pushing
    }

    return results;
  }

  /**
   * Crops a region from a PNG buffer and returns raw RGBA pixels.
   * Returns null if the crop region is out of bounds or Jimp fails.
   */
  private async extractRGBA(
    pngBuffer: Buffer,
    x: number,
    y: number,
    w: number,
    h: number
  ): Promise<Buffer | null> {
    try {
      const img = await Jimp.fromBuffer(pngBuffer);
      const cropped = img.crop({ x, y, w, h });
      return Buffer.from(cropped.bitmap.data);
    } catch {
      return null;
    }
  }

  /**
   * Reads a file from disk as a Buffer.
   * Abstracted to allow easy mocking in tests.
   */
  private async readFileAsBuffer(filePath: string): Promise<Buffer> {
    const { readFile } = await import('fs/promises');
    return readFile(filePath);
  }
}

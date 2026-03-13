import { describe, it, expect } from 'vitest';
import { Jimp } from 'jimp';
import { isShopVisible } from './ShopVisibilityDetector';

/**
 * Creates a synthetic PNG buffer of the given size filled with a single RGBA color.
 */
async function createSyntheticPng(
  width: number,
  height: number,
  r: number,
  g: number,
  b: number
): Promise<Buffer> {
  // Jimp color is 0xRRGGBBAA as an unsigned 32-bit integer.
  // Use >>> 0 to ensure the value is treated as unsigned (avoids negative numbers
  // when R >= 128 because JS bitwise OR produces signed 32-bit results).
  const color = (((r << 24) | (g << 16) | (b << 8) | 0xff) >>> 0);
  const img = new Jimp({ width, height, color });
  return img.getBuffer('image/png') as Promise<Buffer>;
}

describe('isShopVisible', () => {
  it('returns true when shop region pixel is dark (all black image)', async () => {
    // Create a 100x100 all-black image
    const pngBuffer = await createSyntheticPng(100, 100, 0, 0, 0);
    const result = await isShopVisible(pngBuffer, 100, 100);
    expect(result).toBe(true);
  });

  it('returns false when shop region pixel is bright (all white image)', async () => {
    // Create a 100x100 all-white image (combat/carousel state)
    const pngBuffer = await createSyntheticPng(100, 100, 255, 255, 255);
    const result = await isShopVisible(pngBuffer, 100, 100);
    expect(result).toBe(false);
  });

  it('returns false when shop region pixel is bright red', async () => {
    const pngBuffer = await createSyntheticPng(100, 100, 255, 0, 0);
    const result = await isShopVisible(pngBuffer, 100, 100);
    expect(result).toBe(false);
  });

  it('returns true for very dark (near-black) pixels', async () => {
    // R=20, G=20, B=20 — all < 30, should be considered dark
    const pngBuffer = await createSyntheticPng(100, 100, 20, 20, 20);
    const result = await isShopVisible(pngBuffer, 100, 100);
    expect(result).toBe(true);
  });

  it('returns false when only one channel exceeds threshold', async () => {
    // G=50 is >= 30, so not all dark
    const pngBuffer = await createSyntheticPng(100, 100, 10, 50, 10);
    const result = await isShopVisible(pngBuffer, 100, 100);
    expect(result).toBe(false);
  });
});

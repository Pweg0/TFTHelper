import { describe, it, expect } from 'vitest';
import { Jimp } from 'jimp';
import { cropRegion } from './RegionCropper';

/**
 * Creates a synthetic 100x100 solid-color PNG buffer for testing.
 * Uses Jimp directly so there's no external fixture file dependency.
 */
async function makeSyntheticPNG(width = 100, height = 100): Promise<Buffer> {
  const img = new Jimp({ width, height, color: 0xffffffff }); // white
  return img.getBuffer('image/png');
}

describe('cropRegion', () => {
  it('returns a Buffer', async () => {
    const pngBuffer = await makeSyntheticPNG();
    const result = await cropRegion(pngBuffer, 0, 0, 10, 10);
    expect(result).toBeInstanceOf(Buffer);
  });

  it('upscales the cropped region by 3x', async () => {
    const pngBuffer = await makeSyntheticPNG(100, 100);

    // Crop a 10x10 region; after 3x scale it should be 30x30
    const result = await cropRegion(pngBuffer, 0, 0, 10, 10);

    const resultImg = await Jimp.fromBuffer(result);
    const { width, height } = resultImg.bitmap;
    expect(width).toBe(30);
    expect(height).toBe(30);
  });

  it('produces a valid PNG (readable by Jimp)', async () => {
    const pngBuffer = await makeSyntheticPNG();
    const result = await cropRegion(pngBuffer, 5, 5, 20, 20);

    // Should not throw
    const img = await Jimp.fromBuffer(result);
    expect(img.bitmap.width).toBeGreaterThan(0);
    expect(img.bitmap.height).toBeGreaterThan(0);
  });

  it('produces a grayscale+thresholded image (all pixels are black or white)', async () => {
    // Create a gray image (128, 128, 128) — after threshold(128) should become white or black
    const img = new Jimp({ width: 20, height: 20, color: 0x808080ff }); // 50% gray
    const pngBuffer = await img.getBuffer('image/png');

    const result = await cropRegion(pngBuffer, 0, 0, 20, 20);
    const resultImg = await Jimp.fromBuffer(result);

    // After grayscale + binarize, each pixel's R channel should be 0 or 255
    const data = resultImg.bitmap.data;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      expect(r === 0 || r === 255).toBe(true);
    }
  });

  it('handles a region at the edge of the image', async () => {
    const pngBuffer = await makeSyntheticPNG(50, 50);

    // Crop right at the edge
    const result = await cropRegion(pngBuffer, 40, 40, 10, 10);
    expect(result).toBeInstanceOf(Buffer);
  });
});

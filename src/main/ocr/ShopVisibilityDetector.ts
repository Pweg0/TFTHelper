import { Jimp } from 'jimp';
import { SHOP_REGION } from './OCRCoordinates';

/**
 * Determines whether the TFT shop panel is currently visible on screen.
 *
 * Strategy: Sample a pixel within the SHOP_REGION area. During the planning
 * phase, the TFT shop panel background is very dark (near-black). During
 * combat or carousel, this region shows the game world which is bright.
 *
 * Threshold: R < 30 AND G < 30 AND B < 30 → shop is visible (dark background)
 *
 * @param pngBuffer - Full screenshot as a PNG Buffer
 * @param width - Actual width of the captured image
 * @param height - Actual height of the captured image
 * @returns true if shop panel is visible (dark pixel), false otherwise
 */
export async function isShopVisible(
  pngBuffer: Buffer,
  width: number,
  height: number
): Promise<boolean> {
  const scaleX = width / 1920;
  const scaleY = height / 1080;

  // Sample the top-left corner of the shop region (scaled to actual dimensions)
  const sampleX = Math.round(SHOP_REGION.x * scaleX);
  const sampleY = Math.round(SHOP_REGION.y * scaleY);

  const img = await Jimp.fromBuffer(pngBuffer);

  // Clamp coordinates to image bounds
  const x = Math.min(sampleX, img.width - 1);
  const y = Math.min(sampleY, img.height - 1);

  const colorInt = img.getPixelColor(x, y);

  // Jimp stores pixel as 0xRRGGBBAA
  const r = (colorInt >>> 24) & 0xff;
  const g = (colorInt >>> 16) & 0xff;
  const b = (colorInt >>> 8) & 0xff;

  return r < 30 && g < 30 && b < 30;
}

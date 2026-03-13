import { Jimp } from 'jimp';

/**
 * Crops a rectangular region from a PNG buffer and preprocesses it for OCR.
 *
 * Preprocessing pipeline:
 * 1. Crop to (x, y, w, h)
 * 2. Convert to grayscale
 * 3. Binarize (threshold at 128) — improves Tesseract accuracy
 * 4. Upscale 3x — larger text reduces OCR errors on small name bands
 *
 * @param pngBuffer - Full screenshot as a PNG Buffer
 * @param x - Left edge of the region in the source image
 * @param y - Top edge of the region in the source image
 * @param w - Width of the region
 * @param h - Height of the region
 * @returns Preprocessed PNG Buffer ready for Tesseract or template matching
 */
export async function cropRegion(
  pngBuffer: Buffer,
  x: number,
  y: number,
  w: number,
  h: number
): Promise<Buffer> {
  const img = await Jimp.fromBuffer(pngBuffer);
  const cropped = img
    .crop({ x, y, w, h })
    .greyscale()
    .threshold({ max: 128 })
    .scale(3);
  return cropped.getBuffer('image/png');
}

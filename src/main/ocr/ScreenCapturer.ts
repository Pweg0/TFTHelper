import { desktopCapturer } from 'electron';

/**
 * Wraps Electron's desktopCapturer to capture a TFT window as a PNG buffer.
 *
 * DPI awareness: The returned width/height reflect the actual captured image
 * dimensions (which may exceed 1920x1080 at high DPI scales). Callers should
 * compute scaleX = width/1920 and scaleY = height/1080 before using OCRCoordinates.
 */
export class ScreenCapturer {
  /**
   * Captures the window matching `windowTitle` and returns its PNG buffer
   * along with the actual image dimensions.
   *
   * Returns null if no matching window is found.
   *
   * Matching strategy:
   * 1. Exact title match: s.name === windowTitle
   * 2. Substring fallback: s.name.includes('League of Legends')
   */
  async capture(
    windowTitle: string
  ): Promise<{ png: Buffer; width: number; height: number } | null> {
    const sources = await desktopCapturer.getSources({
      types: ['window'],
      thumbnailSize: { width: 1920, height: 1080 },
    });

    // Try exact match first, then substring fallback
    const source =
      sources.find((s) => s.name === windowTitle) ??
      sources.find((s) => s.name.includes('League of Legends'));

    if (!source) return null;

    const size = source.thumbnail.getSize();
    return {
      png: source.thumbnail.toPNG(),
      width: size.width,
      height: size.height,
    };
  }
}

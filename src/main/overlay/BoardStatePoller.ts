import { BrowserWindow } from 'electron';
import { fetchGameData } from '../game/LiveClientAPI';
import { parseOverlayState } from './BoardStateParser';
import type { OCRPipeline } from '../ocr/OCRPipeline';

/**
 * BoardStatePoller polls the Riot Live Client Data API every 1 second,
 * runs the OCR pipeline in parallel (when available), merges both results,
 * and pushes the combined OverlayState to the overlay window via IPC.
 *
 * OCR integration:
 *   poller.setOCRPipeline(pipeline);  // after pipeline.initialize()
 * When no pipeline is set, OCR fields default to empty/offline.
 */
export class BoardStatePoller {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private ocrPipeline: OCRPipeline | null = null;

  /**
   * Injects the OCRPipeline to run alongside the Live Client API polling.
   * Must be called after `ocrPipeline.initialize()`.
   */
  setOCRPipeline(pipeline: OCRPipeline): void {
    this.ocrPipeline = pipeline;
  }

  start(overlayWin: BrowserWindow): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.intervalId = setInterval(() => {
      void this.tick(overlayWin);
    }, 1000);
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async tick(overlayWin: BrowserWindow): Promise<void> {
    // Run API fetch and OCR tick in parallel for minimum latency
    const [data, ocrResult] = await Promise.all([
      fetchGameData(),
      this.ocrPipeline ? this.ocrPipeline.tick() : Promise.resolve(undefined),
    ]);

    if (data === null) {
      console.debug('[BoardStatePoller] No game data (API returned null)');
      return;
    }
    if (overlayWin.isDestroyed()) return;

    // Merge Live Client API data with OCR result
    const state = parseOverlayState(data, ocrResult);
    console.log('[BoardStatePoller] Sending:', JSON.stringify(state).slice(0, 200));
    overlayWin.webContents.send('overlay-state-update', state);
  }
}

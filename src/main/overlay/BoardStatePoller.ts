import { BrowserWindow } from 'electron';
import { fetchGameData } from '../game/LiveClientAPI';
import { parseBoardState } from './BoardStateParser';

/**
 * BoardStatePoller polls the Riot Live Client Data API every 1 second,
 * parses the board state, and pushes it to the overlay window via IPC.
 *
 * - start(overlayWin) begins polling. Multiple calls clear the previous interval first.
 * - stop() clears the interval.
 * - Skips IPC send if overlayWin is destroyed or fetchGameData returns null.
 */
export class BoardStatePoller {
  private intervalId: ReturnType<typeof setInterval> | null = null;

  /**
   * Starts the 1s polling loop. Clears any existing interval first to prevent
   * duplicate timers on repeated start() calls.
   */
  start(overlayWin: BrowserWindow): void {
    // Clear previous interval if any
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.intervalId = setInterval(() => {
      void this.tick(overlayWin);
    }, 1000);
  }

  /**
   * Stops the polling loop.
   */
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async tick(overlayWin: BrowserWindow): Promise<void> {
    const data = await fetchGameData();

    // Skip if no game running
    if (data === null) {
      return;
    }

    // Skip if the overlay window was closed
    if (overlayWin.isDestroyed()) {
      return;
    }

    const players = parseBoardState(data);
    overlayWin.webContents.send('board-state-update', players);
  }
}

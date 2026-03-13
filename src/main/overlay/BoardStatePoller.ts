import { BrowserWindow } from 'electron';
import { fetchGameData } from '../game/LiveClientAPI';
import { parseOverlayState } from './BoardStateParser';

/**
 * BoardStatePoller polls the Riot Live Client Data API every 1 second,
 * parses the available data (gold, level, game time, player names),
 * and pushes it to the overlay window via IPC.
 */
export class BoardStatePoller {
  private intervalId: ReturnType<typeof setInterval> | null = null;

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
    const data = await fetchGameData();
    if (data === null) {
      console.debug('[BoardStatePoller] No game data (API returned null)');
      return;
    }
    if (overlayWin.isDestroyed()) return;

    const state = parseOverlayState(data);
    console.log('[BoardStatePoller] Sending:', JSON.stringify(state).slice(0, 200));
    overlayWin.webContents.send('overlay-state-update', state);
  }
}

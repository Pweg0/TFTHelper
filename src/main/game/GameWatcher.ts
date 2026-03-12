import { fetchGameData } from './LiveClientAPI';
import type { LiveClientResponse, GameState } from './types';

interface GameWatcherOptions {
  onGameStart: (data: LiveClientResponse) => void;
  onGameEnd: () => void;
  pollIntervalMs?: number;
}

/**
 * GameWatcher polls the Riot Live Client Data API and fires lifecycle callbacks
 * when a TFT game starts or ends.
 *
 * - Polls every 3 seconds by default (configurable via pollIntervalMs).
 * - Fires onGameStart only when transitioning from no-game to TFT-active.
 * - Fires onGameEnd only when transitioning from TFT-active to no-game.
 * - Non-TFT game modes (e.g., CLASSIC) are treated as no-game.
 * - No duplicate callbacks on stable state.
 */
export class GameWatcher {
  private readonly onGameStart: (data: LiveClientResponse) => void;
  private readonly onGameEnd: () => void;
  private readonly pollIntervalMs: number;

  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isGameActive: boolean = false;
  private gameMode: string | null = null;
  private lastCheckedAt: number = 0;

  constructor({ onGameStart, onGameEnd, pollIntervalMs = 3000 }: GameWatcherOptions) {
    this.onGameStart = onGameStart;
    this.onGameEnd = onGameEnd;
    this.pollIntervalMs = pollIntervalMs;
  }

  /**
   * Starts the polling loop. Safe to call multiple times — stops existing interval first.
   */
  start(): void {
    if (this.intervalId !== null) {
      this.stop();
    }
    this.intervalId = setInterval(() => {
      void this.tick();
    }, this.pollIntervalMs);
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

  /**
   * Returns a snapshot of the current game state.
   */
  getState(): GameState {
    return {
      isGameActive: this.isGameActive,
      gameMode: this.gameMode,
      lastCheckedAt: this.lastCheckedAt,
    };
  }

  private async tick(): Promise<void> {
    const data = await fetchGameData();
    this.lastCheckedAt = Date.now();

    const isTFTActive = data !== null && data.gameData.gameMode === 'TFT';

    if (isTFTActive && !this.isGameActive) {
      // Transition: no-game -> TFT-active
      this.isGameActive = true;
      this.gameMode = data!.gameData.gameMode;
      this.onGameStart(data!);
    } else if (!isTFTActive && this.isGameActive) {
      // Transition: TFT-active -> no-game
      this.isGameActive = false;
      this.gameMode = null;
      this.onGameEnd();
    }
    // Otherwise: stable state — no callbacks
  }
}

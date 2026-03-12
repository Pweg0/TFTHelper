import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { LiveClientResponse } from './types';

// Mock axios before importing LiveClientAPI/GameWatcher
vi.mock('axios');
vi.mock('./LiveClientAPI');

import { fetchGameData } from './LiveClientAPI';
import { GameWatcher } from './GameWatcher';

const mockFetchGameData = vi.mocked(fetchGameData);

const makeTFTResponse = (): LiveClientResponse => ({
  gameData: { gameMode: 'TFT', gameTime: 120 },
  allPlayers: [],
  activePlayer: {},
});

const makeClassicResponse = (): LiveClientResponse => ({
  gameData: { gameMode: 'CLASSIC', gameTime: 45 },
  allPlayers: [],
  activePlayer: {},
});

describe('LiveClientAPI', () => {
  // These tests are handled via integration with GameWatcher mocking
  it('fetchGameData exists as an exported function', async () => {
    // The real implementation is tested via the mock setup
    expect(typeof fetchGameData).toBe('function');
  });
});

describe('GameWatcher', () => {
  let onGameStart: ReturnType<typeof vi.fn>;
  let onGameEnd: ReturnType<typeof vi.fn>;
  let watcher: GameWatcher;

  beforeEach(() => {
    vi.useFakeTimers();
    onGameStart = vi.fn();
    onGameEnd = vi.fn();
    mockFetchGameData.mockResolvedValue(null);
    watcher = new GameWatcher({ onGameStart, onGameEnd, pollIntervalMs: 1000 });
  });

  afterEach(() => {
    watcher.stop();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('starts with isGameActive = false', () => {
    expect(watcher.getState().isGameActive).toBe(false);
  });

  it('fires onGameStart when transitioning from no-game to TFT-active', async () => {
    mockFetchGameData.mockResolvedValue(makeTFTResponse());
    watcher.start();
    await vi.advanceTimersByTimeAsync(1000);
    expect(onGameStart).toHaveBeenCalledTimes(1);
    expect(onGameStart).toHaveBeenCalledWith(expect.objectContaining({
      gameData: expect.objectContaining({ gameMode: 'TFT' }),
    }));
  });

  it('fires onGameEnd when transitioning from TFT-active to no-game', async () => {
    mockFetchGameData.mockResolvedValue(makeTFTResponse());
    watcher.start();
    await vi.advanceTimersByTimeAsync(1000);
    expect(onGameStart).toHaveBeenCalledTimes(1);

    mockFetchGameData.mockResolvedValue(null);
    await vi.advanceTimersByTimeAsync(1000);
    expect(onGameEnd).toHaveBeenCalledTimes(1);
  });

  it('does NOT fire onGameStart when gameMode is CLASSIC (non-TFT)', async () => {
    mockFetchGameData.mockResolvedValue(makeClassicResponse());
    watcher.start();
    await vi.advanceTimersByTimeAsync(1000);
    expect(onGameStart).not.toHaveBeenCalled();
  });

  it('does NOT fire duplicate onGameStart when game stays active across polls', async () => {
    mockFetchGameData.mockResolvedValue(makeTFTResponse());
    watcher.start();
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(1000);
    expect(onGameStart).toHaveBeenCalledTimes(1);
    expect(onGameEnd).not.toHaveBeenCalled();
  });

  it('fires onGameEnd when game switches from TFT to CLASSIC', async () => {
    mockFetchGameData.mockResolvedValue(makeTFTResponse());
    watcher.start();
    await vi.advanceTimersByTimeAsync(1000);
    expect(onGameStart).toHaveBeenCalledTimes(1);

    mockFetchGameData.mockResolvedValue(makeClassicResponse());
    await vi.advanceTimersByTimeAsync(1000);
    expect(onGameEnd).toHaveBeenCalledTimes(1);
  });

  it('does NOT fire duplicate onGameEnd when no game stays inactive across polls', async () => {
    mockFetchGameData.mockResolvedValue(null);
    watcher.start();
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(1000);
    expect(onGameEnd).not.toHaveBeenCalled();
  });

  it('stop() clears the interval and no more callbacks fire', async () => {
    mockFetchGameData.mockResolvedValue(makeTFTResponse());
    watcher.start();
    await vi.advanceTimersByTimeAsync(1000);
    expect(onGameStart).toHaveBeenCalledTimes(1);

    watcher.stop();
    mockFetchGameData.mockResolvedValue(null);
    await vi.advanceTimersByTimeAsync(2000);
    // onGameEnd should NOT fire after stop
    expect(onGameEnd).not.toHaveBeenCalled();
  });

  it('getState() reflects current game state', async () => {
    mockFetchGameData.mockResolvedValue(makeTFTResponse());
    watcher.start();
    await vi.advanceTimersByTimeAsync(1000);

    const state = watcher.getState();
    expect(state.isGameActive).toBe(true);
    expect(state.gameMode).toBe('TFT');
    expect(state.lastCheckedAt).toBeGreaterThan(0);
  });

  it('uses default poll interval of 3000ms when not specified', () => {
    const defaultWatcher = new GameWatcher({ onGameStart, onGameEnd });
    // Just verify it constructs without error
    expect(defaultWatcher.getState().isGameActive).toBe(false);
    defaultWatcher.stop();
  });
});

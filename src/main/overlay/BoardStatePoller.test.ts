import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetchGameData and parseBoardState before imports
const { mockFetchGameData, mockParseBoardState } = vi.hoisted(() => ({
  mockFetchGameData: vi.fn(),
  mockParseBoardState: vi.fn(),
}));

vi.mock('../game/LiveClientAPI', () => ({
  fetchGameData: mockFetchGameData,
}));

vi.mock('./BoardStateParser', () => ({
  parseBoardState: mockParseBoardState,
}));

// Mock electron BrowserWindow
vi.mock('electron', () => ({
  BrowserWindow: vi.fn(),
}));

import { BoardStatePoller } from './BoardStatePoller';

function makeMockWin(destroyed = false) {
  return {
    isDestroyed: vi.fn().mockReturnValue(destroyed),
    webContents: {
      send: vi.fn(),
    },
  };
}

describe('BoardStatePoller', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockFetchGameData.mockReset();
    mockParseBoardState.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('start() creates a 1s interval that triggers fetch, parse, and IPC send', async () => {
    const win = makeMockWin();
    const fakePlayers = [{ summonerName: 'Alice', hp: 80 }];

    mockFetchGameData.mockResolvedValue({ gameData: { gameMode: 'TFT', gameTime: 10 } });
    mockParseBoardState.mockReturnValue(fakePlayers);

    const poller = new BoardStatePoller();
    poller.start(win as never);

    // Advance 1000ms to trigger the interval
    await vi.advanceTimersByTimeAsync(1000);

    expect(mockFetchGameData).toHaveBeenCalledTimes(1);
    expect(mockParseBoardState).toHaveBeenCalledTimes(1);
    expect(win.webContents.send).toHaveBeenCalledWith('board-state-update', fakePlayers);
  });

  it('stop() clears the interval so no further sends occur', async () => {
    const win = makeMockWin();
    mockFetchGameData.mockResolvedValue({ gameData: { gameMode: 'TFT', gameTime: 10 } });
    mockParseBoardState.mockReturnValue([]);

    const poller = new BoardStatePoller();
    poller.start(win as never);

    await vi.advanceTimersByTimeAsync(1000);
    expect(win.webContents.send).toHaveBeenCalledTimes(1);

    poller.stop();

    await vi.advanceTimersByTimeAsync(2000);
    // Should still be only 1 call after stop
    expect(win.webContents.send).toHaveBeenCalledTimes(1);
  });

  it('does not call send when fetchGameData returns null', async () => {
    const win = makeMockWin();
    mockFetchGameData.mockResolvedValue(null);

    const poller = new BoardStatePoller();
    poller.start(win as never);

    await vi.advanceTimersByTimeAsync(1000);

    expect(mockParseBoardState).not.toHaveBeenCalled();
    expect(win.webContents.send).not.toHaveBeenCalled();
  });

  it('does not call send when overlayWin.isDestroyed() returns true', async () => {
    const win = makeMockWin(true); // destroyed = true
    mockFetchGameData.mockResolvedValue({ gameData: { gameMode: 'TFT', gameTime: 10 } });
    mockParseBoardState.mockReturnValue([]);

    const poller = new BoardStatePoller();
    poller.start(win as never);

    await vi.advanceTimersByTimeAsync(1000);

    expect(win.webContents.send).not.toHaveBeenCalled();
  });

  it('multiple start() calls only maintain one active interval (no duplicate timers)', async () => {
    const win = makeMockWin();
    mockFetchGameData.mockResolvedValue({ gameData: { gameMode: 'TFT', gameTime: 10 } });
    mockParseBoardState.mockReturnValue([]);

    const poller = new BoardStatePoller();
    poller.start(win as never);
    poller.start(win as never); // second start should clear first
    poller.start(win as never); // third start — only this one active

    await vi.advanceTimersByTimeAsync(1000);

    // Only one interval firing — exactly 1 fetch call
    expect(mockFetchGameData).toHaveBeenCalledTimes(1);
    expect(win.webContents.send).toHaveBeenCalledTimes(1);
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockFetchGameData, mockParseOverlayState } = vi.hoisted(() => ({
  mockFetchGameData: vi.fn(),
  mockParseOverlayState: vi.fn(),
}));

vi.mock('../game/LiveClientAPI', () => ({
  fetchGameData: mockFetchGameData,
}));

vi.mock('./BoardStateParser', () => ({
  parseOverlayState: mockParseOverlayState,
}));

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
    mockParseOverlayState.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('start() creates a 1s interval that triggers fetch, parse, and IPC send', async () => {
    const win = makeMockWin();
    const fakeState = { gold: 42, level: 5, gameTime: 60, playerNames: ['Alice'], localPlayerName: 'Alice' };

    mockFetchGameData.mockResolvedValue({ gameData: { gameMode: 'TFT', gameTime: 60 } });
    mockParseOverlayState.mockReturnValue(fakeState);

    const poller = new BoardStatePoller();
    poller.start(win as never);

    await vi.advanceTimersByTimeAsync(1000);

    expect(mockFetchGameData).toHaveBeenCalledTimes(1);
    expect(mockParseOverlayState).toHaveBeenCalledTimes(1);
    expect(win.webContents.send).toHaveBeenCalledWith('overlay-state-update', fakeState);
  });

  it('stop() clears the interval so no further sends occur', async () => {
    const win = makeMockWin();
    mockFetchGameData.mockResolvedValue({ gameData: { gameMode: 'TFT', gameTime: 10 } });
    mockParseOverlayState.mockReturnValue({});

    const poller = new BoardStatePoller();
    poller.start(win as never);

    await vi.advanceTimersByTimeAsync(1000);
    expect(win.webContents.send).toHaveBeenCalledTimes(1);

    poller.stop();

    await vi.advanceTimersByTimeAsync(2000);
    expect(win.webContents.send).toHaveBeenCalledTimes(1);
  });

  it('does not call send when fetchGameData returns null', async () => {
    const win = makeMockWin();
    mockFetchGameData.mockResolvedValue(null);

    const poller = new BoardStatePoller();
    poller.start(win as never);

    await vi.advanceTimersByTimeAsync(1000);

    expect(mockParseOverlayState).not.toHaveBeenCalled();
    expect(win.webContents.send).not.toHaveBeenCalled();
  });

  it('does not call send when overlayWin.isDestroyed() returns true', async () => {
    const win = makeMockWin(true);
    mockFetchGameData.mockResolvedValue({ gameData: { gameMode: 'TFT', gameTime: 10 } });

    const poller = new BoardStatePoller();
    poller.start(win as never);

    await vi.advanceTimersByTimeAsync(1000);

    expect(win.webContents.send).not.toHaveBeenCalled();
  });

  it('multiple start() calls only maintain one active interval', async () => {
    const win = makeMockWin();
    mockFetchGameData.mockResolvedValue({ gameData: { gameMode: 'TFT', gameTime: 10 } });
    mockParseOverlayState.mockReturnValue({});

    const poller = new BoardStatePoller();
    poller.start(win as never);
    poller.start(win as never);
    poller.start(win as never);

    await vi.advanceTimersByTimeAsync(1000);

    expect(mockFetchGameData).toHaveBeenCalledTimes(1);
    expect(win.webContents.send).toHaveBeenCalledTimes(1);
  });
});

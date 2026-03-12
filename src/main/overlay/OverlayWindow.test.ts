import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockAttachByTitle, mockEventsOn } = vi.hoisted(() => ({
  mockAttachByTitle: vi.fn(),
  mockEventsOn: vi.fn(),
}));

// Mock electron before imports
vi.mock('electron', () => {
  const mockSetIgnoreMouseEvents = vi.fn();
  const mockShow = vi.fn();
  const mockHide = vi.fn();
  const mockSetBounds = vi.fn();
  const mockLoadURL = vi.fn();
  const mockLoadFile = vi.fn();
  const mockOn = vi.fn();

  const mockBrowserWindow = vi.fn().mockImplementation(() => ({
    setIgnoreMouseEvents: mockSetIgnoreMouseEvents,
    show: mockShow,
    hide: mockHide,
    setBounds: mockSetBounds,
    loadURL: mockLoadURL,
    loadFile: mockLoadFile,
    on: mockOn,
    webContents: { id: 1 },
  }));

  (mockBrowserWindow as unknown as Record<string, unknown>).fromWebContents = vi.fn();

  const mockIpcMainOn = vi.fn();

  return {
    BrowserWindow: mockBrowserWindow,
    ipcMain: {
      on: mockIpcMainOn,
      handle: vi.fn(),
    },
  };
});

// Mock electron-overlay-window
vi.mock('electron-overlay-window', () => {
  return {
    OVERLAY_WINDOW_OPTS: {
      transparent: true,
      frame: false,
      resizable: false,
      show: false,
      alwaysOnTop: true,
    },
    OverlayController: {
      get attachByTitle() { return mockAttachByTitle; },
      events: {
        get on() { return mockEventsOn; },
      },
    },
  };
});

// Mock path module
vi.mock('path', () => ({
  join: (...args: string[]) => args.join('/'),
}));

import { BrowserWindow, ipcMain } from 'electron';
import { OVERLAY_WINDOW_OPTS } from 'electron-overlay-window';
import { createOverlayWindow } from './OverlayWindow';

describe('createOverlayWindow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set dev mode URL
    process.env['ELECTRON_RENDERER_URL'] = 'http://localhost:5173';
  });

  afterEach(() => {
    delete process.env['ELECTRON_RENDERER_URL'];
  });

  it('creates a BrowserWindow with OVERLAY_WINDOW_OPTS spread', () => {
    createOverlayWindow();

    expect(BrowserWindow).toHaveBeenCalledWith(
      expect.objectContaining({
        ...OVERLAY_WINDOW_OPTS,
        webPreferences: expect.objectContaining({
          sandbox: false,
        }),
      })
    );
  });

  it('sets the preload to overlayPreload.js in webPreferences', () => {
    createOverlayWindow();

    expect(BrowserWindow).toHaveBeenCalledWith(
      expect.objectContaining({
        webPreferences: expect.objectContaining({
          preload: expect.stringContaining('overlayPreload.js'),
        }),
      })
    );
  });

  it('calls attachByTitle with the correct TFT window title', () => {
    createOverlayWindow();

    expect(mockAttachByTitle).toHaveBeenCalledWith(
      expect.anything(),
      'League of Legends (TM) Client'
    );
  });

  it('calls setIgnoreMouseEvents(true, { forward: true }) on creation', () => {
    const win = createOverlayWindow();
    const instance = win as unknown as { setIgnoreMouseEvents: ReturnType<typeof vi.fn> };
    expect(instance.setIgnoreMouseEvents).toHaveBeenCalledWith(true, { forward: true });
  });

  it('registers attach, detach, and moveresize event handlers', () => {
    createOverlayWindow();

    expect(mockEventsOn).toHaveBeenCalledWith('attach', expect.any(Function));
    expect(mockEventsOn).toHaveBeenCalledWith('detach', expect.any(Function));
    expect(mockEventsOn).toHaveBeenCalledWith('moveresize', expect.any(Function));
  });

  it('shows the overlay window on attach event', () => {
    const win = createOverlayWindow();

    const attachCall = mockEventsOn.mock.calls.find(([event]) => event === 'attach');
    expect(attachCall).toBeDefined();
    attachCall![1]({ x: 0, y: 0, width: 1920, height: 1080 });

    expect((win as unknown as { show: ReturnType<typeof vi.fn> }).show).toHaveBeenCalled();
  });

  it('hides the overlay window on detach event', () => {
    const win = createOverlayWindow();

    const detachCall = mockEventsOn.mock.calls.find(([event]) => event === 'detach');
    expect(detachCall).toBeDefined();
    detachCall![1]();

    expect((win as unknown as { hide: ReturnType<typeof vi.fn> }).hide).toHaveBeenCalled();
  });

  it('updates bounds on moveresize event', () => {
    const win = createOverlayWindow();

    const moveresizeCall = mockEventsOn.mock.calls.find(([event]) => event === 'moveresize');
    expect(moveresizeCall).toBeDefined();
    moveresizeCall![1]({ x: 10, y: 20, width: 1920, height: 1080 });

    expect((win as unknown as { setBounds: ReturnType<typeof vi.fn> }).setBounds).toHaveBeenCalledWith({
      x: 10,
      y: 20,
      width: 1920,
      height: 1080,
    });
  });

  it('registers the set-ignore-mouse-events IPC handler', () => {
    createOverlayWindow();

    expect(ipcMain.on).toHaveBeenCalledWith('set-ignore-mouse-events', expect.any(Function));
  });

  it('IPC handler calls setIgnoreMouseEvents on the correct window', () => {
    const mockWinInstance = {
      setIgnoreMouseEvents: vi.fn(),
    };
    (BrowserWindow.fromWebContents as ReturnType<typeof vi.fn>).mockReturnValue(mockWinInstance);

    createOverlayWindow();

    const ipcCall = (ipcMain.on as ReturnType<typeof vi.fn>).mock.calls.find(
      ([channel]) => channel === 'set-ignore-mouse-events'
    );
    expect(ipcCall).toBeDefined();

    const mockEvent = { sender: {} };
    ipcCall![1](mockEvent, false);

    expect(BrowserWindow.fromWebContents).toHaveBeenCalledWith(mockEvent.sender);
    expect(mockWinInstance.setIgnoreMouseEvents).toHaveBeenCalledWith(false, { forward: true });
  });
});

import { BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import { OverlayController, OVERLAY_WINDOW_OPTS } from 'electron-overlay-window';

const TFT_WINDOW_TITLE = 'League of Legends (TM) Client';

export function createOverlayWindow(): BrowserWindow {
  const overlayWin = new BrowserWindow({
    ...OVERLAY_WINDOW_OPTS,
    webPreferences: {
      preload: join(__dirname, '../preload/overlayPreload.js'),
      sandbox: false,
    },
  });

  // Load the overlay renderer
  // Dev: electron-vite serves multi-entry pages at /{entryKey}/index.html
  // Prod: built to renderer/overlay/index.html
  if (process.env['ELECTRON_RENDERER_URL']) {
    const url = process.env['ELECTRON_RENDERER_URL'] + '/overlay/index.html';
    console.log('[OverlayWindow] Loading URL:', url);
    overlayWin.loadURL(url);
  } else {
    overlayWin.loadFile(join(__dirname, '../renderer/overlay/index.html'));
  }

  // Set initial click-through state — forward: true passes events to windows below
  overlayWin.setIgnoreMouseEvents(true, { forward: true });

  // Attach overlay to TFT window — can only be called ONCE per process
  console.log('[OverlayWindow] Attaching to window:', TFT_WINDOW_TITLE);
  OverlayController.attachByTitle(overlayWin, TFT_WINDOW_TITLE);

  // Lifecycle events from electron-overlay-window
  OverlayController.events.on('attach', (bounds) => {
    console.log('[OverlayWindow] Attached! Bounds:', bounds);
    overlayWin.show();
  });

  OverlayController.events.on('detach', () => {
    console.log('[OverlayWindow] Detached from game window');
    overlayWin.hide();
  });

  OverlayController.events.on('moveresize', ({ x, y, width, height }) => {
    overlayWin.setBounds({ x, y, width, height });
  });

  OverlayController.events.on('error', (err) => {
    console.error('[OverlayWindow] Error:', err);
  });

  // IPC handler to toggle click-through from the overlay renderer (panel hover)
  // Registered inside createOverlayWindow so it is captured during tests
  ipcMain.on('set-ignore-mouse-events', (event, ignore: boolean) => {
    BrowserWindow.fromWebContents(event.sender)?.setIgnoreMouseEvents(ignore, { forward: true });
  });

  return overlayWin;
}

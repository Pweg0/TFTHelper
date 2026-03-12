import { app, BrowserWindow, shell } from 'electron';
import { join } from 'path';
import Store from 'electron-store';
import type { AppConfig } from './data/types';
import { registerIpcHandlers } from './ipc/handlers';
import { runStartupSequence } from './startup';

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    title: 'TFT Helper',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return mainWindow;
}

app.whenReady().then(() => {
  // Initialize store and register IPC handlers before creating window
  const store = new Store<AppConfig>({
    defaults: {
      patchVersion: '',
      userLocale: 'en_us',
      userRegion: 'NA1',
      metaScrapedAt: 0,
      metaScrapedPatch: '',
    },
  });

  registerIpcHandlers(store);

  const mainWindow = createWindow();

  // Run startup sequence once window content is loaded
  mainWindow.webContents.on('did-finish-load', () => {
    void runStartupSequence(mainWindow);
  });

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

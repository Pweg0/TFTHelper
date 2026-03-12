import { BrowserWindow, ipcMain } from 'electron';
import Store from 'electron-store';
import type { AppConfig } from './data/types';
import { getLatestPatchVersion, isCacheStale } from './data/PatchVersionChecker';
import { downloadStaticData, loadStaticData, extractCurrentSetData } from './data/CommunityDragonFetcher';
import { downloadIcons } from './data/ImageCacheFetcher';
import { refreshMetaIfStale } from './data/MetaScraper';
import { GameWatcher } from './game/GameWatcher';

// TODO: Detect locale from Riot client process args (--locale=pt_BR) via LCU API.
// For now, default to en_us.
const DEFAULT_LOCALE = 'en_us';

// TODO: Derive current set identifier from CommunityDragon JSON structure at runtime.
// The current set is the one with the highest set number in the setData array.
// Hardcoded here as a fallback label — extractCurrentSetData already picks the highest set.
const DEFAULT_SET = 'set13';

/**
 * Sends a startup status message to the renderer via IPC.
 */
function sendStatus(win: BrowserWindow, step: string, message: string): void {
  if (!win.isDestroyed()) {
    win.webContents.send('startup-status', { step, message });
  }
}

/**
 * Main startup orchestration sequence.
 *
 * Order:
 * 1. Check patch version (with fallback to cached version)
 * 2. Download static data if cache is stale
 * 3. Load and extract static data
 * 4. Download icons (lazy — skips cached, non-fatal on failure)
 * 5. Refresh meta comps if stale (non-fatal on failure)
 * 6. Start GameWatcher polling
 */
export async function runStartupSequence(win: BrowserWindow): Promise<void> {
  // 1. Initialize electron-store
  const store = new Store<AppConfig>({
    defaults: {
      patchVersion: '',
      userLocale: DEFAULT_LOCALE,
      userRegion: 'NA1',
      metaScrapedAt: 0,
      metaScrapedPatch: '',
    },
  });

  // 2. Check for updates
  sendStatus(win, 'patch-check', 'Checking for updates...');

  let currentPatch = store.get('patchVersion') as string;
  let liveVersion: string | null = null;

  try {
    liveVersion = await getLatestPatchVersion();
    currentPatch = liveVersion;
  } catch (err) {
    console.warn('[Startup] Failed to fetch latest patch version, using cached:', currentPatch, err);
  }

  // 3. Download static data if stale
  let stale = false;
  try {
    stale = await isCacheStale(store);
  } catch (err) {
    console.warn('[Startup] Failed to check cache staleness:', err);
    stale = false;
  }

  const locale = (store.get('userLocale') as string) || DEFAULT_LOCALE;
  const set = DEFAULT_SET;

  if (stale) {
    sendStatus(win, 'download-data', 'Downloading game data...');
    try {
      await downloadStaticData(locale, set);
      if (liveVersion) {
        store.set('patchVersion', liveVersion);
        currentPatch = liveVersion;
      }
    } catch (err) {
      console.warn('[Startup] Failed to download static data:', err);
    }
  }

  // 4. Load and extract static data
  sendStatus(win, 'load-data', 'Loading game data...');
  let extractedData = { champions: [], traits: [], items: [], augments: [] } as {
    champions: import('./data/types').Champion[];
    traits: import('./data/types').Trait[];
    items: import('./data/types').Item[];
    augments: import('./data/types').Augment[];
  };

  try {
    const rawData = await loadStaticData(set, locale);
    if (rawData) {
      extractedData = extractCurrentSetData(rawData);
    } else {
      console.warn('[Startup] No static data found on disk — skipping extraction');
    }
  } catch (err) {
    console.warn('[Startup] Failed to load static data:', err);
  }

  // 5. Download icons (lazy, non-fatal)
  sendStatus(win, 'download-icons', 'Downloading icons...');
  try {
    await downloadIcons(set, extractedData);
  } catch (err) {
    console.warn('[Startup] Icon download failed (non-fatal):', err);
  }

  // 6. Refresh meta comps if stale (non-fatal)
  sendStatus(win, 'meta-scrape', 'Loading meta builds...');
  try {
    await refreshMetaIfStale(store as unknown as import('./data/MetaScraper').Store, currentPatch);
  } catch (err) {
    console.warn('[Startup] Meta scrape failed (non-fatal):', err);
  }

  // 7. Signal ready and start game watcher
  sendStatus(win, 'ready', 'Ready! Waiting for TFT game...');

  const watcher = new GameWatcher({
    onGameStart: (data) => {
      if (!win.isDestroyed()) {
        win.webContents.send('game-started', data);
      }
    },
    onGameEnd: () => {
      if (!win.isDestroyed()) {
        win.webContents.send('game-ended');
      }
    },
  });

  watcher.start();

  // Clean up watcher when the window is closed
  win.on('closed', () => {
    watcher.stop();
  });

  // Expose store via IPC for shutdown cleanup (optional)
  ipcMain.once('app-quit', () => {
    watcher.stop();
  });
}

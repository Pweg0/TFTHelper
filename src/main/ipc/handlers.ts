import { ipcMain } from 'electron';
import Store from 'electron-store';
import type { AppConfig } from '../data/types';
import { loadStaticData } from '../data/CommunityDragonFetcher';
import { getIconPath } from '../data/ImageCacheFetcher';
import { readJsonFile, getMetaCachePath } from '../data/DataCache';

// TODO: Derive locale and set identifiers at runtime (same as startup.ts).
const DEFAULT_LOCALE = 'en_us';
const DEFAULT_SET = 'set13';

/**
 * Registers all IPC handlers for renderer communication.
 *
 * Handlers:
 * - get-static-data  : returns cached static data from disk
 * - get-meta-data    : returns cached meta comp data from disk
 * - get-config       : returns app config (patch, locale, region)
 * - get-icon-path    : returns local file path for a given CDragon icon URL
 */
export function registerIpcHandlers(store: Store<AppConfig>): void {
  ipcMain.handle('get-static-data', async () => {
    const locale = (store.get('userLocale') as string) || DEFAULT_LOCALE;
    return loadStaticData(DEFAULT_SET, locale);
  });

  ipcMain.handle('get-meta-data', async () => {
    interface MetaCacheFile {
      comps: unknown[];
      scrapedAt: number;
    }
    return readJsonFile<MetaCacheFile>(getMetaCachePath());
  });

  ipcMain.handle('get-config', () => {
    return {
      patchVersion: store.get('patchVersion') as string,
      userLocale: (store.get('userLocale') as string) || DEFAULT_LOCALE,
      userRegion: (store.get('userRegion') as string) || 'NA1',
    };
  });

  ipcMain.handle('get-icon-path', (_event, set: string, iconUrl: string) => {
    return getIconPath(set, iconUrl);
  });
}

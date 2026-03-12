import axios from 'axios';

const DDRAGON_VERSIONS_URL = 'https://ddragon.leagueoflegends.com/api/versions.json';

/**
 * Fetches the latest patch version from DDragon.
 * Returns the first (most recent) version string, e.g. "16.5.1".
 * Throws on network error — caller decides fallback behavior.
 */
export async function getLatestPatchVersion(): Promise<string> {
  const response = await axios.get<string[]>(DDRAGON_VERSIONS_URL, { timeout: 5000 });
  return response.data[0];
}

/**
 * Checks if the cached patch version is stale compared to the live DDragon version.
 * Returns true if:
 *   - No version is cached (undefined or empty string)
 *   - Cached version differs from the live version
 * Returns false if cached version matches the live version.
 *
 * @param store - An electron-store instance (or compatible object with get())
 */
export async function isCacheStale(store: { get(key: string): unknown }): Promise<boolean> {
  const cached = store.get('patchVersion');

  if (!cached || cached === '') {
    return true;
  }

  const live = await getLatestPatchVersion();
  return cached !== live;
}

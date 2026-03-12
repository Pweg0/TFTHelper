import axios from 'axios';
import * as https from 'node:https';
import type { LiveClientResponse } from './types';

const LIVE_CLIENT_URL = 'https://127.0.0.1:2999/liveclientdata/allgamedata';

/**
 * Fetches current game data from the Riot Live Client Data API.
 *
 * The Live Client API runs on localhost:2999 during an active game and uses
 * a self-signed certificate, so rejectUnauthorized must be false.
 *
 * Returns null when no game is running (ECONNREFUSED), on timeout, or any error.
 * ECONNREFUSED is the normal state — do NOT log it.
 */
export async function fetchGameData(): Promise<LiveClientResponse | null> {
  try {
    const agent = new https.Agent({ rejectUnauthorized: false });
    const response = await axios.get<LiveClientResponse>(LIVE_CLIENT_URL, {
      httpsAgent: agent,
      timeout: 2000,
    });
    return response.data;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException & { code?: string }).code;
    // ECONNREFUSED is normal when no game is running — do not log
    if (code !== 'ECONNREFUSED') {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('ECONNREFUSED')) {
        console.debug('[LiveClientAPI] fetchGameData error:', msg);
      }
    }
    return null;
  }
}

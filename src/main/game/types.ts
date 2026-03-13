/**
 * GameState tracks whether a TFT match is currently active.
 */
export interface GameState {
  isGameActive: boolean;
  gameMode: string | null;
  lastCheckedAt: number;
}

/**
 * Actual Riot Live Client API response shape for TFT matches.
 * Validated against live game data captured from localhost:2999/liveclientdata/allgamedata.
 *
 * NOTE: The Live Client API does NOT provide TFT board state (compositions, items, HP).
 * Board state will come from OCR in Phase 3.
 */
export interface LiveClientResponse {
  gameData: {
    gameMode: string;
    gameTime: number;
    mapName?: string;
    [key: string]: unknown;
  };
  activePlayer: {
    summonerName?: string;
    riotId?: string;
    currentGold?: number;
    level?: number;
    [key: string]: unknown;
  };
  allPlayers: LiveClientPlayer[];
  [key: string]: unknown;
}

/**
 * A single player entry in allPlayers from the Live Client API.
 * In TFT, each entry is a human player (not a champion unit).
 * Fields like items[] are always empty in TFT.
 */
export interface LiveClientPlayer {
  summonerName: string;
  riotIdGameName?: string;
  riotIdTagLine?: string;
  level: number;
  isDead: boolean;
  isBot: boolean;
  team: string;
  items: unknown[];
  [key: string]: unknown;
}

// Re-export OCR types for consumer convenience
export type { OCRChampion, ShopSlot, OCRStatus } from '../ocr/types';
import type { OCRChampion, ShopSlot, OCRStatus } from '../ocr/types';

/**
 * OverlayState is the view model pushed from main to the overlay renderer.
 * Contains data from the Live Client API (gold, level, etc.) and from the
 * OCR pipeline (board, bench, shop, shopVisible, ocrStatus) added in Phase 3.
 */
export interface OverlayState {
  // Live Client API fields
  gold: number;
  level: number;
  gameTime: number;
  playerNames: string[];
  localPlayerName: string;
  // OCR pipeline fields (Phase 3)
  board: OCRChampion[];
  bench: OCRChampion[];
  shop: ShopSlot[];
  shopVisible: boolean;
  ocrStatus: OCRStatus;
}

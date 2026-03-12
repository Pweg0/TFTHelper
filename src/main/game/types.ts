/**
 * TFTItem represents an item equipped on a TFT champion unit.
 * Field names are provisional — validate against live game Swagger
 * (available at https://127.0.0.1:2999/swagger/v3/openapi.json during a match).
 */
export interface TFTItem {
  displayName: string;
  itemID: number;
  rawDescriptionKey?: string;
  rawDisplayNameKey?: string;
  [key: string]: unknown;
}

/**
 * TFTPlayer represents a single entry in the allPlayers array from the
 * Riot Live Client Data API during a TFT match.
 *
 * NOTE: In TFT, allPlayers may represent individual champion units rather
 * than human players. The exact field schema is provisional (LOW confidence
 * from research). Use .passthrough() and .optional() everywhere.
 * The real schema will be validated with a live game in Plan 04.
 */
export interface TFTPlayer {
  summonerName: string;
  championName: string;     // TFT unit name e.g. "TFT_Tristana" (may vary)
  level: number;            // champion star level (1/2/3)
  isDead: boolean;
  items: TFTItem[];
  championStats?: {
    currentHealth: number;
    maxHealth: number;
    [key: string]: unknown;
  };
  scores?: {
    kills: number;          // in TFT: placement round wins?
    [key: string]: unknown;
  };
  [key: string]: unknown;   // passthrough for unknown TFT fields
}

/**
 * ActivePlayer represents the local player's data from the activePlayer
 * endpoint. Includes gold and level which are not available for opponents.
 */
export interface ActivePlayer {
  summonerName?: string;
  currentGold?: number;
  level?: number;
  championStats?: {
    currentHealth: number;
    maxHealth: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * LiveClientResponse represents a response from the Riot Live Client Data API
 * (localhost:2999). Expanded in Phase 2 to include TFT-specific types.
 * The exact shape will be refined after in-game testing in Plan 04.
 */
export interface LiveClientResponse {
  gameData: {
    gameMode: string;
    gameTime: number;
    [key: string]: unknown;
  };
  allPlayers: TFTPlayer[];
  activePlayer: ActivePlayer;
}

/**
 * GameState tracks whether a TFT match is currently active.
 */
export interface GameState {
  isGameActive: boolean;
  gameMode: string | null;
  lastCheckedAt: number;
}

/**
 * DisplayChampion holds the data needed to render a champion icon in the overlay.
 */
export interface DisplayChampion {
  name: string;
  starLevel: number;
}

/**
 * DisplayPlayer is the view model consumed by the overlay renderer.
 * Produced by parseBoardState() from raw LiveClientResponse data.
 */
export interface DisplayPlayer {
  summonerName: string;
  hp: number;
  maxHp: number;
  level: number;
  /** Champion names for icon display (from championName field per player entry) */
  champions: string[];
  /** Items on this player's champions */
  items: TFTItem[];
  /** Whether this is the local (active) player */
  isLocalPlayer: boolean;
  /** Current gold — only populated for the local player */
  gold?: number;
}

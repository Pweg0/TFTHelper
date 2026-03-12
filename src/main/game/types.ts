/**
 * LiveClientResponse represents a response from the Riot Live Client Data API
 * (localhost:2999). The exact shape will be refined in Phase 2 after in-game testing.
 */
export interface LiveClientResponse {
  gameData: {
    gameMode: string;
    gameTime: number;
    [key: string]: unknown;
  };
  allPlayers: unknown[];
  activePlayer: {
    [key: string]: unknown;
  };
}

/**
 * GameState tracks whether a TFT match is currently active.
 */
export interface GameState {
  isGameActive: boolean;
  gameMode: string | null;
  lastCheckedAt: number;
}

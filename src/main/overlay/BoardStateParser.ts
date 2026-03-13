import { z } from 'zod';
import type { LiveClientResponse, OverlayState } from '../game/types';

// ---------------------------------------------------------------------------
// Zod Schemas — validated against actual TFT Live Client API response
// ---------------------------------------------------------------------------

export const LiveClientPlayerSchema = z
  .object({
    summonerName: z.string(),
    riotIdGameName: z.string().optional(),
    level: z.number().default(1),
    isDead: z.boolean().default(false),
    isBot: z.boolean().default(false),
    team: z.string().default(''),
    items: z.array(z.unknown()).default([]),
  })
  .passthrough();

export const ActivePlayerSchema = z
  .object({
    summonerName: z.string().optional(),
    riotId: z.string().optional(),
    currentGold: z.number().optional(),
    level: z.number().optional(),
  })
  .passthrough();

export const LiveClientResponseSchema = z
  .object({
    gameData: z
      .object({
        gameMode: z.string(),
        gameTime: z.number(),
        mapName: z.string().optional(),
      })
      .passthrough(),
    allPlayers: z.array(LiveClientPlayerSchema).default([]),
    activePlayer: ActivePlayerSchema,
  })
  .passthrough();

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

/**
 * parseOverlayState extracts the data actually available from the Live Client API
 * for display in the overlay: gold, level, game time, and player names.
 *
 * The Live Client API does NOT provide TFT board state (compositions, items, HP).
 * That data will come from OCR in Phase 3.
 */
export function parseOverlayState(data: LiveClientResponse): OverlayState {
  const localPlayerName =
    data.activePlayer?.summonerName ??
    data.activePlayer?.riotId ??
    '';

  return {
    gold: data.activePlayer?.currentGold ?? 0,
    level: data.activePlayer?.level ?? 1,
    gameTime: data.gameData?.gameTime ?? 0,
    playerNames: data.allPlayers
      .filter((p) => !p.isDead)
      .map((p) => p.riotIdGameName ?? p.summonerName),
    localPlayerName,
  };
}

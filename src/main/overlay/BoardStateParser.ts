import { z } from 'zod';
import type { LiveClientResponse, OverlayState } from '../game/types';
import type { OCRResult } from '../ocr/types';

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
 * When an OCRResult is provided, its fields (board, bench, shop, shopVisible,
 * ocrStatus) are merged into the OverlayState. When omitted, OCR fields default
 * to empty/offline values.
 *
 * @param data - Live Client API response
 * @param ocrResult - Optional OCR pipeline result to merge
 */
export function parseOverlayState(data: LiveClientResponse, ocrResult?: OCRResult): OverlayState {
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
    // OCR fields — populated from OCRPipeline result, or defaults when no OCR
    board: ocrResult?.board ?? [],
    bench: ocrResult?.bench ?? [],
    shop: ocrResult?.shop ?? [],
    shopVisible: ocrResult?.shopVisible ?? false,
    ocrStatus: ocrResult?.ocrStatus ?? 'offline',
  };
}

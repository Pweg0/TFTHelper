import { z } from 'zod';
import type { LiveClientResponse, DisplayPlayer, TFTItem } from '../game/types';

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

/**
 * Schema for a single TFT item.
 * Uses .passthrough() so unknown fields from the live API don't cause failures.
 */
export const TFTItemSchema = z
  .object({
    displayName: z.string(),
    itemID: z.number(),
    rawDescriptionKey: z.string().optional(),
    rawDisplayNameKey: z.string().optional(),
  })
  .passthrough();

/**
 * Schema for champion stats block.
 * Marked optional because per-player health availability in TFT is unconfirmed.
 */
export const ChampionStatsSchema = z
  .object({
    currentHealth: z.number(),
    maxHealth: z.number(),
  })
  .passthrough();

/**
 * Schema for a single player entry in allPlayers.
 *
 * NOTE: Field names are provisional — TFT's Live Client API schema is not
 * officially documented by Riot. All TFT-specific fields use .optional() and
 * .default() so parsing never throws on unknown/missing data.
 */
export const TFTPlayerSchema = z
  .object({
    summonerName: z.string(),
    championName: z.string().default(''),
    level: z.number().default(1),
    isDead: z.boolean().default(false),
    items: z.array(TFTItemSchema).default([]),
    championStats: ChampionStatsSchema.optional(),
  })
  .passthrough();

/**
 * Schema for the activePlayer block.
 * currentGold and summonerName are TFT extras — optional everywhere.
 */
export const ActivePlayerSchema = z
  .object({
    summonerName: z.string().optional(),
    currentGold: z.number().optional(),
    level: z.number().optional(),
    championStats: ChampionStatsSchema.optional(),
  })
  .passthrough();

/**
 * Top-level schema for the full Live Client Data API response.
 *
 * Using .passthrough() at every level means unknown TFT-specific fields are
 * preserved rather than stripped, which aids debugging during live game testing.
 */
export const LiveClientResponseSchema = z
  .object({
    gameData: z
      .object({
        gameMode: z.string(),
        gameTime: z.number(),
      })
      .passthrough(),
    allPlayers: z.array(TFTPlayerSchema).default([]),
    activePlayer: ActivePlayerSchema,
  })
  .passthrough();

// ---------------------------------------------------------------------------
// Board State Parser
// ---------------------------------------------------------------------------

/**
 * parseBoardState transforms a raw LiveClientResponse into a sorted,
 * filtered DisplayPlayer array suitable for the overlay renderer.
 *
 * Rules:
 * - Players with isDead === true are excluded.
 * - Players with championStats.currentHealth <= 0 are excluded.
 * - Players missing championStats entirely are treated as eliminated (hp=0).
 * - Surviving players are sorted by HP descending (highest HP first).
 * - Local player (matched by activePlayer.summonerName) gets isLocalPlayer=true
 *   and gold from activePlayer.currentGold.
 * - Duplicate summonerNames are preserved without deduplication.
 *
 * @param data - Raw response from the Riot Live Client Data API.
 * @returns Sorted, filtered DisplayPlayer array.
 */
export function parseBoardState(data: LiveClientResponse): DisplayPlayer[] {
  const activeSummonerName = data.activePlayer?.summonerName ?? '';
  const activeGold = data.activePlayer?.currentGold;

  const players: DisplayPlayer[] = data.allPlayers
    .map((player) => {
      const hp = player.championStats?.currentHealth ?? 0;
      const maxHp = player.championStats?.maxHealth ?? 0;
      const isLocalPlayer = activeSummonerName !== '' && player.summonerName === activeSummonerName;

      const display: DisplayPlayer = {
        summonerName: player.summonerName,
        hp,
        maxHp,
        level: player.level ?? 1,
        // In TFT, each player entry has its own championName — collect it as the champion
        champions: player.championName ? [player.championName] : [],
        items: (player.items ?? []) as TFTItem[],
        isLocalPlayer,
      };

      if (isLocalPlayer && activeGold !== undefined) {
        display.gold = activeGold;
      }

      return display;
    })
    .filter((player) => {
      // Eliminate if isDead
      const rawPlayer = data.allPlayers.find(
        (p) => p.summonerName === player.summonerName,
      );
      if (rawPlayer?.isDead === true) return false;

      // Eliminate if HP is zero or negative
      if (player.hp <= 0) return false;

      return true;
    })
    .sort((a, b) => b.hp - a.hp);

  return players;
}

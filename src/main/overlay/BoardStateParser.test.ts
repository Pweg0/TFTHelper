import { describe, it, expect } from 'vitest';
import { parseBoardState, LiveClientResponseSchema } from './BoardStateParser';
import type { LiveClientResponse } from '../game/types';

// Helper to build a minimal TFTPlayer-shaped object for tests
function makePlayer(
  summonerName: string,
  currentHealth: number,
  maxHealth: number,
  isDead = false,
  level = 1,
  items: { displayName: string; itemID: number }[] = [],
): Record<string, unknown> {
  return {
    summonerName,
    championName: 'TFT_TestUnit',
    level,
    isDead,
    items,
    championStats: {
      currentHealth,
      maxHealth,
    },
  };
}

function makeResponse(
  players: Record<string, unknown>[],
  activeSummonerName = '',
  currentGold = 0,
): LiveClientResponse {
  return {
    gameData: { gameMode: 'TFT', gameTime: 120 },
    allPlayers: players as never,
    activePlayer: {
      summonerName: activeSummonerName,
      currentGold,
    },
  };
}

describe('parseBoardState', () => {
  it('returns DisplayPlayer[] sorted by HP descending for 8 players', () => {
    const players = [
      makePlayer('Alice', 60, 100),
      makePlayer('Bob', 90, 100),
      makePlayer('Carol', 30, 100),
      makePlayer('Dave', 75, 100),
      makePlayer('Eve', 50, 100),
      makePlayer('Frank', 85, 100),
      makePlayer('Grace', 20, 100),
      makePlayer('Hank', 45, 100),
    ];

    const result = parseBoardState(makeResponse(players));

    expect(result.map((p) => p.summonerName)).toEqual([
      'Bob',
      'Frank',
      'Dave',
      'Alice',
      'Eve',
      'Hank',
      'Carol',
      'Grace',
    ]);
    // All HPs in descending order
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].hp).toBeGreaterThanOrEqual(result[i].hp);
    }
  });

  it('filters out eliminated players (isDead === true)', () => {
    const players = [
      makePlayer('Alive', 80, 100, false),
      makePlayer('Dead', 40, 100, true),
    ];

    const result = parseBoardState(makeResponse(players));

    expect(result).toHaveLength(1);
    expect(result[0].summonerName).toBe('Alive');
  });

  it('filters out players with currentHealth <= 0', () => {
    const players = [
      makePlayer('Alive', 50, 100, false),
      makePlayer('ZeroHP', 0, 100, false),
      makePlayer('NegativeHP', -5, 100, false),
    ];

    const result = parseBoardState(makeResponse(players));

    expect(result).toHaveLength(1);
    expect(result[0].summonerName).toBe('Alive');
  });

  it('filters out players with missing championStats (treated as eliminated)', () => {
    const playerWithStats = makePlayer('WithStats', 70, 100);
    const playerWithoutStats = {
      summonerName: 'NoStats',
      championName: 'TFT_Unit',
      level: 1,
      isDead: false,
      items: [],
      // No championStats field
    };

    const result = parseBoardState(makeResponse([playerWithStats, playerWithoutStats as never]));

    expect(result).toHaveLength(1);
    expect(result[0].summonerName).toBe('WithStats');
  });

  it('returns empty array when allPlayers is empty', () => {
    const result = parseBoardState(makeResponse([]));
    expect(result).toEqual([]);
  });

  it('returns empty array when all players are eliminated', () => {
    const players = [
      makePlayer('Dead1', 0, 100, false),
      makePlayer('Dead2', 30, 100, true),
      makePlayer('Dead3', -1, 100, false),
    ];

    const result = parseBoardState(makeResponse(players));
    expect(result).toEqual([]);
  });

  it('marks local player with isLocalPlayer=true and includes gold', () => {
    const players = [
      makePlayer('LocalPlayer', 80, 100),
      makePlayer('OtherPlayer', 60, 100),
    ];

    const result = parseBoardState(makeResponse(players, 'LocalPlayer', 42));

    const local = result.find((p) => p.summonerName === 'LocalPlayer');
    const other = result.find((p) => p.summonerName === 'OtherPlayer');

    expect(local).toBeDefined();
    expect(local!.isLocalPlayer).toBe(true);
    expect(local!.gold).toBe(42);

    expect(other).toBeDefined();
    expect(other!.isLocalPlayer).toBe(false);
    expect(other!.gold).toBeUndefined();
  });

  it('returns correct DisplayPlayer shape', () => {
    const items = [
      { displayName: 'Warmogs Armor', itemID: 57 },
      { displayName: 'Rabadon Deathcap', itemID: 35 },
    ];
    const players = [makePlayer('Tester', 75, 150, false, 3, items)];

    const result = parseBoardState(makeResponse(players));

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      summonerName: 'Tester',
      hp: 75,
      maxHp: 150,
      level: 3,
      champions: ['TFT_TestUnit'],
      items: [
        { displayName: 'Warmogs Armor', itemID: 57 },
        { displayName: 'Rabadon Deathcap', itemID: 35 },
      ],
      isLocalPlayer: false,
    });
  });

  it('preserves duplicate summonerNames without deduplication', () => {
    const players = [
      makePlayer('SameName', 80, 100),
      makePlayer('SameName', 60, 100),
    ];

    const result = parseBoardState(makeResponse(players));

    expect(result).toHaveLength(2);
    expect(result.every((p) => p.summonerName === 'SameName')).toBe(true);
  });
});

describe('LiveClientResponseSchema', () => {
  it('accepts extra unknown fields without throwing (passthrough)', () => {
    const raw = {
      gameData: { gameMode: 'TFT', gameTime: 60, extraField: 'hello' },
      allPlayers: [
        {
          summonerName: 'Player1',
          championName: 'TFT_Unit',
          level: 2,
          isDead: false,
          items: [],
          championStats: { currentHealth: 50, maxHealth: 100, armor: 30 },
          unknownTftField: 'some_value',
        },
      ],
      activePlayer: {
        summonerName: 'Player1',
        currentGold: 8,
        unknownField: true,
      },
    };

    expect(() => LiveClientResponseSchema.parse(raw)).not.toThrow();
  });

  it('applies safe defaults for missing optional fields', () => {
    const raw = {
      gameData: { gameMode: 'TFT', gameTime: 60 },
      allPlayers: [
        {
          summonerName: 'Player1',
          // Missing: championName, level, isDead, items, championStats
        },
      ],
      activePlayer: {},
    };

    const result = LiveClientResponseSchema.parse(raw);
    const player = result.allPlayers[0];

    expect(player.championName).toBe('');
    expect(player.level).toBe(1);
    expect(player.isDead).toBe(false);
    expect(player.items).toEqual([]);
  });

  it('returns empty array for missing allPlayers', () => {
    const raw = {
      gameData: { gameMode: 'TFT', gameTime: 0 },
      allPlayers: [],
      activePlayer: {},
    };

    const result = LiveClientResponseSchema.parse(raw);
    expect(result.allPlayers).toEqual([]);
  });
});

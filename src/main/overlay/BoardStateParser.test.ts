import { describe, it, expect } from 'vitest';
import { parseOverlayState, LiveClientResponseSchema } from './BoardStateParser';
import type { LiveClientResponse } from '../game/types';

function makePlayer(
  summonerName: string,
  isDead = false,
  riotIdGameName?: string,
): Record<string, unknown> {
  return {
    summonerName,
    riotIdGameName: riotIdGameName ?? summonerName,
    level: 3,
    isDead,
    isBot: false,
    team: 'ORDER',
    items: [],
  };
}

function makeResponse(
  players: Record<string, unknown>[],
  activeSummonerName = '',
  currentGold = 0,
  level = 1,
  gameTime = 120,
): LiveClientResponse {
  return {
    gameData: { gameMode: 'TFT', gameTime },
    allPlayers: players as never,
    activePlayer: {
      summonerName: activeSummonerName,
      currentGold,
      level,
    },
  };
}

describe('parseOverlayState', () => {
  it('extracts gold, level, and gameTime from activePlayer and gameData', () => {
    const result = parseOverlayState(
      makeResponse([makePlayer('Alice')], 'Alice', 42, 5, 180),
    );

    expect(result.gold).toBe(42);
    expect(result.level).toBe(5);
    expect(result.gameTime).toBe(180);
    expect(result.localPlayerName).toBe('Alice');
  });

  it('lists alive player names and excludes dead players', () => {
    const players = [
      makePlayer('Alice', false),
      makePlayer('Bob', true),
      makePlayer('Carol', false),
    ];

    const result = parseOverlayState(makeResponse(players, 'Alice', 10));

    expect(result.playerNames).toEqual(['Alice', 'Carol']);
  });

  it('uses riotIdGameName when available', () => {
    const players = [
      makePlayer('summoner1', false, 'RiotName1'),
      makePlayer('summoner2', false, 'RiotName2'),
    ];

    const result = parseOverlayState(makeResponse(players));
    expect(result.playerNames).toEqual(['RiotName1', 'RiotName2']);
  });

  it('falls back to summonerName when riotIdGameName is missing', () => {
    const players = [
      { summonerName: 'FallbackName', isDead: false, level: 1, isBot: false, team: 'ORDER', items: [] },
    ];

    const result = parseOverlayState(makeResponse(players as never));
    expect(result.playerNames).toEqual(['FallbackName']);
  });

  it('defaults gold to 0 and level to 1 when activePlayer has no data', () => {
    const response: LiveClientResponse = {
      gameData: { gameMode: 'TFT', gameTime: 0 },
      allPlayers: [],
      activePlayer: {},
    };

    const result = parseOverlayState(response);
    expect(result.gold).toBe(0);
    expect(result.level).toBe(1);
    expect(result.localPlayerName).toBe('');
  });

  it('returns empty playerNames when allPlayers is empty', () => {
    const result = parseOverlayState(makeResponse([]));
    expect(result.playerNames).toEqual([]);
  });

  it('uses riotId as fallback for localPlayerName when summonerName is missing', () => {
    const response: LiveClientResponse = {
      gameData: { gameMode: 'TFT', gameTime: 60 },
      allPlayers: [],
      activePlayer: { riotId: 'Player#BR1' },
    };

    const result = parseOverlayState(response);
    expect(result.localPlayerName).toBe('Player#BR1');
  });
});

describe('LiveClientResponseSchema', () => {
  it('accepts extra unknown fields without throwing (passthrough)', () => {
    const raw = {
      gameData: { gameMode: 'TFT', gameTime: 60, extraField: 'hello' },
      allPlayers: [
        {
          summonerName: 'Player1',
          riotIdGameName: 'Player1',
          level: 2,
          isDead: false,
          isBot: false,
          team: 'ORDER',
          items: [],
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
        },
      ],
      activePlayer: {},
    };

    const result = LiveClientResponseSchema.parse(raw);
    const player = result.allPlayers[0];

    expect(player.level).toBe(1);
    expect(player.isDead).toBe(false);
    expect(player.items).toEqual([]);
  });

  it('returns empty array for empty allPlayers', () => {
    const raw = {
      gameData: { gameMode: 'TFT', gameTime: 0 },
      allPlayers: [],
      activePlayer: {},
    };

    const result = LiveClientResponseSchema.parse(raw);
    expect(result.allPlayers).toEqual([]);
  });
});

import { describe, it, expect } from 'vitest';
import { ChampionMatcher } from './ChampionMatcher';
import type { Champion } from '../data/types';

/** Small fixture list with realistic apiNames and display names */
const FIXTURE_CHAMPIONS: Champion[] = [
  { apiName: 'TFT13_Ahri', name: 'Ahri', cost: 3, traits: ['Rebel', 'Mage'], icon: 'ahri.png' },
  { apiName: 'TFT13_Wukong', name: 'Wukong', cost: 4, traits: ['Divinicorp', 'Fighter'], icon: 'wukong.png' },
  { apiName: 'TFT13_TwistedFate', name: 'Twisted Fate', cost: 2, traits: ['Syndicate', 'Strategist'], icon: 'tf.png' },
  { apiName: 'TFT13_Jinx', name: 'Jinx', cost: 1, traits: ['Rebel', 'Gunslinger'], icon: 'jinx.png' },
  { apiName: 'TFT13_Jayce', name: 'Jayce', cost: 5, traits: ['Piltover', 'Fighter'], icon: 'jayce.png' },
  { apiName: 'TFT13_Vi', name: 'Vi', cost: 2, traits: ['Piltover', 'Brawler'], icon: 'vi.png' },
  { apiName: 'TFT13_Ekko', name: 'Ekko', cost: 4, traits: ['Rebel', 'Assassin'], icon: 'ekko.png' },
  { apiName: 'TFT13_Sett', name: 'Sett', cost: 3, traits: ['Syndicate', 'Brawler'], icon: 'sett.png' },
  { apiName: 'TFT13_Caitlyn', name: 'Caitlyn', cost: 4, traits: ['Piltover', 'Sniper'], icon: 'caitlyn.png' },
  { apiName: 'TFT13_Orianna', name: 'Orianna', cost: 3, traits: ['Divinicorp', 'Mage'], icon: 'orianna.png' },
];

describe('ChampionMatcher', () => {
  let matcher: ChampionMatcher;

  beforeEach(() => {
    matcher = new ChampionMatcher(FIXTURE_CHAMPIONS);
  });

  describe('exact matches', () => {
    it('returns correct champion for exact display name', () => {
      const result = matcher.match('Ahri');
      expect(result).not.toBeNull();
      expect(result!.apiName).toBe('TFT13_Ahri');
      expect(result!.cost).toBe(3);
    });

    it('returns correct champion for multi-word exact match', () => {
      const result = matcher.match('Twisted Fate');
      expect(result).not.toBeNull();
      expect(result!.apiName).toBe('TFT13_TwistedFate');
    });
  });

  describe('case insensitivity', () => {
    it('matches regardless of case', () => {
      const result = matcher.match('AHRI');
      expect(result).not.toBeNull();
      expect(result!.apiName).toBe('TFT13_Ahri');
    });

    it('matches mixed case', () => {
      const result = matcher.match('aHrI');
      expect(result).not.toBeNull();
      expect(result!.apiName).toBe('TFT13_Ahri');
    });
  });

  describe('OCR variants - space insertion errors', () => {
    it('handles OCR space insertion (W ukong -> Wukong)', () => {
      const result = matcher.match('W ukong');
      expect(result).not.toBeNull();
      expect(result!.apiName).toBe('TFT13_Wukong');
    });

    it('handles OCR space insertion in other names', () => {
      const result = matcher.match('Cait lyn');
      expect(result).not.toBeNull();
      expect(result!.apiName).toBe('TFT13_Caitlyn');
    });
  });

  describe('OCR variants - missing space errors', () => {
    it('handles OCR missing space (TwistedFate -> Twisted Fate)', () => {
      const result = matcher.match('TwistedFate');
      expect(result).not.toBeNull();
      expect(result!.apiName).toBe('TFT13_TwistedFate');
    });
  });

  describe('low-confidence / garbage input', () => {
    it('returns null for garbage input below 0.7 threshold', () => {
      const result = matcher.match('xyzgarbage');
      expect(result).toBeNull();
    });

    it('returns null for empty string', () => {
      const result = matcher.match('');
      expect(result).toBeNull();
    });

    it('returns null for whitespace-only string', () => {
      const result = matcher.match('   ');
      expect(result).toBeNull();
    });
  });

  describe('partial / near matches', () => {
    it('matches close approximation', () => {
      const result = matcher.match('Ahri');
      expect(result).not.toBeNull();
      expect(result!.apiName).toBe('TFT13_Ahri');
    });

    it('returns most similar champion when multiple candidates exist', () => {
      // "Ekko" vs "Sett" — "Ekko" should win
      const result = matcher.match('Ekko');
      expect(result).not.toBeNull();
      expect(result!.apiName).toBe('TFT13_Ekko');
    });
  });
});

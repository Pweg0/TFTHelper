import type { Champion } from '../data/types';

/**
 * Fuzzy champion name matcher for correcting OCR misreads.
 *
 * Uses a character-level similarity ratio (similar to Python's SequenceMatcher)
 * to find the best matching champion display name. A similarity threshold of 0.7
 * gates matches — below that, null is returned (rendered as "?" in the overlay).
 *
 * Algorithm (per TFT-OCR-BOT reference):
 *   ratio = 2 * common_chars / (len(a) + len(b))
 * where common_chars is the count of characters shared by the two strings
 * as an intersection of character frequency maps.
 */

interface MatchResult {
  apiName: string;
  cost: number;
}

export class ChampionMatcher {
  /** Minimum similarity ratio to consider a match valid */
  static readonly THRESHOLD = 0.7;

  /** Pre-computed lowercase display names mapped to their champion data */
  private readonly entries: Array<{ lcName: string; apiName: string; cost: number }>;

  constructor(champions: Champion[]) {
    this.entries = champions.map((c) => ({
      lcName: c.name.toLowerCase(),
      apiName: c.apiName,
      cost: c.cost,
    }));
  }

  /**
   * Attempts to match an OCR-read string to a known champion.
   *
   * @param ocrText - Raw text from Tesseract (may contain OCR errors)
   * @returns Matched champion's apiName and cost, or null if no match above threshold
   */
  match(ocrText: string): MatchResult | null {
    const normalized = ocrText.trim().replace(/\s+/g, ' ').toLowerCase();

    if (normalized.length === 0) {
      return null;
    }

    let bestRatio = 0;
    let bestEntry: (typeof this.entries)[0] | null = null;

    for (const entry of this.entries) {
      const ratio = ChampionMatcher.similarityRatio(normalized, entry.lcName);
      if (ratio > bestRatio) {
        bestRatio = ratio;
        bestEntry = entry;
      }
    }

    if (bestRatio >= ChampionMatcher.THRESHOLD && bestEntry !== null) {
      return { apiName: bestEntry.apiName, cost: bestEntry.cost };
    }

    return null;
  }

  /**
   * Computes the similarity ratio between two strings using a character-frequency
   * intersection approach.
   *
   * ratio = 2 * |intersection| / (|a| + |b|)
   *
   * Strings are compared after collapsing internal spaces so that "twistedfate"
   * and "twisted fate" are treated as equivalent. This handles both space-insertion
   * and space-removal OCR errors.
   */
  static similarityRatio(a: string, b: string): number {
    // Strip all spaces for comparison to handle space insertion/removal OCR errors
    const aStripped = a.replace(/\s/g, '');
    const bStripped = b.replace(/\s/g, '');

    if (aStripped.length === 0 && bStripped.length === 0) return 1;
    if (aStripped.length === 0 || bStripped.length === 0) return 0;

    const aFreq = ChampionMatcher.charFrequency(aStripped);
    const bFreq = ChampionMatcher.charFrequency(bStripped);

    let intersection = 0;
    for (const [char, count] of aFreq) {
      const bCount = bFreq.get(char) ?? 0;
      intersection += Math.min(count, bCount);
    }

    return (2 * intersection) / (aStripped.length + bStripped.length);
  }

  private static charFrequency(str: string): Map<string, number> {
    const freq = new Map<string, number>();
    for (const char of str) {
      freq.set(char, (freq.get(char) ?? 0) + 1);
    }
    return freq;
  }
}

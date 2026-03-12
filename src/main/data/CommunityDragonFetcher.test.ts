import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock axios
vi.mock('axios');

// Mock DataCache
vi.mock('./DataCache', () => ({
  getStaticDataPath: vi.fn((set: string, locale: string) => `/cache/static/${set}/${locale}.json`),
  writeJsonFile: vi.fn().mockResolvedValue(undefined),
  readJsonFile: vi.fn().mockResolvedValue(null),
}));

import axios from 'axios';
import { downloadStaticData, extractCurrentSetData, loadStaticData } from './CommunityDragonFetcher';
import { writeJsonFile, readJsonFile, getStaticDataPath } from './DataCache';

const mockedAxios = vi.mocked(axios);
const mockedWriteJsonFile = vi.mocked(writeJsonFile);
const mockedReadJsonFile = vi.mocked(readJsonFile);
const mockedGetStaticDataPath = vi.mocked(getStaticDataPath);

// Minimal CommunityDragon fixture
const validChampion1 = {
  apiName: 'TFT13_Ahri',
  name: 'Ahri',
  cost: 4,
  traits: ['Rebel', 'Mage'],
  icon: 'ASSETS/UX/TFT/Champions/TFT13_Ahri.png',
};

const validChampion2 = {
  apiName: 'TFT13_Lux',
  name: 'Lux',
  cost: 3,
  traits: ['Academy'],
  icon: 'ASSETS/UX/TFT/Champions/TFT13_Lux.png',
};

// Invalid champion: missing required 'cost' field
const invalidChampion = {
  apiName: 'TFT13_Invalid',
  name: 'Invalid',
  traits: [],
  icon: 'ASSETS/UX/TFT/Champions/invalid.png',
};

const validTrait1 = {
  apiName: 'TFT13_Rebel',
  name: 'Rebel',
  desc: 'Rebels gain attack speed.',
  icon: 'ASSETS/UX/TFT/Traits/Rebel.png',
  effects: [{ minUnits: 3, style: 1 }, { minUnits: 6, style: 2 }],
};

const validTrait2 = {
  apiName: 'TFT13_Mage',
  name: 'Mage',
  desc: 'Mages get bonus AP.',
  icon: 'ASSETS/UX/TFT/Traits/Mage.png',
  effects: [{ minUnits: 2, style: 1 }],
};

const validItem1 = {
  apiName: 'TFT_Item_BFSword',
  name: 'B.F. Sword',
  desc: 'Grants attack damage.',
  icon: 'ASSETS/UX/TFT/Items/BFSword.png',
};

const validItem2 = {
  apiName: 'TFT_Item_ChainVest',
  name: 'Chain Vest',
  desc: 'Grants armor.',
  icon: 'ASSETS/UX/TFT/Items/ChainVest.png',
};

const validAugment1 = {
  apiName: 'TFT13_Augment_Gold',
  name: 'Gold Rush',
  desc: 'Gain gold.',
  icon: 'ASSETS/UX/TFT/Augments/GoldRush.png',
};

const validAugment2 = {
  apiName: 'TFT13_Augment_Silver',
  name: 'Silver Lining',
  desc: 'Gain silver.',
  icon: 'ASSETS/UX/TFT/Augments/SilverLining.png',
};

// CommunityDragon puts items AND augments in the same top-level `items` array
const mockCommunityDragonData = {
  setData: [
    {
      number: 12,
      name: 'TFT Set 12',
      champions: [
        { apiName: 'TFT12_OldChamp', name: 'OldChamp', cost: 1, traits: ['OldTrait'], icon: 'ASSETS/old.png' },
      ],
      traits: [],
    },
    {
      number: 13,
      name: 'TFT Set 13',
      champions: [validChampion1, validChampion2, invalidChampion],
      traits: [validTrait1, validTrait2],
    },
  ],
  items: [validItem1, validItem2, validAugment1, validAugment2],
};

describe('CommunityDragonFetcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetStaticDataPath.mockReturnValue('/cache/static/set13/pt_br.json');
  });

  describe('downloadStaticData', () => {
    it('builds the correct locale URL for CommunityDragon CDN', async () => {
      mockedAxios.get = vi.fn().mockResolvedValue({ data: mockCommunityDragonData });

      await downloadStaticData('pt_BR', 'set13');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://raw.communitydragon.org/latest/cdragon/tft/pt_br.json',
        expect.objectContaining({ timeout: 30000 })
      );
    });

    it('converts locale to lowercase in URL', async () => {
      mockedAxios.get = vi.fn().mockResolvedValue({ data: mockCommunityDragonData });

      await downloadStaticData('EN_US', 'set13');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('en_us.json'),
        expect.any(Object)
      );
    });

    it('writes the downloaded data to disk at the correct path', async () => {
      mockedAxios.get = vi.fn().mockResolvedValue({ data: mockCommunityDragonData });

      await downloadStaticData('pt_BR', 'set13');

      expect(mockedWriteJsonFile).toHaveBeenCalledWith(
        '/cache/static/set13/pt_br.json',
        mockCommunityDragonData
      );
    });
  });

  describe('extractCurrentSetData', () => {
    it('returns champions, traits, items, and augments from the current (highest) set', () => {
      const result = extractCurrentSetData(mockCommunityDragonData);
      expect(result.champions).toHaveLength(2); // invalid one filtered out
      expect(result.traits).toHaveLength(2);
      expect(result.items).toHaveLength(2);
      expect(result.augments).toHaveLength(2);
    });

    it('picks the set with the highest number as current set', () => {
      const result = extractCurrentSetData(mockCommunityDragonData);
      // Should pick set 13 (Ahri, Lux), not set 12 (OldChamp)
      const names = result.champions.map((c) => c.name);
      expect(names).toContain('Ahri');
      expect(names).toContain('Lux');
      expect(names).not.toContain('OldChamp');
    });

    it('filters out champions that fail Zod validation', () => {
      const result = extractCurrentSetData(mockCommunityDragonData);
      const names = result.champions.map((c) => c.name);
      expect(names).not.toContain('Invalid');
    });

    it('returns validated champion objects with correct fields', () => {
      const result = extractCurrentSetData(mockCommunityDragonData);
      const ahri = result.champions.find((c) => c.apiName === 'TFT13_Ahri');
      expect(ahri).toBeDefined();
      expect(ahri?.cost).toBe(4);
      expect(ahri?.traits).toEqual(['Rebel', 'Mage']);
    });
  });

  describe('loadStaticData', () => {
    it('returns data from disk cache when file exists', async () => {
      mockedReadJsonFile.mockResolvedValueOnce(mockCommunityDragonData as any);

      const result = await loadStaticData('set13', 'pt_br');
      expect(result).toEqual(mockCommunityDragonData);
      expect(mockedReadJsonFile).toHaveBeenCalledWith('/cache/static/set13/pt_br.json');
    });

    it('returns null when cache file does not exist', async () => {
      mockedReadJsonFile.mockResolvedValueOnce(null);

      const result = await loadStaticData('set13', 'pt_br');
      expect(result).toBeNull();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as path from 'node:path';

// Helper to normalize path separators for cross-platform assertions
const normPath = (p: string) => p.replace(/\\/g, '/');

// Mock axios
vi.mock('axios');

// Mock DataCache
vi.mock('./DataCache', () => ({
  getImageCachePath: vi.fn((set: string) => `/cache/images/${set}`),
}));

// Mock fs/promises
vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  access: vi.fn().mockRejectedValue({ code: 'ENOENT' }), // default: file does not exist
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

import axios from 'axios';
import * as fs from 'node:fs/promises';
import { downloadIcons, getIconPath } from './ImageCacheFetcher';
import { getImageCachePath } from './DataCache';

const mockedAxios = vi.mocked(axios);
const mockedFs = vi.mocked(fs);
const mockedGetImageCachePath = vi.mocked(getImageCachePath);

const sampleData = {
  champions: [
    {
      apiName: 'TFT13_Ahri',
      name: 'Ahri',
      cost: 4,
      traits: ['Rebel'],
      icon: 'ASSETS/UX/TFT/Champions/TFT13_Ahri.TFT_Set13.tex',
    },
    {
      apiName: 'TFT13_Lux',
      name: 'Lux',
      cost: 3,
      traits: ['Academy'],
      icon: 'ASSETS/UX/TFT/Champions/TFT13_Lux.TFT_Set13.tex',
    },
    {
      apiName: 'TFT13_Jinx',
      name: 'Jinx',
      cost: 2,
      traits: ['Rebel'],
      icon: 'ASSETS/UX/TFT/Champions/TFT13_Jinx.TFT_Set13.tex',
    },
  ],
  traits: [],
  items: [],
  augments: [],
};

describe('ImageCacheFetcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: file does not exist (access rejects)
    mockedFs.access = vi.fn().mockRejectedValue({ code: 'ENOENT' });
    mockedFs.mkdir = vi.fn().mockResolvedValue(undefined);
    mockedFs.writeFile = vi.fn().mockResolvedValue(undefined);
    mockedGetImageCachePath.mockReturnValue('/cache/images/set13');
  });

  describe('getIconPath', () => {
    it('returns local path with .png extension replacing .tex', () => {
      const iconUrl = 'ASSETS/UX/TFT/Champions/TFT13_Ahri.TFT_Set13.tex';
      const result = normPath(getIconPath('set13', iconUrl));
      expect(result).toBe('/cache/images/set13/TFT13_Ahri.TFT_Set13.png');
    });

    it('returns local path preserving .png extension if already png', () => {
      const iconUrl = 'ASSETS/UX/TFT/Traits/Rebel.png';
      const result = normPath(getIconPath('set13', iconUrl));
      expect(result).toBe('/cache/images/set13/Rebel.png');
    });

    it('uses getImageCachePath for the directory', () => {
      getIconPath('set13', 'ASSETS/something/icon.png');
      expect(mockedGetImageCachePath).toHaveBeenCalledWith('set13');
    });
  });

  describe('downloadIcons', () => {
    it('creates the image cache directory before downloading', async () => {
      mockedAxios.get = vi.fn().mockResolvedValue({ data: Buffer.from('fake-image') });

      await downloadIcons('set13', sampleData);

      expect(mockedFs.mkdir).toHaveBeenCalledWith('/cache/images/set13', { recursive: true });
    });

    it('downloads all icon images via axios', async () => {
      mockedAxios.get = vi.fn().mockResolvedValue({ data: Buffer.from('fake-image') });

      await downloadIcons('set13', sampleData);

      // 3 champions, each with a unique icon
      expect(mockedAxios.get).toHaveBeenCalledTimes(3);
    });

    it('builds correct CommunityDragon CDN URLs for each icon', async () => {
      mockedAxios.get = vi.fn().mockResolvedValue({ data: Buffer.from('fake-image') });

      await downloadIcons('set13', sampleData);

      const calls = (mockedAxios.get as ReturnType<typeof vi.fn>).mock.calls;
      const urls = calls.map((c) => c[0] as string);

      expect(urls).toContain(
        'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/ux/tft/champions/tft13_ahri.tft_set13.png'
      );
    });

    it('writes downloaded images to local paths', async () => {
      const fakeBuffer = Buffer.from('fake-image-data');
      mockedAxios.get = vi.fn().mockResolvedValue({ data: fakeBuffer });

      await downloadIcons('set13', sampleData);

      expect(mockedFs.writeFile).toHaveBeenCalledTimes(3);
      const writtenPaths = (mockedFs.writeFile as ReturnType<typeof vi.fn>).mock.calls.map(
        (c) => normPath(c[0] as string)
      );
      expect(writtenPaths[0]).toContain('/cache/images/set13/');
    });

    it('skips icons that already exist on disk', async () => {
      mockedAxios.get = vi.fn().mockResolvedValue({ data: Buffer.from('fake-image') });

      // First icon already exists, others don't
      mockedFs.access = vi
        .fn()
        .mockResolvedValueOnce(undefined) // Ahri icon exists
        .mockRejectedValue({ code: 'ENOENT' }); // others don't exist

      await downloadIcons('set13', sampleData);

      // Only 2 downloads (Lux, Jinx) — Ahri skipped
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });

    it('continues downloading remaining icons if one fails', async () => {
      mockedAxios.get = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network error')) // Ahri fails
        .mockResolvedValue({ data: Buffer.from('fake-image') }); // others succeed

      // Should not throw
      await expect(downloadIcons('set13', sampleData)).resolves.not.toThrow();

      // Still tried all 3
      expect(mockedAxios.get).toHaveBeenCalledTimes(3);
      // Wrote 2 successfully (Lux, Jinx)
      expect(mockedFs.writeFile).toHaveBeenCalledTimes(2);
    });

    it('handles empty data arrays gracefully (no-op)', async () => {
      mockedAxios.get = vi.fn().mockResolvedValue({ data: Buffer.from('fake-image') });

      await downloadIcons('set13', { champions: [], traits: [], items: [], augments: [] });

      expect(mockedAxios.get).not.toHaveBeenCalled();
      expect(mockedFs.writeFile).not.toHaveBeenCalled();
    });

    it('deduplicates icon paths before downloading', async () => {
      mockedAxios.get = vi.fn().mockResolvedValue({ data: Buffer.from('fake-image') });

      const duplicateData = {
        champions: [
          { apiName: 'TFT13_Ahri', name: 'Ahri', cost: 4, traits: [], icon: 'ASSETS/same_icon.png' },
          { apiName: 'TFT13_Lux', name: 'Lux', cost: 3, traits: [], icon: 'ASSETS/same_icon.png' },
        ],
        traits: [],
        items: [],
        augments: [],
      };

      await downloadIcons('set13', duplicateData);

      // Only 1 unique icon path, so only 1 download
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });
  });
});

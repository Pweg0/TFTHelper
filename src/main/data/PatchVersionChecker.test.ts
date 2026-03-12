import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock axios before importing the module under test
vi.mock('axios');

// Mock electron-store
vi.mock('electron-store', () => {
  const MockStore = vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    set: vi.fn(),
  }));
  return { default: MockStore };
});

import axios from 'axios';
import { getLatestPatchVersion, isCacheStale } from './PatchVersionChecker';

const mockedAxios = vi.mocked(axios);

describe('PatchVersionChecker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getLatestPatchVersion', () => {
    it('returns the first version from the DDragon versions array', async () => {
      mockedAxios.get = vi.fn().mockResolvedValue({
        data: ['16.5.1', '16.4.1', '16.3.1'],
      });

      const version = await getLatestPatchVersion();
      expect(version).toBe('16.5.1');
    });

    it('calls the correct DDragon versions endpoint', async () => {
      mockedAxios.get = vi.fn().mockResolvedValue({
        data: ['16.5.1', '16.4.1'],
      });

      await getLatestPatchVersion();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://ddragon.leagueoflegends.com/api/versions.json',
        expect.objectContaining({ timeout: 5000 })
      );
    });

    it('throws when axios request fails (network error)', async () => {
      mockedAxios.get = vi.fn().mockRejectedValue(new Error('Network Error'));

      await expect(getLatestPatchVersion()).rejects.toThrow('Network Error');
    });
  });

  describe('isCacheStale', () => {
    it('returns true when no cached version exists (undefined)', async () => {
      mockedAxios.get = vi.fn().mockResolvedValue({ data: ['16.5.1', '16.4.1'] });

      const mockStore = {
        get: vi.fn().mockReturnValue(undefined),
        set: vi.fn(),
      };

      const result = await isCacheStale(mockStore as any);
      expect(result).toBe(true);
    });

    it('returns true when no cached version exists (empty string)', async () => {
      mockedAxios.get = vi.fn().mockResolvedValue({ data: ['16.5.1', '16.4.1'] });

      const mockStore = {
        get: vi.fn().mockReturnValue(''),
        set: vi.fn(),
      };

      const result = await isCacheStale(mockStore as any);
      expect(result).toBe(true);
    });

    it('returns true when cached version differs from live version', async () => {
      mockedAxios.get = vi.fn().mockResolvedValue({ data: ['16.5.1', '16.4.1'] });

      const mockStore = {
        get: vi.fn().mockReturnValue('16.4.1'),
        set: vi.fn(),
      };

      const result = await isCacheStale(mockStore as any);
      expect(result).toBe(true);
    });

    it('returns false when cached version matches live version', async () => {
      mockedAxios.get = vi.fn().mockResolvedValue({ data: ['16.5.1', '16.4.1'] });

      const mockStore = {
        get: vi.fn().mockReturnValue('16.5.1'),
        set: vi.fn(),
      };

      const result = await isCacheStale(mockStore as any);
      expect(result).toBe(false);
    });
  });
});

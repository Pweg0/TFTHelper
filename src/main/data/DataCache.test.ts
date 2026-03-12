import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { writeJsonFile, readJsonFile, getStaticDataPath, getMetaCachePath } from './DataCache';

// Mock electron's app module since it's unavailable in test environment
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('/mock/userData'),
  },
}));

describe('DataCache file I/O', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tft-datacache-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('writeJsonFile creates file and parent directories', async () => {
    const filePath = path.join(tmpDir, 'nested', 'dir', 'data.json');
    const data = { hello: 'world', count: 42 };

    await writeJsonFile(filePath, data);

    const raw = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed).toEqual(data);
  });

  it('readJsonFile reads back what was written', async () => {
    const filePath = path.join(tmpDir, 'test.json');
    const data = { champions: ['Ahri', 'Syndra'], patch: '14.1' };

    await writeJsonFile(filePath, data);
    const result = await readJsonFile<typeof data>(filePath);

    expect(result).toEqual(data);
  });

  it('readJsonFile returns null for non-existent file (no throw)', async () => {
    const filePath = path.join(tmpDir, 'nonexistent.json');
    const result = await readJsonFile<{ test: string }>(filePath);
    expect(result).toBeNull();
  });

  it('writeJsonFile overwrites existing file', async () => {
    const filePath = path.join(tmpDir, 'overwrite.json');
    await writeJsonFile(filePath, { version: 1 });
    await writeJsonFile(filePath, { version: 2, updated: true });

    const result = await readJsonFile<{ version: number; updated?: boolean }>(filePath);
    expect(result?.version).toBe(2);
    expect(result?.updated).toBe(true);
  });
});

describe('DataCache path helpers', () => {
  it('getStaticDataPath returns correct AppData path pattern', async () => {
    const result = getStaticDataPath('set13', 'en_us');
    expect(result).toContain('static');
    expect(result).toContain('set13');
    expect(result).toContain('en_us.json');
  });

  it('getMetaCachePath returns correct AppData path pattern', async () => {
    const result = getMetaCachePath();
    expect(result).toContain('meta');
    expect(result).toContain('meta_cache.json');
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted so the mock reference is available in the vi.mock factory (which is hoisted)
const { mockGetSources } = vi.hoisted(() => {
  return { mockGetSources: vi.fn() };
});

vi.mock('electron', () => ({
  desktopCapturer: {
    getSources: mockGetSources,
  },
}));

import { ScreenCapturer } from './ScreenCapturer';

function makeMockSource(name: string, width = 1920, height = 1080) {
  return {
    name,
    thumbnail: {
      toPNG: () => Buffer.from('fakepng'),
      getSize: () => ({ width, height }),
    },
  };
}

describe('ScreenCapturer', () => {
  let capturer: ScreenCapturer;

  beforeEach(() => {
    capturer = new ScreenCapturer();
    mockGetSources.mockReset();
  });

  it('calls getSources with correct options', async () => {
    mockGetSources.mockResolvedValue([]);

    await capturer.capture('League of Legends (TM) Client');

    expect(mockGetSources).toHaveBeenCalledOnce();
    expect(mockGetSources).toHaveBeenCalledWith({
      types: ['window'],
      thumbnailSize: { width: 1920, height: 1080 },
    });
  });

  it('returns null when no matching window is found', async () => {
    mockGetSources.mockResolvedValue([
      makeMockSource('Some Other App'),
      makeMockSource('Discord'),
    ]);

    const result = await capturer.capture('League of Legends (TM) Client');

    expect(result).toBeNull();
  });

  it('returns png buffer and dimensions on exact title match', async () => {
    const fakeSource = makeMockSource('League of Legends (TM) Client', 1920, 1080);
    mockGetSources.mockResolvedValue([fakeSource]);

    const result = await capturer.capture('League of Legends (TM) Client');

    expect(result).not.toBeNull();
    expect(result!.png).toBeInstanceOf(Buffer);
    expect(result!.width).toBe(1920);
    expect(result!.height).toBe(1080);
  });

  it('returns correct dimensions for DPI-scaled capture (e.g. 125% = 2400x1350)', async () => {
    const scaledSource = makeMockSource('League of Legends (TM) Client', 2400, 1350);
    mockGetSources.mockResolvedValue([scaledSource]);

    const result = await capturer.capture('League of Legends (TM) Client');

    expect(result).not.toBeNull();
    expect(result!.width).toBe(2400);
    expect(result!.height).toBe(1350);
  });

  it('falls back to substring match when exact title not found', async () => {
    // Simulate a locale variant title
    const fallbackSource = makeMockSource('League of Legends Client');
    mockGetSources.mockResolvedValue([fallbackSource]);

    const result = await capturer.capture('League of Legends (TM) Client');

    expect(result).not.toBeNull();
    expect(result!.png).toBeInstanceOf(Buffer);
  });

  it('returns null when neither exact nor fallback match found', async () => {
    mockGetSources.mockResolvedValue([
      makeMockSource('Notepad'),
      makeMockSource('Chrome'),
    ]);

    const result = await capturer.capture('League of Legends (TM) Client');

    expect(result).toBeNull();
  });
});

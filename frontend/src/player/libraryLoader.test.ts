import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { signLibraryLoader } from './libraryLoader';
import type { SignClip, SignLibraryIndex } from '../lib/clipTypes';

describe('SignLibraryLoader', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    signLibraryLoader.clearCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('loads and caches sign library index', async () => {
    const mockIndex: SignLibraryIndex = {
      version: '1.0.0',
      sign_language: 'ASL',
      total_signs: 2,
      real_signs: 0,
      synthetic_signs: 2,
      signs: {
        hello: {
          id: 'hello',
          gloss: 'HELLO',
          category: 'social',
          synthetic: true,
          file: 'signs/hello.json',
          fps: 30,
          duration_ms: 800,
        },
      },
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockIndex,
    });

    const index = await signLibraryLoader.loadIndex();
    expect(index).toEqual(mockIndex);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Second call should return cached index without re-fetching
    const cachedIndex = await signLibraryLoader.loadIndex();
    expect(cachedIndex).toEqual(mockIndex);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('loads and caches individual sign clips', async () => {
    const mockClip: SignClip = {
      id: 'doctor',
      gloss: 'DOCTOR',
      fps: 30,
      synthetic: true,
      frames: [{ pose: [[0, 0, 0]], left_hand: null, right_hand: null }],
      meta: { duration_ms: 500, recorded_at: '2026-09-19T00:00:00Z' },
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockClip,
    });

    const clip = await signLibraryLoader.getClip('doctor');
    expect(clip).toEqual(mockClip);
    expect(signLibraryLoader.hasClip('doctor')).toBe(true);

    // Cache hit
    const cachedClip = await signLibraryLoader.getClip('doctor');
    expect(cachedClip).toEqual(mockClip);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

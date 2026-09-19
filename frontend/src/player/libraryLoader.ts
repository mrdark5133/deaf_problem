/**
 * Sign Library loader with local in-memory caching and pre-fetching.
 */

import type { SignClip, SignLibraryIndex } from '../lib/clipTypes';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

class SignLibraryLoader {
  private indexCache: SignLibraryIndex | null = null;
  private clipCache: Map<string, SignClip> = new Map();
  private fetchPromises: Map<string, Promise<SignClip | null>> = new Map();

  /**
   * Loads the sign library index.
   */
  public async loadIndex(): Promise<SignLibraryIndex | null> {
    if (this.indexCache) return this.indexCache;

    try {
      const res = await fetch(`${API_BASE}/data/signs/index.json`);
      if (!res.ok) {
        console.warn(`Failed to fetch sign index: HTTP ${res.status}`);
        return null;
      }
      const data = (await res.json()) as SignLibraryIndex;
      this.indexCache = data;
      return data;
    } catch (err) {
      console.error('Error fetching sign library index:', err);
      return null;
    }
  }

  /**
   * Fetches a single clip by its clip ID with in-memory caching.
   */
  public async getClip(clipId: string): Promise<SignClip | null> {
    const cleanId = clipId.toLowerCase().trim();
    if (this.clipCache.has(cleanId)) {
      return this.clipCache.get(cleanId)!;
    }

    if (this.fetchPromises.has(cleanId)) {
      return this.fetchPromises.get(cleanId)!;
    }

    const fetchPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE}/data/signs/${cleanId}.json`);
        if (!res.ok) {
          console.warn(`Sign clip '${cleanId}' not found (HTTP ${res.status})`);
          return null;
        }
        const clip = (await res.json()) as SignClip;
        this.clipCache.set(cleanId, clip);
        return clip;
      } catch (err) {
        console.error(`Error loading sign clip '${cleanId}':`, err);
        return null;
      } finally {
        this.fetchPromises.delete(cleanId);
      }
    })();

    this.fetchPromises.set(cleanId, fetchPromise);
    return fetchPromise;
  }

  /**
   * Pre-fetches a list of clips concurrently.
   */
  public async preloadClips(clipIds: string[]): Promise<void> {
    await Promise.all(clipIds.map((id) => this.getClip(id)));
  }

  /**
   * Cache management.
   */
  public hasClip(clipId: string): boolean {
    return this.clipCache.has(clipId.toLowerCase().trim());
  }

  public clearCache(): void {
    this.indexCache = null;
    this.clipCache.clear();
    this.fetchPromises.clear();
  }
}

export const signLibraryLoader = new SignLibraryLoader();

/**
 * TranslationOrdering — ordering guard + backpressure for the translation pipeline.
 *
 * Ordering guard:
 *  - Tracks the highest-accepted seq.
 *  - Responses with seq <= lastAcceptedSeq are dropped (stale or duplicate).
 *
 * Backpressure:
 *  - Estimates audio lag from queued clip duration.
 *  - If lag > LAG_SPEEDUP_THRESHOLD_MS (4000), recommends speed 1.5×.
 *  - If lag <= LAG_NORMAL_THRESHOLD_MS (1000), recommends speed 1.0×.
 *  - Caller is responsible for actually calling setSpeed().
 */

import type { GlossToken } from './types';
import type { ClipQueueItem } from '../player/SignPlayer';
import type { SignClip } from './clipTypes';

// ─── Constants ────────────────────────────────────────────────────────────────

export const LAG_SPEEDUP_THRESHOLD_MS = 4000;
export const LAG_NORMAL_THRESHOLD_MS = 1000;
export const FINGERSPELL_LETTER_MS = 300; // estimated ms per letter at 1× speed

// ─── Ordering guard ───────────────────────────────────────────────────────────

export class TranslationOrdering {
  private lastAcceptedSeq = 0;

  /**
   * Returns true if this response should be processed; false if stale/duplicate.
   * Updates internal state if accepted.
   */
  accept(seq: number): boolean {
    if (seq <= this.lastAcceptedSeq) return false;
    this.lastAcceptedSeq = seq;
    return true;
  }

  get lastSeq(): number {
    return this.lastAcceptedSeq;
  }

  reset(): void {
    this.lastAcceptedSeq = 0;
  }
}

// ─── Token → ClipQueueItem expansion ─────────────────────────────────────────

/**
 * Expands a GlossToken list into ClipQueueItems using the resolved clip map.
 * Fingerspell tokens expand to one item per letter.
 * Missing clips are silently skipped.
 */
export function expandTokensToQueue(
  tokens: GlossToken[],
  clipMap: Map<string, SignClip>
): ClipQueueItem[] {
  const items: ClipQueueItem[] = [];

  tokens.forEach((token, tokenIndex) => {
    const clipIds =
      token.kind === 'fingerspell' && token.letters
        ? token.letters.map((l) => `fs_${l.toLowerCase()}`)
        : [token.gloss.toLowerCase().replace(/[^a-z0-9-]/g, '-')];

    const resolvedIds = clipIds.filter((id) => clipMap.has(id));
    if (resolvedIds.length === 0) return;

    resolvedIds.forEach((id, i) => {
      const clip = clipMap.get(id)!;
      items.push({
        clipId: id,
        clip,
        tokenIndex,
        gloss:
          token.kind === 'fingerspell'
            ? `FS:${id.replace('fs_', '').toUpperCase()}`
            : token.gloss.toUpperCase(),
        isTokenStart: i === 0,
        isTokenEnd: i === resolvedIds.length - 1,
      });
    });
  });

  return items;
}

// ─── Backpressure estimator ────────────────────────────────────────────────────

/**
 * Estimates remaining playback lag in milliseconds from a queue of ClipQueueItems.
 * Uses clip.meta.duration_ms / speed as the per-item estimate.
 */
export function estimateLagMs(items: ClipQueueItem[], speed: number): number {
  const safeSpeed = Math.max(0.1, speed);
  return items.reduce((total, item) => {
    const durationMs = item.clip.meta.duration_ms;
    return total + durationMs / safeSpeed;
  }, 0);
}

/**
 * Returns the recommended speed given estimated lag:
 *  - lag > LAG_SPEEDUP_THRESHOLD_MS → 1.5 (maximum speed)
 *  - lag <= LAG_NORMAL_THRESHOLD_MS → 1.0 (normal speed)
 *  - In between → keep current speed (hysteresis zone)
 */
export function recommendedSpeed(lagMs: number, currentSpeed: number): number {
  if (lagMs > LAG_SPEEDUP_THRESHOLD_MS) return 1.5;
  if (lagMs <= LAG_NORMAL_THRESHOLD_MS) return 1.0;
  return currentSpeed; // hysteresis: keep current speed in the middle band
}

// ─── Latency tracker ─────────────────────────────────────────────────────────

export interface LatencyEntry {
  seq: number;
  sentAt: number;
  firstTokenPlayedAt: number;
  roundtripMs: number;
}

export class LatencyTracker {
  private entries: LatencyEntry[] = [];

  record(seq: number, sentAt: number, firstTokenPlayedAt: number): void {
    this.entries.push({
      seq,
      sentAt,
      firstTokenPlayedAt,
      roundtripMs: firstTokenPlayedAt - sentAt,
    });
    // Keep only last 100 entries
    if (this.entries.length > 100) this.entries.shift();
  }

  /** p50 (median) latency in ms. */
  get p50(): number {
    return this.percentile(50);
  }

  /** p95 latency in ms. */
  get p95(): number {
    return this.percentile(95);
  }

  get count(): number {
    return this.entries.length;
  }

  private percentile(p: number): number {
    if (this.entries.length === 0) return 0;
    const sorted = [...this.entries].map((e) => e.roundtripMs).sort((a, b) => a - b);
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return Math.round(sorted[Math.max(0, idx)]);
  }
}

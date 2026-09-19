/**
 * TranslationOrdering tests.
 *
 * Covers:
 *  - Ordering guard: accept / drop
 *  - expandTokensToQueue: gloss + fingerspell expansion
 *  - estimateLagMs + recommendedSpeed (backpressure)
 *  - LatencyTracker: p50 / p95
 *  - 20-sentence rapid-fire integration test: correct ordering, no duplicates
 */

import { describe, it, expect } from 'vitest';
import {
  TranslationOrdering,
  LatencyTracker,
  expandTokensToQueue,
  estimateLagMs,
  recommendedSpeed,
  LAG_SPEEDUP_THRESHOLD_MS,
  LAG_NORMAL_THRESHOLD_MS,
} from './translationOrdering';
import type { GlossToken } from './types';
import type { SignClip } from './clipTypes';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeClip(id: string, duration_ms = 800): SignClip {
  return {
    id,
    gloss: id.toUpperCase(),
    fps: 30,
    synthetic: true,
    frames: [{ pose: [], left_hand: null, right_hand: null }],
    meta: { duration_ms, recorded_at: '2026-01-01T00:00:00Z' },
  };
}

function makeGlossToken(gloss: string): GlossToken {
  return { gloss, kind: 'sign' };
}

function makeFingerspellToken(gloss: string, letters: string[]): GlossToken {
  return { gloss, kind: 'fingerspell', letters };
}

// ─── TranslationOrdering (ordering guard) ─────────────────────────────────────

describe('TranslationOrdering', () => {
  it('accepts the first response', () => {
    const guard = new TranslationOrdering();
    expect(guard.accept(1)).toBe(true);
  });

  it('accepts strictly increasing seq', () => {
    const guard = new TranslationOrdering();
    expect(guard.accept(1)).toBe(true);
    expect(guard.accept(2)).toBe(true);
    expect(guard.accept(5)).toBe(true);
  });

  it('drops seq equal to last accepted', () => {
    const guard = new TranslationOrdering();
    guard.accept(3);
    expect(guard.accept(3)).toBe(false);
  });

  it('drops seq less than last accepted (stale / out-of-order)', () => {
    const guard = new TranslationOrdering();
    guard.accept(5);
    expect(guard.accept(4)).toBe(false);
    expect(guard.accept(1)).toBe(false);
  });

  it('tracks lastSeq correctly', () => {
    const guard = new TranslationOrdering();
    guard.accept(3);
    guard.accept(7);
    guard.accept(4); // dropped
    expect(guard.lastSeq).toBe(7);
  });

  it('reset clears state', () => {
    const guard = new TranslationOrdering();
    guard.accept(10);
    guard.reset();
    expect(guard.accept(1)).toBe(true); // should work again from 0
  });
});

// ─── expandTokensToQueue ──────────────────────────────────────────────────────

describe('expandTokensToQueue', () => {
  it('expands gloss tokens to single queue items', () => {
    const clipMap = new Map([['doctor', makeClip('doctor')]]);
    const tokens: GlossToken[] = [makeGlossToken('DOCTOR')];
    const items = expandTokensToQueue(tokens, clipMap);
    expect(items).toHaveLength(1);
    expect(items[0].clipId).toBe('doctor');
    expect(items[0].gloss).toBe('DOCTOR');
    expect(items[0].isTokenStart).toBe(true);
    expect(items[0].isTokenEnd).toBe(true);
  });

  it('expands fingerspell token to one item per letter', () => {
    const clipMap = new Map([
      ['fs_j', makeClip('fs_j')],
      ['fs_o', makeClip('fs_o')],
      ['fs_h', makeClip('fs_h')],
      ['fs_n', makeClip('fs_n')],
    ]);
    const tokens: GlossToken[] = [makeFingerspellToken('JOHN', ['J', 'O', 'H', 'N'])];
    const items = expandTokensToQueue(tokens, clipMap);
    expect(items).toHaveLength(4);
    expect(items[0].clipId).toBe('fs_j');
    expect(items[0].gloss).toBe('FS:J');
    expect(items[0].isTokenStart).toBe(true);
    expect(items[0].isTokenEnd).toBe(false);
    expect(items[3].isTokenEnd).toBe(true);
    // All share the same tokenIndex
    const idx = items[0].tokenIndex;
    expect(items.every((item) => item.tokenIndex === idx)).toBe(true);
  });

  it('skips tokens whose clip is not in the map', () => {
    const clipMap = new Map([['hello', makeClip('hello')]]);
    const tokens: GlossToken[] = [makeGlossToken('HELLO'), makeGlossToken('WORLD')];
    const items = expandTokensToQueue(tokens, clipMap);
    expect(items).toHaveLength(1);
    expect(items[0].clipId).toBe('hello');
  });

  it('assigns sequential tokenIndex per token', () => {
    const clipMap = new Map([
      ['where', makeClip('where')],
      ['doctor', makeClip('doctor')],
    ]);
    const tokens: GlossToken[] = [makeGlossToken('WHERE'), makeGlossToken('DOCTOR')];
    const items = expandTokensToQueue(tokens, clipMap);
    expect(items[0].tokenIndex).toBe(0);
    expect(items[1].tokenIndex).toBe(1);
  });
});

// ─── Backpressure (estimateLagMs + recommendedSpeed) ─────────────────────────

describe('Backpressure', () => {
  it('estimates lag as sum of clip durations / speed', () => {
    const clipMap = new Map([
      ['a', makeClip('a', 1000)],
      ['b', makeClip('b', 500)],
    ]);
    const items = expandTokensToQueue(
      [makeGlossToken('A'), makeGlossToken('B')],
      clipMap
    );
    expect(estimateLagMs(items, 1.0)).toBeCloseTo(1500);
    expect(estimateLagMs(items, 1.5)).toBeCloseTo(1000);
  });

  it('recommendedSpeed returns 1.5 above threshold', () => {
    expect(recommendedSpeed(LAG_SPEEDUP_THRESHOLD_MS + 1, 1.0)).toBe(1.5);
  });

  it('recommendedSpeed returns 1.0 at or below normal threshold', () => {
    expect(recommendedSpeed(LAG_NORMAL_THRESHOLD_MS, 1.5)).toBe(1.0);
    expect(recommendedSpeed(0, 1.5)).toBe(1.0);
  });

  it('recommendedSpeed keeps current speed in the hysteresis band', () => {
    const midLag = (LAG_SPEEDUP_THRESHOLD_MS + LAG_NORMAL_THRESHOLD_MS) / 2;
    expect(recommendedSpeed(midLag, 1.2)).toBe(1.2); // unchanged
  });
});

// ─── LatencyTracker ───────────────────────────────────────────────────────────

describe('LatencyTracker', () => {
  it('returns 0 when no samples', () => {
    const tracker = new LatencyTracker();
    expect(tracker.p50).toBe(0);
    expect(tracker.p95).toBe(0);
  });

  it('calculates p50 correctly for sorted samples', () => {
    const tracker = new LatencyTracker();
    const latencies = [100, 200, 300, 400, 500];
    const t0 = performance.now();
    latencies.forEach((ms, i) => tracker.record(i + 1, t0, t0 + ms));
    expect(tracker.p50).toBe(300); // median of [100,200,300,400,500]
  });

  it('calculates p95 correctly', () => {
    const tracker = new LatencyTracker();
    const t0 = performance.now();
    for (let i = 0; i < 20; i++) {
      tracker.record(i + 1, t0, t0 + (i + 1) * 50); // 50, 100, ... 1000ms
    }
    // p95 of 20 samples = ceil(19) = index 18 → 950ms
    expect(tracker.p95).toBe(950);
  });
});

// ─── 20-sentence rapid-fire ordering test ─────────────────────────────────────

describe('20-sentence rapid-fire ordering', () => {
  it('accepts only strictly increasing seq and produces no duplicates', () => {
    const guard = new TranslationOrdering();
    const accepted: number[] = [];

    // Simulate 20 sentences being processed out of order (network races)
    const sentences = Array.from({ length: 20 }, (_, i) => i + 1); // seq 1..20
    // Shuffle to simulate out-of-order arrival
    const shuffled = [...sentences].sort(() => Math.random() - 0.5);

    for (const seq of shuffled) {
      if (guard.accept(seq)) {
        accepted.push(seq);
      }
    }

    // Each accepted seq is unique
    expect(new Set(accepted).size).toBe(accepted.length);
    // Accepted seqs are strictly increasing
    for (let i = 1; i < accepted.length; i++) {
      expect(accepted[i]).toBeGreaterThan(accepted[i - 1]);
    }
    // The maximum accepted seq equals the max in the shuffled list
    const maxAccepted = Math.max(...accepted);
    expect(maxAccepted).toBe(guard.lastSeq);
  });

  it('accepts all 20 when delivered in order', () => {
    const guard = new TranslationOrdering();
    const accepted: number[] = [];
    for (let seq = 1; seq <= 20; seq++) {
      if (guard.accept(seq)) accepted.push(seq);
    }
    expect(accepted).toHaveLength(20);
    expect(accepted).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  });

  it('accepts only the highest seq when all arrive simultaneously', () => {
    // Simulate batch arrival where seq 20 is processed first (most recent)
    const guard = new TranslationOrdering();
    guard.accept(20); // highest seq first
    const accepted: number[] = [20];
    for (let seq = 1; seq <= 19; seq++) {
      if (guard.accept(seq)) accepted.push(seq); // all stale
    }
    expect(accepted).toEqual([20]); // only 20 was accepted
  });
});

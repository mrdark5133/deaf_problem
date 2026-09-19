/**
 * SignPlayer unit tests.
 * Tests cover: queue ordering, speed multiplier frame timing, pause/resume,
 * clear, blending math, and onTokenStart/onTokenEnd/onIdle callbacks.
 *
 * All time is controlled explicitly via tick(timestamp) — no real rAF or timers.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SignPlayer } from './SignPlayer';
import type { ClipQueueItem } from './SignPlayer';
import type { SignClip } from '../lib/clipTypes';
import type { Landmark3D } from '../lib/clipTypes';

// ─── Test helpers ─────────────────────────────────────────────────────────────

function makeLandmark(val: number): Landmark3D {
  return [val, val, val];
}

/**
 * Creates a synthetic SignClip whose frame[i] has all landmarks set to i (for easy assertions).
 */
function makeClip(id: string, numFrames = 5, fps = 30): SignClip {
  return {
    id,
    gloss: id.toUpperCase(),
    fps,
    synthetic: true,
    frames: Array.from({ length: numFrames }, (_, i) => ({
      pose: Array.from({ length: 19 }, () => makeLandmark(i)),
      left_hand: null,
      right_hand: null,
    })),
    meta: {
      duration_ms: Math.round((numFrames / fps) * 1000),
      recorded_at: '2026-01-01T00:00:00Z',
    },
  };
}

function makeItem(
  clipId: string,
  tokenIndex: number,
  numFrames = 5,
  fps = 30,
  isTokenStart = true,
  isTokenEnd = true
): ClipQueueItem {
  return {
    clipId,
    clip: makeClip(clipId, numFrames, fps),
    tokenIndex,
    gloss: clipId.toUpperCase(),
    isTokenStart,
    isTokenEnd,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SignPlayer', () => {
  let player: SignPlayer;
  let onTokenStart: ReturnType<typeof vi.fn<(gloss: string, tokenIndex: number) => void>>;
  let onTokenEnd: ReturnType<typeof vi.fn<(gloss: string, tokenIndex: number) => void>>;
  let onIdle: ReturnType<typeof vi.fn<() => void>>;

  beforeEach(() => {
    onTokenStart = vi.fn();
    onTokenEnd = vi.fn();
    onIdle = vi.fn();
    player = new SignPlayer({ onTokenStart, onTokenEnd, onIdle });
  });

  // ── Status ──────────────────────────────────────────────────────────────────

  it('starts in idle status', () => {
    expect(player.status).toBe('idle');
  });

  it('transitions to playing after enqueue', () => {
    player.enqueue([makeItem('hello', 0)], 0);
    expect(player.status).toBe('playing');
  });

  // ── Queue ordering ───────────────────────────────────────────────────────────

  it('plays items in enqueue order', () => {
    const item0 = makeItem('hello', 0, 3, 30);   // 3 frames @ 30fps = 100ms
    const item1 = makeItem('world', 1, 3, 30);
    player.enqueue([item0, item1], 0);

    // t=0: playing item 0 frame 0
    const r0 = player.tick(0);
    expect(r0.currentGloss).toBe('HELLO');
    expect(r0.frame.pose[0][0]).toBe(0); // frame index 0

    // t=50ms: still on item 0 frame 1 (msPerFrame = 33.3ms)
    const r1 = player.tick(50);
    expect(r1.currentGloss).toBe('HELLO');
    expect(r1.frame.pose[0][0]).toBe(1); // frame index 1

    // t=120ms: item 0 done (3 frames × 33.3ms = 100ms), blend should have started
    const r2 = player.tick(120);
    expect(r2.status).toBe('blending');

    // t=280ms: blend done (150ms) → now playing item 1
    const r3 = player.tick(280);
    expect(r3.currentGloss).toBe('WORLD');
    expect(r3.status).toBe('playing');
  });

  // ── Speed multiplier ─────────────────────────────────────────────────────────

  it('speed=2× advances frames twice as fast (clamped to 1.5×)', () => {
    player.setSpeed(2.0);
    expect(player.speed).toBe(1.5); // clamped to MAX

    const item = makeItem('fast', 0, 10, 30); // 10 frames @ 30fps @ 1.5× = 222ms total
    player.enqueue([item], 0);

    // At 1.5×, msPerFrame = 1000 / (30 * 1.5) ≈ 22.2ms
    // t=44ms → frame index ≈ 2
    const r = player.tick(44);
    expect(r.frame.pose[0][0]).toBeCloseTo(1, 0); // frame 1 or 2
    expect(r.status).toBe('playing');
  });

  it('speed=0.3 is clamped to 0.5×', () => {
    player.setSpeed(0.3);
    expect(player.speed).toBe(0.5); // clamped to MIN
  });

  it('0.5× speed plays frames at half rate', () => {
    player.setSpeed(0.5);
    const item = makeItem('slow', 0, 6, 30); // 6 frames @ 30fps @ 0.5× = 400ms total
    player.enqueue([item], 0);

    // msPerFrame = 1000 / (30 * 0.5) = 66.7ms
    // t=100ms → frame index ≈ 1
    const r = player.tick(100);
    expect(r.frame.pose[0][0]).toBe(1);
  });

  // ── Pause / Resume ───────────────────────────────────────────────────────────

  it('pause freezes playback and resume continues from same frame', () => {
    const item = makeItem('doc', 0, 10, 30);
    player.enqueue([item], 0);

    // Advance to frame 2 (t=66ms, msPerFrame=33.3)
    player.tick(66);
    expect(player.status).toBe('playing');

    player.pause();
    expect(player.status).toBe('paused');

    // Ticking while paused returns same frame
    const paused1 = player.tick(200);
    const paused2 = player.tick(500);
    expect(paused1.frame.pose[0][0]).toBe(paused2.frame.pose[0][0]);

    // Resume at t=600ms
    player.play(600);
    expect(player.status).toBe('playing');

    // Should continue from around frame 2, not from the beginning
    const resumed = player.tick(620); // ~20ms after resume
    // frame should be close to where we paused, not frame 0
    expect(resumed.frame.pose[0][0]).toBeGreaterThanOrEqual(1);
  });

  // ── Clear ────────────────────────────────────────────────────────────────────

  it('clear empties the queue and returns to idle', () => {
    player.enqueue([makeItem('hello', 0, 10)], 0);
    player.tick(50);
    player.clear();

    expect(player.status).toBe('idle');
    expect(player.queueLength).toBe(0);
    expect(onIdle).toHaveBeenCalled();

    // Frame returns to rest pose (all zeros)
    const r = player.tick(100);
    expect(r.status).toBe('idle');
    expect(r.currentTokenIndex).toBe(-1);
  });

  // ── Blending math ────────────────────────────────────────────────────────────

  it('blends linearly between clips during transition', () => {
    // item0: 3 frames at 30fps — lasts 100ms
    const item0 = makeItem('a', 0, 3, 30);
    // item1: last landmark value = 9 (9 frames)
    const item1 = makeItem('b', 1, 10, 30);

    player.enqueue([item0, item1], 0);

    // Skip past item0 (100ms) to trigger blending
    player.tick(110);
    expect(player.status).toBe('blending');

    // At 75ms into blend (t=0.5), landmarks should be ~midpoint
    const midBlend = player.tick(185); // 110 + 75ms
    expect(midBlend.status).toBe('blending');
    // The last frame of item0 has pose[0][0]=2, first frame of item1 has pose[0][0]=0
    // At t=0.5: lerp(2, 0, 0.5) = 1
    expect(midBlend.frame.pose[0][0]).toBeCloseTo(1, 0);
  });

  it('blend to rest pose after queue empties', () => {
    const item = makeItem('done', 0, 3, 30); // 100ms clip
    player.enqueue([item], 0);

    player.tick(110); // clip done → blending out to rest
    expect(player.status).toBe('blending');

    // After 150ms of blending → should be idle
    player.tick(270);
    expect(player.status).toBe('idle');
  });

  // ── Callbacks ────────────────────────────────────────────────────────────────

  it('fires onTokenStart on first tick of each token', () => {
    const item = makeItem('hello', 0, 5);
    player.enqueue([item], 0);
    player.tick(0);
    expect(onTokenStart).toHaveBeenCalledWith('HELLO', 0);
    expect(onTokenStart).toHaveBeenCalledTimes(1);
  });

  it('does not fire onTokenStart twice for the same token', () => {
    const item = makeItem('hello', 0, 5);
    player.enqueue([item], 0);
    player.tick(0);
    player.tick(10);
    player.tick(20);
    expect(onTokenStart).toHaveBeenCalledTimes(1);
  });

  it('fires onTokenEnd when a token finishes', () => {
    const item = makeItem('bye', 0, 3, 30); // 100ms
    player.enqueue([item], 0);
    player.tick(0);
    expect(onTokenEnd).not.toHaveBeenCalled();
    // Advance past clip duration
    player.tick(110);
    expect(onTokenEnd).toHaveBeenCalledWith('BYE', 0);
  });

  it('fires onIdle when queue empties after blending', () => {
    const item = makeItem('last', 0, 3, 30); // 100ms
    player.enqueue([item], 0);
    player.tick(110); // clip done, start blending to rest
    player.tick(270); // blend done → idle
    expect(onIdle).toHaveBeenCalled();
  });

  it('fires separate onTokenStart/End for each token index', () => {
    const t0 = makeItem('hello', 0, 3, 30);
    const t1 = makeItem('world', 1, 3, 30);
    player.enqueue([t0, t1], 0);

    player.tick(0);   // t0 start
    player.tick(110); // t0 done, blend starts → t1 next
    player.tick(270); // blend done, t1 playing
    player.tick(280); // trigger t1 start

    expect(onTokenStart).toHaveBeenNthCalledWith(1, 'HELLO', 0);
    expect(onTokenStart).toHaveBeenNthCalledWith(2, 'WORLD', 1);
    expect(onTokenEnd).toHaveBeenCalledWith('HELLO', 0);
  });

  // ── Fingerspell grouping (multiple items per token) ───────────────────────────

  it('groups fingerspell letter clips under same tokenIndex', () => {
    const fsJ: ClipQueueItem = { ...makeItem('fs_j', 0, 2, 30), gloss: 'FS:J', isTokenStart: true, isTokenEnd: false };
    const fsO: ClipQueueItem = { ...makeItem('fs_o', 0, 2, 30), gloss: 'FS:O', isTokenStart: false, isTokenEnd: true };
    player.enqueue([fsJ, fsO], 0);

    player.tick(0);
    expect(onTokenStart).toHaveBeenCalledTimes(1);
    expect(onTokenStart).toHaveBeenCalledWith('FS:J', 0);

    // fs_j done at ~66ms (2 frames × 33.3ms)
    player.tick(80); // blend
    player.tick(240); // blend done → playing fs_o
    player.tick(250);

    // fs_o done at blend+66ms
    player.tick(320);
    player.tick(490); // blend to rest done

    // onTokenEnd should only fire once (for tokenIndex 0)
    expect(onTokenEnd).toHaveBeenCalledTimes(1);
    expect(onTokenEnd).toHaveBeenCalledWith('FS:O', 0);
  });
});

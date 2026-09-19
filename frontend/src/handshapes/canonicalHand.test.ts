/**
 * canonicalHand.test.ts — Rigorous unit tests for Canonical Hand transformations and invariants.
 */

import { describe, it, expect } from 'vitest';
import type { Landmark3D } from '../lib/clipTypes';
import {
  toCanonicalHandFrame,
  computeHandshapeMedian,
  evaluateHandshapeStability,
  mirrorCanonicalHandshape,
  vecNorm,
  vecSub,
} from './canonicalHand';

// Helper to generate a realistic synthetic hand
function createTestHand(origin: [number, number, number] = [0, 0, 0], scale = 1.0): Landmark3D[] {
  const base: Landmark3D[] = [
    [0.0, 0.0, 0.0],       // 0: Wrist
    // Thumb: 1-4
    [0.05, 0.04, 0.01],
    [0.08, 0.08, 0.02],
    [0.10, 0.12, 0.03],
    [0.11, 0.15, 0.04],
    // Index: 5-8
    [0.04, 0.12, 0.0],
    [0.04, 0.16, 0.01],
    [0.04, 0.19, 0.01],
    [0.04, 0.22, 0.02],
    // Middle: 9-12
    [0.0, 0.13, 0.0],
    [0.0, 0.18, 0.01],
    [0.0, 0.22, 0.01],
    [0.0, 0.25, 0.02],
    // Ring: 13-16
    [-0.04, 0.12, 0.0],
    [-0.04, 0.16, 0.01],
    [-0.04, 0.19, 0.01],
    [-0.04, 0.22, 0.02],
    // Pinky: 17-20
    [-0.07, 0.10, 0.0],
    [-0.08, 0.13, 0.01],
    [-0.09, 0.16, 0.01],
    [-0.09, 0.18, 0.02],
  ];

  return base.map((p) => [
    origin[0] + p[0] * scale,
    origin[1] + p[1] * scale,
    (origin[2] || 0) + (p[2] || 0) * scale,
  ]);
}

describe('Canonical Hand Mathematical Invariants', () => {
  const baseHand = createTestHand([0, 0, 0], 1.0);
  const canonicalBase = toCanonicalHandFrame(baseHand, true);

  it('sets wrist joint (0) precisely at origin (0, 0, 0)', () => {
    expect(canonicalBase[0]).toEqual([0, 0, 0]);
  });

  it('aligns middle MCP joint (9) exactly along the positive Y axis (X=0, Z=0, Y=1.0)', () => {
    const p9 = canonicalBase[9];
    expect(p9[0]).toBeCloseTo(0.0, 3);
    expect(p9[1]).toBeCloseTo(1.0, 3);
    expect(p9[2]).toBeCloseTo(0.0, 3);
  });

  it('guarantees translation invariance', () => {
    const translatedHand = createTestHand([15.5, -42.8, 100.2], 1.0);
    const canonicalTranslated = toCanonicalHandFrame(translatedHand, true);

    for (let i = 0; i < 21; i++) {
      expect(canonicalTranslated[i][0]).toBeCloseTo(canonicalBase[i][0], 3);
      expect(canonicalTranslated[i][1]).toBeCloseTo(canonicalBase[i][1], 3);
      expect(canonicalTranslated[i][2]).toBeCloseTo(canonicalBase[i][2], 3);
    }
  });

  it('guarantees scale invariance', () => {
    const scaledHandSmall = createTestHand([0, 0, 0], 0.35);
    const scaledHandLarge = createTestHand([0, 0, 0], 4.80);

    const canSmall = toCanonicalHandFrame(scaledHandSmall, true);
    const canLarge = toCanonicalHandFrame(scaledHandLarge, true);

    for (let i = 0; i < 21; i++) {
      expect(canSmall[i][0]).toBeCloseTo(canonicalBase[i][0], 3);
      expect(canSmall[i][1]).toBeCloseTo(canonicalBase[i][1], 3);
      expect(canSmall[i][2]).toBeCloseTo(canonicalBase[i][2], 3);

      expect(canLarge[i][0]).toBeCloseTo(canonicalBase[i][0], 3);
      expect(canLarge[i][1]).toBeCloseTo(canonicalBase[i][1], 3);
      expect(canLarge[i][2]).toBeCloseTo(canonicalBase[i][2], 3);
    }
  });

  it('guarantees 3D rotation invariance', () => {
    // Rotate base hand 45 degrees around Z axis and 30 degrees around X axis
    const radZ = Math.PI / 4;
    const cosZ = Math.cos(radZ);
    const sinZ = Math.sin(radZ);

    const rotatedHand: Landmark3D[] = baseHand.map((p) => {
      const rx = p[0] * cosZ - p[1] * sinZ;
      const ry = p[0] * sinZ + p[1] * cosZ;
      const rz = p[2] || 0;
      return [rx, ry, rz];
    });

    const canonicalRotated = toCanonicalHandFrame(rotatedHand, true);

    for (let i = 0; i < 21; i++) {
      expect(canonicalRotated[i][0]).toBeCloseTo(canonicalBase[i][0], 2);
      expect(canonicalRotated[i][1]).toBeCloseTo(canonicalBase[i][1], 2);
      expect(canonicalRotated[i][2]).toBeCloseTo(canonicalBase[i][2], 2);
    }
  });

  it('guarantees bilateral mirror symmetry for left hand', () => {
    // Left hand is an x-flipped version of right hand
    const leftHand: Landmark3D[] = baseHand.map((p) => [-p[0], p[1], p[2] || 0]);
    const canonicalLeft = toCanonicalHandFrame(leftHand, false);

    for (let i = 0; i < 21; i++) {
      expect(canonicalLeft[i][0]).toBeCloseTo(canonicalBase[i][0], 3);
      expect(canonicalLeft[i][1]).toBeCloseTo(canonicalBase[i][1], 3);
      expect(canonicalLeft[i][2]).toBeCloseTo(canonicalBase[i][2], 3);
    }
  });

  it('mirrorCanonicalHandshape flips X coordinates and preserves pairwise bone distances', () => {
    const mirrored = mirrorCanonicalHandshape(canonicalBase);

    for (let i = 0; i < 21; i++) {
      expect(mirrored[i][0]).toBeCloseTo(-canonicalBase[i][0], 4);
      expect(mirrored[i][1]).toBeCloseTo(canonicalBase[i][1], 4);
      expect(mirrored[i][2]).toBeCloseTo(canonicalBase[i][2], 4);
    }

    // Check distance between thumb tip (4) and index tip (8) is identical in both
    const distRight = vecNorm(vecSub(canonicalBase[4] as [number, number, number], canonicalBase[8] as [number, number, number]));
    const distLeft = vecNorm(vecSub(mirrored[4] as [number, number, number], mirrored[8] as [number, number, number]));
    expect(distLeft).toBeCloseTo(distRight, 4);
  });
});

describe('Handshape Median and Stability Evaluation', () => {
  const baseHand = createTestHand([0, 0, 0], 1.0);

  it('computes coordinate median rejecting single-frame outlier noise', () => {
    const frame1 = baseHand;
    const frame2 = baseHand;
    const outlierFrame = baseHand.map((p, idx) => (idx === 8 ? [p[0] + 5.0, p[1] + 5.0, p[2]] : p) as Landmark3D);
    const frame4 = baseHand;
    const frame5 = baseHand;

    const median = computeHandshapeMedian([frame1, frame2, outlierFrame, frame4, frame5]);

    // Outlier in frame 3 at index 8 should have zero effect on median
    expect(median[8][0]).toBeCloseTo(baseHand[8][0], 3);
    expect(median[8][1]).toBeCloseTo(baseHand[8][1], 3);
  });

  it('evaluates stability score with GREEN verdict for stable frames', () => {
    const stableFrames: Landmark3D[][] = [];
    for (let f = 0; f < 25; f++) {
      const noisy = baseHand.map((p) => [
        p[0] + (Math.random() - 0.5) * 0.002,
        p[1] + (Math.random() - 0.5) * 0.002,
        (p[2] || 0) + (Math.random() - 0.5) * 0.002,
      ] as Landmark3D);
      stableFrames.push(noisy);
    }

    const result = evaluateHandshapeStability(stableFrames);
    expect(result.verdict).toBe('GREEN');
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.spread).toBeLessThan(0.02);
  });

  it('evaluates stability score with RED verdict for erratic jitter', () => {
    const erraticFrames: Landmark3D[][] = [];
    for (let f = 0; f < 20; f++) {
      const jittery = baseHand.map((p) => [
        p[0] + (Math.random() - 0.5) * 0.25,
        p[1] + (Math.random() - 0.5) * 0.25,
        (p[2] || 0) + (Math.random() - 0.5) * 0.25,
      ] as Landmark3D);
      erraticFrames.push(jittery);
    }

    const result = evaluateHandshapeStability(erraticFrames);
    expect(result.verdict).toBe('RED');
    expect(result.score).toBeLessThan(50);
  });
});

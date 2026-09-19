import { describe, it, expect } from 'vitest';
import { evaluateClipQuality } from './clipQuality';
import type { Landmark3D, SignFrame } from '../lib/clipTypes';

describe('clipQuality', () => {
  const makeDummyHand = (offset = 0): Landmark3D[] => {
    return Array.from({ length: 21 }, (_, i) => [0.1 * i + offset, 0.2 * i, 0]);
  };

  const makeDummyPose = (t = 0): Landmark3D[] => {
    const pose: Landmark3D[] = Array.from({ length: 33 }, () => [0, 0, 0]);
    pose[15] = [0.2 + t * 0.001, 0.4, 0]; // left wrist
    pose[16] = [-0.2 - t * 0.001, 0.4, 0]; // right wrist
    return pose;
  };

  it('returns RED verdict and error for empty frames', () => {
    const res = evaluateClipQuality([]);
    expect(res.verdict).toBe('RED');
    expect(res.overallScore).toBe(0);
    expect(res.issues.length).toBeGreaterThan(0);
  });

  it('evaluates high-quality clip as GREEN with score >= 80', () => {
    const frames: SignFrame[] = Array.from({ length: 45 }, (_, i) => ({
      pose: makeDummyPose(i),
      left_hand: null,
      right_hand: makeDummyHand(0.001 * Math.sin(i)),
    }));

    const res = evaluateClipQuality(frames, 30);
    expect(res.verdict).toBe('GREEN');
    expect(res.overallScore).toBeGreaterThanOrEqual(80);
    expect(res.missingHandRatio).toBe(0);
    expect(res.issues.length).toBe(0);
  });

  it('flags high missing-hand ratio as RED verdict', () => {
    const frames: SignFrame[] = Array.from({ length: 30 }, (_, i) => ({
      pose: makeDummyPose(i),
      left_hand: null,
      right_hand: i < 5 ? makeDummyHand() : null, // 25 out of 30 missing
    }));

    const res = evaluateClipQuality(frames, 30);
    expect(res.verdict).toBe('RED');
    expect(res.missingHandRatio).toBeGreaterThan(0.5);
    expect(res.issues.some((iss) => iss.includes('missing hand'))).toBe(true);
  });

  it('detects high jitter and penalties in score', () => {
    const frames: SignFrame[] = Array.from({ length: 30 }, (_, i) => ({
      pose: makeDummyPose(i),
      left_hand: null,
      // Massive jitter
      right_hand: makeDummyHand(i % 2 === 0 ? 0.5 : -0.5),
    }));

    const res = evaluateClipQuality(frames, 30);
    expect(res.avgJitter).toBeGreaterThan(0.05);
    expect(res.overallScore).toBeLessThan(80);
  });
});

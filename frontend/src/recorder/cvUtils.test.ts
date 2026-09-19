import { describe, it, expect } from 'vitest';
import {
  distance3D,
  normalizeFrame,
  assignHandsByWristProximity,
  interpolateMissingHandFrames,
  smoothSignFrames,
} from './cvUtils';
import type { Landmark3D, SignFrame } from '../lib/clipTypes';

describe('cvUtils', () => {
  it('calculates 3D Euclidean distance correctly', () => {
    const p1: Landmark3D = [0, 0, 0];
    const p2: Landmark3D = [3, 4, 0];
    expect(distance3D(p1, p2)).toBe(5);
  });

  it('normalizes frame placing shoulder midpoint at (0,0,0) with scale invariance', () => {
    const dummyPose: Landmark3D[] = Array.from({ length: 25 }, () => [0, 0, 0]);
    // Shoulders at (10, 20, 0) and (20, 20, 0) -> midpoint (15, 20, 0), width = 10
    dummyPose[11] = [20, 20, 0]; // Left shoulder
    dummyPose[12] = [10, 20, 0]; // Right shoulder
    dummyPose[0] = [15, 10, 0]; // Nose

    const hand: Landmark3D[] = [[15, 20, 0]];

    const norm = normalizeFrame(dummyPose, hand, null);

    // Left shoulder transformed: (20 - 15)/10 = 0.5
    expect(norm.pose[11][0]).toBeCloseTo(0.5);
    // Right shoulder transformed: (10 - 15)/10 = -0.5
    expect(norm.pose[12][0]).toBeCloseTo(-0.5);
    // Shoulder mid transformed: 0
    expect((norm.pose[11][0] + norm.pose[12][0]) / 2).toBeCloseTo(0);
    // Hand transformed at midpoint: (0, 0, 0)
    expect(norm.left_hand![0][0]).toBeCloseTo(0);
    expect(norm.left_hand![0][1]).toBeCloseTo(0);
  });

  it('assigns detected hands to left or right wrist based on proximity', () => {
    const dummyPose: Landmark3D[] = Array.from({ length: 25 }, () => [0, 0, 0]);
    dummyPose[15] = [0.4, 0.8, 0]; // Left wrist
    dummyPose[16] = [-0.4, 0.8, 0]; // Right wrist

    const handNearLeft: Landmark3D[] = Array.from({ length: 21 }, () => [0.42, 0.81, 0]);
    const handNearRight: Landmark3D[] = Array.from({ length: 21 }, () => [-0.38, 0.79, 0]);

    const result = assignHandsByWristProximity([handNearRight, handNearLeft], dummyPose);

    expect(result.leftHand).toBe(handNearLeft);
    expect(result.rightHand).toBe(handNearRight);
  });

  it('interpolates missing hand frames within gap threshold', () => {
    const handA: Landmark3D[] = [[0, 0, 0]];
    const handB: Landmark3D[] = [[10, 10, 10]];

    const frames: SignFrame[] = [
      { pose: [], left_hand: handA, right_hand: null },
      { pose: [], left_hand: null, right_hand: null },
      { pose: [], left_hand: handB, right_hand: null },
    ];

    const interpolated = interpolateMissingHandFrames(frames, 'left_hand', 3);

    expect(interpolated[1].left_hand).not.toBeNull();
    expect(interpolated[1].left_hand![0][0]).toBeCloseTo(5);
    expect(interpolated[1].left_hand![0][1]).toBeCloseTo(5);
    expect(interpolated[1].left_hand![0][2]).toBeCloseTo(5);
  });

  it('smooths sign frames with 3-frame window', () => {
    const f1: SignFrame = {
      pose: [[0, 0, 0]],
      left_hand: [[0, 0, 0]],
      right_hand: null,
    };
    const f2: SignFrame = {
      pose: [[10, 10, 10]],
      left_hand: [[10, 10, 10]],
      right_hand: null,
    };
    const f3: SignFrame = {
      pose: [[0, 0, 0]],
      left_hand: [[0, 0, 0]],
      right_hand: null,
    };

    const smoothed = smoothSignFrames([f1, f2, f3]);
    expect(smoothed.length).toBe(3);
    // Middle frame smoothed: 0*0.25 + 10*0.5 + 0*0.25 = 5.0
    expect(smoothed[1].pose[0][0]).toBeCloseTo(5.0);
    expect(smoothed[1].left_hand![0][0]).toBeCloseTo(5.0);
  });
});

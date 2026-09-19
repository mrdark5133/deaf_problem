/**
 * retargeting.test.ts — Unit tests for 3D retargeting and bone length invariance.
 */

import { describe, it, expect } from 'vitest';
import {
  retargetFrame,
  BONE_LENGTHS,
  vecDistance,
  type Vec3,
} from './retargeting';
import type { SignFrame } from '../lib/clipTypes';

const mockFrame: SignFrame = {
  pose: [
    [0.0, -0.65, 0.0],
    [-0.03, -0.68, 0.0],
    [-0.05, -0.68, 0.0],
    [-0.07, -0.68, 0.0],
    [0.03, -0.68, 0.0],
    [0.05, -0.68, 0.0],
    [0.07, -0.68, 0.0],
    [-0.12, -0.66, 0.0],
    [0.12, -0.66, 0.0],
    [-0.04, -0.58, 0.0],
    [0.04, -0.58, 0.0],
    [-0.50, 0.00, 0.0], // 11: L shoulder
    [0.50, 0.00, 0.0],  // 12: R shoulder
    [-0.45, 0.35, 0.0], // 13: L elbow
    [0.45, 0.35, 0.0],  // 14: R elbow
    [-0.30, 0.45, 0.0], // 15: L wrist
    [0.30, 0.45, 0.0],  // 16: R wrist
    [-0.30, 0.85, 0.0], // 17: L hip
    [0.30, 0.85, 0.0],  // 18: R hip
  ],
  left_hand: Array.from({ length: 21 }, (_, i) => [-0.30 + (i % 5) * 0.02, 0.45 - (i / 5) * 0.03, 0.02 * i]),
  right_hand: Array.from({ length: 21 }, (_, i) => [0.30 + (i % 5) * 0.02, 0.45 - (i / 5) * 0.03, 0.02 * i]),
};

describe('3D Retargeting & Bone Invariant (Hard Rule 3)', () => {
  it('strictly preserves fixed bone lengths for upper arms and forearms', () => {
    const s = retargetFrame(mockFrame);

    // Left Upper Arm invariant
    const lUpperDist = vecDistance(s.leftShoulder, s.leftElbow);
    expect(lUpperDist).toBeCloseTo(BONE_LENGTHS.upperArm, 4);

    // Left Forearm invariant
    const lForearmDist = vecDistance(s.leftElbow, s.leftWrist);
    expect(lForearmDist).toBeCloseTo(BONE_LENGTHS.forearm, 4);

    // Right Upper Arm invariant
    const rUpperDist = vecDistance(s.rightShoulder, s.rightElbow);
    expect(rUpperDist).toBeCloseTo(BONE_LENGTHS.upperArm, 4);

    // Right Forearm invariant
    const rForearmDist = vecDistance(s.rightElbow, s.rightWrist);
    expect(rForearmDist).toBeCloseTo(BONE_LENGTHS.forearm, 4);
  });

  it('strictly preserves shoulder width and torso height constants', () => {
    const s = retargetFrame(mockFrame);

    const shoulderDist = vecDistance(s.leftShoulder, s.rightShoulder);
    expect(shoulderDist).toBeCloseTo(BONE_LENGTHS.shoulderHalfWidth * 2, 4);

    const hipDist = vecDistance(s.leftHip, s.rightHip);
    expect(hipDist).toBeCloseTo(BONE_LENGTHS.hipHalfWidth * 2, 4);
  });

  it('guarantees no NaN or Infinity values exist in any output joint', () => {
    const s = retargetFrame(mockFrame);

    const allVecs: Vec3[] = [
      s.neck, s.head, s.leftEye, s.rightEye,
      s.leftEyebrow, s.rightEyebrow,
      s.leftShoulder, s.rightShoulder,
      s.leftElbow, s.rightElbow,
      s.leftWrist, s.rightWrist,
      s.spineMid, s.leftHip, s.rightHip,
      ...(s.leftHand || []),
      ...(s.rightHand || []),
    ];

    for (const v of allVecs) {
      expect(Number.isFinite(v[0])).toBe(true);
      expect(Number.isFinite(v[1])).toBe(true);
      expect(Number.isFinite(v[2])).toBe(true);
      expect(Number.isNaN(v[0])).toBe(false);
      expect(Number.isNaN(v[1])).toBe(false);
      expect(Number.isNaN(v[2])).toBe(false);
    }
  });

  it('lifts eyebrows upwards when isQuestion is true', () => {
    const normal = retargetFrame(mockFrame, false);
    const question = retargetFrame(mockFrame, true);

    // In Three.js screen space, negative Y is up
    expect(question.leftEyebrow[1]).toBeLessThan(normal.leftEyebrow[1]);
    expect(question.rightEyebrow[1]).toBeLessThan(normal.rightEyebrow[1]);
  });

  it('correctly flips X coordinates when mirrored is true', () => {
    const normal = retargetFrame(mockFrame, false, false);
    const mirrored = retargetFrame(mockFrame, false, true);

    expect(mirrored.leftShoulder[0]).toBeCloseTo(-normal.leftShoulder[0], 4);
    expect(mirrored.rightShoulder[0]).toBeCloseTo(-normal.rightShoulder[0], 4);
  });

  it('produces 21 articulated hand joints with constant phalange segment lengths', () => {
    const s = retargetFrame(mockFrame);
    expect(s.rightHand).not.toBeNull();
    expect(s.rightHand!.length).toBe(21);

    // Index finger proximal segment: MCP(5) to PIP(6)
    const indexProxDist = vecDistance(s.rightHand![5], s.rightHand![6]);
    expect(indexProxDist).toBeCloseTo(BONE_LENGTHS.index[1], 3);
  });
});

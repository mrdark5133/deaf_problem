/**
 * signSolver.test.ts — Unit tests for Phase S2 Analytical IK Arm Solver & Sign Compiler.
 */

import { describe, it, expect } from 'vitest';
import {
  solveTwoBoneArmIK,
  solveHandOrientationMatrix,
  transformCanonicalToWorld,
  evaluateSignSpecAtTime,
  parseDirection,
  vecNorm,
  vecSub,
  vecDot,
  ARM_BONE_LENGTHS,
} from './signSolver';
import { compileSignSpecToClip } from './signCompiler';
import { SAMPLE_SPECS } from './sampleSpecs';
import type { Landmark3D } from '../lib/clipTypes';

describe('Analytical Two-Bone Arm IK Solver (Phase S2)', () => {
  const shoulderR: [number, number, number] = [ARM_BONE_LENGTHS.shoulderHalfWidth, 0.0, 0.0];
  const shoulderL: [number, number, number] = [-ARM_BONE_LENGTHS.shoulderHalfWidth, 0.0, 0.0];

  it('preserves fixed bone lengths L1=0.42 and L2=0.38 for reachable targets', () => {
    const testTargets: [number, number, number][] = [
      [0.25, 0.35, 0.15],
      [0.10, 0.20, 0.25],
      [0.0, -0.30, 0.15],
      [0.40, 0.10, 0.10],
      [0.20, -0.40, 0.12],
    ];

    for (const target of testTargets) {
      const { elbow, wrist } = solveTwoBoneArmIK(shoulderR, target, true);

      const upperArmLen = vecNorm(vecSub(elbow, shoulderR));
      const forearmLen = vecNorm(vecSub(wrist, elbow));

      // Invariant: bone lengths within 0.005 margin of 0.42 and 0.38
      expect(upperArmLen).toBeCloseTo(0.42, 2);
      expect(forearmLen).toBeCloseTo(0.38, 2);

      // Invariant: wrist reaches target
      expect(wrist[0]).toBeCloseTo(target[0], 3);
      expect(wrist[1]).toBeCloseTo(target[1], 3);
      expect(wrist[2]).toBeCloseTo(target[2], 3);
    }
  });

  it('clamps targets beyond maximum arm reach to prevent singularity without NaN', () => {
    const unreachableTarget: [number, number, number] = [2.0, 3.0, 2.0];
    const { elbow, wrist } = solveTwoBoneArmIK(shoulderR, unreachableTarget, true);

    const upperArmLen = vecNorm(vecSub(elbow, shoulderR));
    const forearmLen = vecNorm(vecSub(wrist, elbow));
    const totalDist = vecNorm(vecSub(wrist, shoulderR));

    expect(Number.isNaN(elbow[0])).toBe(false);
    expect(Number.isNaN(wrist[0])).toBe(false);
    expect(upperArmLen).toBeCloseTo(0.42, 2);
    expect(forearmLen).toBeCloseTo(0.38, 2);
    expect(totalDist).toBeLessThanOrEqual(0.42 + 0.38);
  });

  it('maintains bilateral symmetry for non-dominant left arm', () => {
    const targetL: [number, number, number] = [-0.25, 0.35, 0.15];
    const { elbow, wrist } = solveTwoBoneArmIK(shoulderL, targetL, false);

    const upperArmLen = vecNorm(vecSub(elbow, shoulderL));
    const forearmLen = vecNorm(vecSub(wrist, elbow));

    expect(upperArmLen).toBeCloseTo(0.42, 2);
    expect(forearmLen).toBeCloseTo(0.38, 2);
    expect(elbow[0]).toBeLessThan(0); // Elbow on left side
  });
});

describe('Hand Orientation Matrix Solver (Phase S2)', () => {
  it('constructs orthonormal basis from palm normal and finger pointing directions', () => {
    const palm = parseDirection('forward', true);
    const fingers = parseDirection('up', true);

    const { uX, uY, uZ } = solveHandOrientationMatrix(palm, fingers, true);

    // Unit vectors
    expect(vecNorm(uX)).toBeCloseTo(1.0, 4);
    expect(vecNorm(uY)).toBeCloseTo(1.0, 4);
    expect(vecNorm(uZ)).toBeCloseTo(1.0, 4);

    // Mutually perpendicular
    expect(vecDot(uX, uY)).toBeCloseTo(0.0, 4);
    expect(vecDot(uY, uZ)).toBeCloseTo(0.0, 4);
    expect(vecDot(uZ, uX)).toBeCloseTo(0.0, 4);

    // Palm normal alignment within 5 degrees (cos 5° ≈ 0.996)
    const dotZ = vecDot(uZ, palm);
    expect(dotZ).toBeGreaterThanOrEqual(0.99);
  });

  it('handles collinear fallback without crashing or producing NaNs', () => {
    const collinearPalm: [number, number, number] = [0, 1, 0];
    const collinearFingers: [number, number, number] = [0, 1, 0];

    const { uX, uY, uZ } = solveHandOrientationMatrix(collinearPalm, collinearFingers, true);

    expect(Number.isNaN(uX[0])).toBe(false);
    expect(Number.isNaN(uY[0])).toBe(false);
    expect(Number.isNaN(uZ[0])).toBe(false);
    expect(vecNorm(uX)).toBeCloseTo(1.0, 3);
  });
});

describe('Canonical to World Transformation', () => {
  const dummyHand: Landmark3D[] = [
    [0.0, 0.0, 0.0],
    [0.0, 0.5, 0.0],
    [0.0, 1.0, 0.0],
  ];

  it('anchors canonical wrist at solved wrist position', () => {
    const wristPos: [number, number, number] = [0.25, -0.30, 0.15];
    const orient = {
      uX: [1, 0, 0] as [number, number, number],
      uY: [0, 1, 0] as [number, number, number],
      uZ: [0, 0, 1] as [number, number, number],
    };

    const world = transformCanonicalToWorld(dummyHand, wristPos, orient, 0.12, true);

    expect(world[0][0]).toBeCloseTo(wristPos[0], 3);
    expect(world[0][1]).toBeCloseTo(wristPos[1], 3);
    expect(world[0][2]).toBeCloseTo(wristPos[2], 3);
  });
});

describe('Sign Compiler & Keyframe Evaluation (Phase S2)', () => {
  const dummyHandshapeMap: Record<string, Landmark3D[]> = {
    flat_b: Array.from({ length: 21 }, () => [0.0, 0.5, 0.0]),
    fist_s: Array.from({ length: 21 }, () => [0.0, 0.3, 0.0]),
    fist_a: Array.from({ length: 21 }, () => [0.0, 0.3, 0.0]),
  };

  it('evaluates one-handed sign spec smoothly across t=0.0 to 1.0', () => {
    const spec = SAMPLE_SPECS['HELLO'];
    expect(spec).toBeDefined();

    for (let t = 0; t <= 1.0; t += 0.2) {
      const solved = evaluateSignSpecAtTime(spec, t, dummyHandshapeMap);
      expect(solved.dominantArm).toBeDefined();
      expect(solved.dominantArm.handLandmarks.length).toBe(21);
      expect(solved.nonDominantArm).toBeUndefined();
    }
  });

  it('evaluates two-handed sign spec with non-dominant arm landmarks', () => {
    const spec = SAMPLE_SPECS['HELP'];
    expect(spec).toBeDefined();

    const solved = evaluateSignSpecAtTime(spec, 0.5, dummyHandshapeMap);
    expect(solved.dominantArm).toBeDefined();
    expect(solved.nonDominantArm).toBeDefined();
    expect(solved.nonDominantArm?.handLandmarks.length).toBe(21);
  });

  it('compiles full SignSpec to 30 FPS SignClip with matching metadata and frames', () => {
    const spec = SAMPLE_SPECS['THANK-YOU'];
    const clip = compileSignSpecToClip(spec, dummyHandshapeMap);

    expect(clip.id).toBe('thank-you');
    expect(clip.gloss).toBe('THANK-YOU');
    expect(clip.fps).toBe(30);
    expect(clip.synthetic).toBe(false);
    expect(clip.source).toBe('handshape-spec');
    expect(clip.frames.length).toBeGreaterThanOrEqual(30);

    // Frame 0 structure verification
    const f0 = clip.frames[0];
    expect(f0.pose.length).toBe(33);
    expect(f0.right_hand?.length).toBe(21);
  });
});

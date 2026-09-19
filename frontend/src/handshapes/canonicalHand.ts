/**
 * canonicalHand.ts — Mathematical transformations and invariance solvers for Canonical Hand Shapes.
 *
 * Canonical Hand Frame Definition:
 *  - Origin: Wrist joint (landmark 0) is at (0, 0, 0)
 *  - +Y axis: Vector from wrist (0) to middle MCP joint (9)
 *  - +Z axis: Palm normal pointing outwards from palm (via cross product of index MCP & pinky MCP)
 *  - +X axis: Orthogonal radial-to-ulnar axis (Y × Z)
 *  - Scale: Normalized such that distance ||P_9 - P_0|| == 1.0
 *  - Right hand is canonical; Left hand is mirrored across X=0.
 */

import type { Landmark3D } from '../lib/clipTypes';
import type { HandshapeStabilityResult } from './types';

export type Vec3 = [number, number, number];

export function vecSub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function vecAdd(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function vecScale(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s];
}

export function vecDot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function vecCross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

export function vecNorm(v: Vec3): number {
  return Math.hypot(v[0], v[1], v[2]);
}

export function vecNormalize(v: Vec3, fallback: Vec3 = [0, 1, 0]): Vec3 {
  const n = vecNorm(v);
  if (n < 1e-7 || !Number.isFinite(n)) return fallback;
  return [v[0] / n, v[1] / n, v[2] / n];
}

/**
 * Transforms raw 21-landmark hand coordinates into the Canonical Hand Frame.
 *
 * Invariant to:
 *  - 3D translation (wrist anchored to 0,0,0)
 *  - 3D rotation (aligned to standard anatomical coordinate axes)
 *  - Scale (normalized by wrist-to-middle MCP distance)
 */
export function toCanonicalHandFrame(
  rawLandmarks: Landmark3D[],
  isRight = true
): Landmark3D[] {
  if (!rawLandmarks || rawLandmarks.length < 21) {
    throw new Error(`Invalid landmark array length: ${rawLandmarks?.length ?? 0}`);
  }

  const p0: Vec3 = [rawLandmarks[0][0], rawLandmarks[0][1], rawLandmarks[0][2] ?? 0];
  const p5: Vec3 = [rawLandmarks[5][0], rawLandmarks[5][1], rawLandmarks[5][2] ?? 0];
  const p9: Vec3 = [rawLandmarks[9][0], rawLandmarks[9][1], rawLandmarks[9][2] ?? 0];
  const p17: Vec3 = [rawLandmarks[17][0], rawLandmarks[17][1], rawLandmarks[17][2] ?? 0];

  // 1. Hand scale (wrist to middle MCP)
  const vy = vecSub(p9, p0);
  const handScale = vecNorm(vy);
  if (handScale < 1e-6) {
    throw new Error('Hand scale is degenerate (wrist and middle MCP coincide)');
  }

  // Unit +Y axis (wrist to middle MCP)
  const uy = vecNormalize(vy, [0, 1, 0]);

  // 2. Palm normal (+Z axis) via index MCP (5) and pinky MCP (17) vectors
  const v1 = vecSub(p5, p0);
  const v2 = vecSub(p17, p0);
  let nz = vecCross(v1, v2);

  // For left hand, cross product orientation is reversed
  if (!isRight) {
    nz = vecScale(nz, -1);
  }

  let uz = vecNormalize(nz, [0, 0, 1]);

  // Orthogonalize +X axis: ux = uy × uz
  let ux = vecCross(uy, uz);
  if (vecNorm(ux) < 1e-5) {
    // Fallback if vy and nz are collinear
    ux = [1, 0, 0];
  } else {
    ux = vecNormalize(ux);
  }

  // Re-orthogonalize uz = ux × uy to ensure perfect right-handed orthonormal basis
  uz = vecNormalize(vecCross(ux, uy), [0, 0, 1]);

  // 3. Project each landmark onto orthonormal basis [ux, uy, uz] and normalize scale
  const canonical: Landmark3D[] = [];

  for (let i = 0; i < 21; i++) {
    const raw: Vec3 = [rawLandmarks[i][0], rawLandmarks[i][1], rawLandmarks[i][2] ?? 0];
    const rel = vecSub(raw, p0);

    let cx = vecDot(rel, ux) / handScale;
    const cy = vecDot(rel, uy) / handScale;
    const cz = vecDot(rel, uz) / handScale;

    // Mirror left hand onto canonical right-hand coordinate frame
    if (!isRight) {
      cx = -cx;
    }

    canonical.push([
      Math.round(cx * 10000) / 10000,
      Math.round(cy * 10000) / 10000,
      Math.round(cz * 10000) / 10000,
    ]);
  }

  return canonical;
}

/**
 * Computes per-landmark coordinate median across multiple captured canonical frames.
 * The median is immune to single-frame tracking glitches and outliers.
 */
export function computeHandshapeMedian(frames: Landmark3D[][]): Landmark3D[] {
  if (!frames || frames.length === 0) {
    throw new Error('Cannot compute median of empty frames array');
  }
  if (frames.length === 1) return frames[0];

  const result: Landmark3D[] = [];

  for (let jointIdx = 0; jointIdx < 21; jointIdx++) {
    const xs: number[] = [];
    const ys: number[] = [];
    const zs: number[] = [];

    for (const frame of frames) {
      if (frame[jointIdx]) {
        xs.push(frame[jointIdx][0]);
        ys.push(frame[jointIdx][1]);
        zs.push(frame[jointIdx][2] ?? 0);
      }
    }

    xs.sort((a, b) => a - b);
    ys.sort((a, b) => a - b);
    zs.sort((a, b) => a - b);

    const mid = Math.floor(xs.length / 2);
    const medianX = xs.length % 2 === 0 ? (xs[mid - 1] + xs[mid]) / 2 : xs[mid];
    const medianY = ys.length % 2 === 0 ? (ys[mid - 1] + ys[mid]) / 2 : ys[mid];
    const medianZ = zs.length % 2 === 0 ? (zs[mid - 1] + zs[mid]) / 2 : zs[mid];

    result.push([
      Math.round(medianX * 10000) / 10000,
      Math.round(medianY * 10000) / 10000,
      Math.round(medianZ * 10000) / 10000,
    ]);
  }

  return result;
}

/**
 * Evaluates spatial variance and stability across captured handshape frames.
 */
export function evaluateHandshapeStability(frames: Landmark3D[][]): HandshapeStabilityResult {
  if (!frames || frames.length < 3) {
    return { score: 0, verdict: 'RED', spread: 1.0, validFrameCount: frames?.length ?? 0 };
  }

  const median = computeHandshapeMedian(frames);
  let totalSpread = 0;
  let count = 0;

  for (const frame of frames) {
    for (let i = 0; i < 21; i++) {
      const cur = frame[i];
      const med = median[i];
      if (cur && med) {
        const dist = Math.hypot(cur[0] - med[0], cur[1] - med[1], (cur[2] ?? 0) - (med[2] ?? 0));
        totalSpread += dist;
        count++;
      }
    }
  }

  const avgSpread = count > 0 ? totalSpread / count : 1.0;

  // Stability scoring: spread <= 0.03 is GREEN (score ~90-100), <= 0.08 is AMBER, > 0.08 is RED
  let score = Math.max(0, Math.min(100, Math.round(100 - avgSpread * 700)));
  if (frames.length < 15) {
    score = Math.max(0, score - 15);
  }

  let verdict: 'GREEN' | 'AMBER' | 'RED' = 'RED';
  if (score >= 75) verdict = 'GREEN';
  else if (score >= 50) verdict = 'AMBER';

  return {
    score,
    verdict,
    spread: Math.round(avgSpread * 10000) / 10000,
    validFrameCount: frames.length,
  };
}

/**
 * Mirrors a canonical handshape from right hand to left hand (or vice versa).
 */
export function mirrorCanonicalHandshape(landmarks: Landmark3D[]): Landmark3D[] {
  return landmarks.map((lm) => [
    -lm[0],
    lm[1],
    lm[2] ?? 0,
  ]);
}

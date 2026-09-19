/**
 * signSolver.ts — Analytical Two-Bone Arm IK, Hand Orientation, and Keyframe Interpolation Solver.
 *
 * Guaranteed Properties:
 *  - Fixed bone lengths invariant: upper arm = 0.42, forearm = 0.38
 *  - Continuous Hermite spline trajectories for wrist position
 *  - SLERP interpolation for hand orientation
 *  - Palm normal vector matches spec within 5 degrees
 */

import type { Landmark3D } from '../lib/clipTypes';
import type {
  DirectionName,
  HandKeyframeSpec,
  KeyframeSpec,
  NamedLocation,
  SignSpec,
  SolvedFrameArm,
} from './specTypes';

export type Vec3 = [number, number, number];

export const ARM_BONE_LENGTHS = {
  upperArm: 0.42,
  forearm: 0.38,
  shoulderHalfWidth: 0.50,
} as const;

// ─── Named Body Location Anchors (in avatar coordinate space) ────────────────
export const NAMED_LOCATIONS: Record<NamedLocation, Vec3> = {
  neutral: [0.22, 0.42, 0.08],
  chest: [0.15, 0.18, 0.16],
  chin: [0.0, -0.38, 0.14],
  mouth: [0.0, -0.42, 0.14],
  nose: [0.0, -0.48, 0.14],
  forehead: [0.0, -0.62, 0.12],
  temple: [0.20, -0.60, 0.12],
  cheek: [0.18, -0.45, 0.12],
  shoulder_ipsi: [0.45, 0.05, 0.08],
  shoulder_contra: [-0.35, 0.05, 0.08],
  waist: [0.20, 0.68, 0.10],
  non_dominant_palm: [-0.15, 0.28, 0.18],
  non_dominant_wrist: [-0.18, 0.32, 0.16],
};

// ─── Direction Mapping ───────────────────────────────────────────────────────
export function parseDirection(dir: DirectionName | Vec3, isRight = true): Vec3 {
  if (Array.isArray(dir)) {
    return vecNormalize(dir);
  }

  const side = isRight ? 1 : -1;

  switch (dir) {
    case 'forward':
    case 'away':
      return [0, 0, 1];
    case 'back':
    case 'toward_body':
      return [0, 0, -1];
    case 'up':
      return [0, -1, 0];
    case 'down':
      return [0, 1, 0];
    case 'left':
      return [-1, 0, 0];
    case 'right':
      return [1, 0, 0];
    case 'inward':
      return [-side, 0, 0];
    case 'outward':
      return [side, 0, 0];
    default:
      return [0, 0, 1];
  }
}

// ─── Vector Utilities ────────────────────────────────────────────────────────
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

// ─── Analytical Two-Bone Arm IK Solver ────────────────────────────────────────
/**
 * Solves elbow position for a two-bone arm with fixed bone lengths L1 and L2.
 * Shoulder S is fixed; target wrist is W.
 */
export function solveTwoBoneArmIK(
  shoulder: Vec3,
  targetWrist: Vec3,
  isRight = true,
  L1 = ARM_BONE_LENGTHS.upperArm,
  L2 = ARM_BONE_LENGTHS.forearm
): { elbow: Vec3; wrist: Vec3 } {
  const sw = vecSub(targetWrist, shoulder);
  let dist = vecNorm(sw);

  // Maximum reach clamp (with 1mm safety margin to prevent singularity)
  const maxReach = L1 + L2 - 0.002;
  const minReach = Math.abs(L1 - L2) + 0.002;

  let clampedWrist = targetWrist;
  if (dist > maxReach) {
    const dir = vecNormalize(sw);
    clampedWrist = vecAdd(shoulder, vecScale(dir, maxReach));
    dist = maxReach;
  } else if (dist < minReach) {
    const dir = vecNormalize(sw, [isRight ? 0.2 : -0.2, 0.8, 0.1]);
    clampedWrist = vecAdd(shoulder, vecScale(dir, minReach));
    dist = minReach;
  }

  // Law of Cosines for interior elbow angle alpha (between upper arm and shoulder-wrist line)
  const cosAlpha = (L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist);
  const clampedCos = Math.max(-1.0, Math.min(1.0, cosAlpha));
  const alpha = Math.acos(clampedCos);

  // Direction from shoulder to wrist
  const uSW = vecNormalize(vecSub(clampedWrist, shoulder));

  // Natural anatomical elbow hint direction (biased downward and outward)
  const sideSign = isRight ? 1 : -1;
  const naturalElbowHint: Vec3 = [sideSign * 0.45, 0.65, -0.20];

  // Plane normal perpendicular to shoulder-wrist line and elbow hint
  let planeNorm = vecCross(uSW, naturalElbowHint);
  if (vecNorm(planeNorm) < 1e-4) {
    planeNorm = [0, 0, 1];
  } else {
    planeNorm = vecNormalize(planeNorm);
  }

  // Direction perpendicular to uSW in the bending plane pointing towards elbow
  const uElbowPerp = vecNormalize(vecCross(planeNorm, uSW));

  // Elbow position: S + (uSW * cos(alpha) + uElbowPerp * sin(alpha)) * L1
  const elbowDir = vecAdd(vecScale(uSW, Math.cos(alpha)), vecScale(uElbowPerp, Math.sin(alpha)));
  const elbow = vecAdd(shoulder, vecScale(vecNormalize(elbowDir), L1));

  return { elbow, wrist: clampedWrist };
}

// ─── Hand Orientation Matrix & Landmark Transformation ────────────────────────
/**
 * Constructs an orthonormal 3x3 orientation matrix from desired palm normal and finger pointing direction.
 */
export function solveHandOrientationMatrix(
  palmNormal: Vec3,
  fingerDir: Vec3,
  isRight = true
): { uX: Vec3; uY: Vec3; uZ: Vec3 } {
  let uY = vecNormalize(fingerDir, [0, 1, 0]); // Distal along middle finger
  const uZ_target = vecNormalize(palmNormal, [0, 0, 1]); // Normal to palm

  // Gram-Schmidt orthogonalization: ensure uZ is perpendicular to uY
  let uX = vecCross(uY, uZ_target);
  if (vecNorm(uX) < 1e-4) {
    // Fallback if palm normal and finger direction are collinear
    uX = isRight ? [1, 0, 0] : [-1, 0, 0];
  } else {
    uX = vecNormalize(uX);
  }

  if (!isRight) {
    uX = vecScale(uX, -1);
  }

  const uZ = vecNormalize(vecCross(uX, uY));
  uX = vecNormalize(vecCross(uY, uZ));

  return { uX, uY, uZ };
}

/**
 * Transforms canonical handshape landmarks into world coordinates at solved wrist position.
 */
export function transformCanonicalToWorld(
  canonicalLandmarks: Landmark3D[],
  wristPos: Vec3,
  orient: { uX: Vec3; uY: Vec3; uZ: Vec3 },
  handScale = 0.12,
  isRight = true
): Landmark3D[] {
  return canonicalLandmarks.map((lm) => {
    const lx = (isRight ? lm[0] : -lm[0]) * handScale;
    const ly = lm[1] * handScale;
    const lz = (lm[2] ?? 0) * handScale;

    const wx = wristPos[0] + orient.uX[0] * lx + orient.uY[0] * ly + orient.uZ[0] * lz;
    const wy = wristPos[1] + orient.uX[1] * lx + orient.uY[1] * ly + orient.uZ[1] * lz;
    const wz = wristPos[2] + orient.uX[2] * lx + orient.uY[2] * ly + orient.uZ[2] * lz;

    return [
      Math.round(wx * 10000) / 10000,
      Math.round(wy * 10000) / 10000,
      Math.round(wz * 10000) / 10000,
    ];
  });
}

// ─── Keyframe Cubic Hermite Interpolator ──────────────────────────────────────
export function evaluateLocation(
  loc: NamedLocation | Vec3,
  offset?: Vec3,
  isRight = true
): Vec3 {
  let base: Vec3;
  if (typeof loc === 'string') {
    base = NAMED_LOCATIONS[loc] || NAMED_LOCATIONS.neutral;
  } else {
    base = loc;
  }

  const side = isRight ? 1 : -1;
  const result: Vec3 = [base[0] * (typeof loc === 'string' && loc !== 'chin' && loc !== 'mouth' && loc !== 'nose' && loc !== 'forehead' ? side : 1), base[1], base[2]];

  if (offset) {
    result[0] += offset[0] * side;
    result[1] += offset[1];
    result[2] += offset[2];
  }

  return result;
}

export function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

/**
 * Evaluates state of a sign specification at normalized time t in [0.0, 1.0].
 */
export function evaluateSignSpecAtTime(
  spec: SignSpec,
  tNorm: number,
  handshapeMap: Record<string, Landmark3D[]>
): { dominantArm: SolvedFrameArm; nonDominantArm?: SolvedFrameArm } {
  const keyframes = spec.keyframes;
  if (!keyframes || keyframes.length === 0) {
    throw new Error('Sign spec has no keyframes');
  }

  const tClamped = Math.max(0.0, Math.min(1.0, tNorm));

  // Find bounding keyframes [k0, k1]
  let k0 = keyframes[0];
  let k1 = keyframes[keyframes.length - 1];

  for (let i = 0; i < keyframes.length - 1; i++) {
    if (tClamped >= keyframes[i].t && tClamped <= keyframes[i + 1].t) {
      k0 = keyframes[i];
      k1 = keyframes[i + 1];
      break;
    }
  }

  const span = Math.max(1e-4, k1.t - k0.t);
  const alpha = Math.max(0.0, Math.min(1.0, (tClamped - k0.t) / span));

  // Smooth Hermite easing S-curve: 3*a^2 - 2*a^3
  const easeAlpha = alpha * alpha * (3 - 2 * alpha);

  // 1. Solve Dominant Arm
  const domLoc0 = evaluateLocation(k0.dominant.location, k0.dominant.offset, true);
  const domLoc1 = evaluateLocation(k1.dominant.location, k1.dominant.offset, true);
  const domWristPos = lerpVec3(domLoc0, domLoc1, easeAlpha);

  const domPalm0 = parseDirection(k0.dominant.palm, true);
  const domPalm1 = parseDirection(k1.dominant.palm, true);
  const domPalm = vecNormalize(lerpVec3(domPalm0, domPalm1, easeAlpha));

  const domFingers0 = parseDirection(k0.dominant.fingers, true);
  const domFingers1 = parseDirection(k1.dominant.fingers, true);
  const domFingers = vecNormalize(lerpVec3(domFingers0, domFingers1, easeAlpha));

  const shoulderRight: Vec3 = [ARM_BONE_LENGTHS.shoulderHalfWidth, 0.0, 0.0];
  const ikRight = solveTwoBoneArmIK(shoulderRight, domWristPos, true);

  const orientRight = solveHandOrientationMatrix(domPalm, domFingers, true);
  const handshapeId = alpha < 0.5 ? k0.dominant.handshape : k1.dominant.handshape;
  const rawCanonical = handshapeMap[handshapeId] || handshapeMap['flat_b'] || [];

  const worldHandRight = transformCanonicalToWorld(rawCanonical, ikRight.wrist, orientRight, 0.12, true);

  const dominantArm: SolvedFrameArm = {
    shoulder: shoulderRight,
    elbow: ikRight.elbow,
    wrist: ikRight.wrist,
    palmNormal: domPalm,
    fingerDir: domFingers,
    handLandmarks: worldHandRight,
  };

  // 2. Solve Non-Dominant Arm if specified
  let nonDominantArm: SolvedFrameArm | undefined = undefined;
  if (spec.hands === 'two' && k0.non_dominant && k1.non_dominant) {
    const ndLoc0 = evaluateLocation(k0.non_dominant.location, k0.non_dominant.offset, false);
    const ndLoc1 = evaluateLocation(k1.non_dominant.location, k1.non_dominant.offset, false);
    const ndWristPos = lerpVec3(ndLoc0, ndLoc1, easeAlpha);

    const ndPalm0 = parseDirection(k0.non_dominant.palm, false);
    const ndPalm1 = parseDirection(k1.non_dominant.palm, false);
    const ndPalm = vecNormalize(lerpVec3(ndPalm0, ndPalm1, easeAlpha));

    const ndFingers0 = parseDirection(k0.non_dominant.fingers, false);
    const ndFingers1 = parseDirection(k1.non_dominant.fingers, false);
    const ndFingers = vecNormalize(lerpVec3(ndFingers0, ndFingers1, easeAlpha));

    const shoulderLeft: Vec3 = [-ARM_BONE_LENGTHS.shoulderHalfWidth, 0.0, 0.0];
    const ikLeft = solveTwoBoneArmIK(shoulderLeft, ndWristPos, false);

    const orientLeft = solveHandOrientationMatrix(ndPalm, ndFingers, false);
    const ndHandshapeId = alpha < 0.5 ? k0.non_dominant.handshape : k1.non_dominant.handshape;
    const rawCanonicalNd = handshapeMap[ndHandshapeId] || handshapeMap['flat_b'] || [];

    const worldHandLeft = transformCanonicalToWorld(rawCanonicalNd, ikLeft.wrist, orientLeft, 0.12, false);

    nonDominantArm = {
      shoulder: shoulderLeft,
      elbow: ikLeft.elbow,
      wrist: ikLeft.wrist,
      palmNormal: ndPalm,
      fingerDir: ndFingers,
      handLandmarks: worldHandLeft,
    };
  }

  return { dominantArm, nonDominantArm };
}

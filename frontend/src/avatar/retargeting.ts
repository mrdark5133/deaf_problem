/**
 * retargeting.ts — Direction-only landmark retargeting with fixed bone lengths (Hard Rule 3).
 *
 * Takes noisy/scaled landmark arrays from SignFrame and projects them onto
 * fixed-length anatomical bones so limbs never stretch, shrink, or distort in 3D.
 */

import type { Landmark3D, SignFrame } from '../lib/clipTypes';

export type Vec3 = [number, number, number];

// ─── Fixed Bone Length Constants (in avatar coordinate units) ─────────────────
export const BONE_LENGTHS = {
  shoulderHalfWidth: 0.50,
  upperArm: 0.42,
  forearm: 0.38,
  torsoHeight: 0.85,
  hipHalfWidth: 0.30,
  neck: 0.20,
  headRadius: 0.22,
  // Hand finger segments [proximal, intermediate, distal]
  thumb: [0.07, 0.05, 0.045],
  index: [0.08, 0.055, 0.04],
  middle: [0.085, 0.06, 0.045],
  ring: [0.08, 0.055, 0.04],
  pinky: [0.065, 0.045, 0.035],
} as const;

// ─── Vector Utility Functions ────────────────────────────────────────────────
export function vecSub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function vecAdd(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function vecScale(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s];
}

export function vecLength(v: Vec3): number {
  return Math.hypot(v[0], v[1], v[2]);
}

export function vecDistance(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

export function vecNormalize(v: Vec3, fallback: Vec3 = [0, 1, 0]): Vec3 {
  const len = vecLength(v);
  if (len < 1e-6 || !Number.isFinite(len)) return fallback;
  return [v[0] / len, v[1] / len, v[2] / len];
}

// ─── Retargeted Upper Body & Hand Joints ───────────────────────────────────────

export interface RetargetedSkeleton {
  // Key body joint positions (all distances between connected joints are strictly constant)
  neck: Vec3;
  head: Vec3;
  leftEye: Vec3;
  rightEye: Vec3;
  leftEyebrow: Vec3;
  rightEyebrow: Vec3;
  leftShoulder: Vec3;
  rightShoulder: Vec3;
  leftElbow: Vec3;
  rightElbow: Vec3;
  leftWrist: Vec3;
  rightWrist: Vec3;
  spineMid: Vec3;
  leftHip: Vec3;
  rightHip: Vec3;
  // Articulated 21-landmark hands with fixed phalange lengths
  leftHand: Vec3[] | null;
  rightHand: Vec3[] | null;
}

// Hand connection parent indices for 21-landmark hand
const HAND_PARENT_MAP: number[] = [
  0,  // 0: wrist
  0, 1, 2, 3,       // 1-4: thumb
  0, 5, 6, 7,       // 5-8: index
  0, 9, 10, 11,     // 9-12: middle
  0, 13, 14, 15,    // 13-16: ring
  0, 17, 18, 19,    // 17-20: pinky
];

const FINGER_LENGTHS_MAP: number[] = [
  0,
  BONE_LENGTHS.thumb[0], BONE_LENGTHS.thumb[1], BONE_LENGTHS.thumb[2], 0.03,
  BONE_LENGTHS.index[0], BONE_LENGTHS.index[1], BONE_LENGTHS.index[2], 0.03,
  BONE_LENGTHS.middle[0], BONE_LENGTHS.middle[1], BONE_LENGTHS.middle[2], 0.03,
  BONE_LENGTHS.ring[0], BONE_LENGTHS.ring[1], BONE_LENGTHS.ring[2], 0.03,
  BONE_LENGTHS.pinky[0], BONE_LENGTHS.pinky[1], BONE_LENGTHS.pinky[2], 0.03,
];

function retargetHand(wrist: Vec3, rawHand: Landmark3D[] | null, isRight: boolean): Vec3[] | null {
  if (!rawHand || rawHand.length < 21) return null;

  const result: Vec3[] = [wrist];
  const sideSign = isRight ? 1 : -1;

  for (let i = 1; i < 21; i++) {
    const parentIdx = HAND_PARENT_MAP[i];
    const parentPos = result[parentIdx];
    const rawCur = rawHand[i];
    const rawParent = rawHand[parentIdx];

    const rawDir = vecSub(
      [rawCur[0], rawCur[1], rawCur[2] ?? 0],
      [rawParent[0], rawParent[1], rawParent[2] ?? 0]
    );

    const defaultDir: Vec3 = [sideSign * 0.2, -0.8, 0.3];
    const uDir = vecNormalize(rawDir, defaultDir);
    const segLength = FINGER_LENGTHS_MAP[i] || 0.04;

    const jointPos = vecAdd(parentPos, vecScale(uDir, segLength));
    result.push([
      Math.round(jointPos[0] * 10000) / 10000,
      Math.round(jointPos[1] * 10000) / 10000,
      Math.round(jointPos[2] * 10000) / 10000,
    ]);
  }

  return result;
}

/**
 * Retarget a raw SignFrame into a rigid 3D skeleton with invariant bone lengths.
 */
export function retargetFrame(
  frame: SignFrame,
  isQuestion = false,
  mirrored = false
): RetargetedSkeleton {
  const pose = frame.pose;

  // 1. Shoulders anchor the coordinate frame at midpoint [0, 0, 0]
  const mirrorSign = mirrored ? -1 : 1;
  const leftShoulder: Vec3 = [BONE_LENGTHS.shoulderHalfWidth * mirrorSign, 0, 0];
  const rightShoulder: Vec3 = [-BONE_LENGTHS.shoulderHalfWidth * mirrorSign, 0, 0];

  // 2. Spine & Hips
  const spineMid: Vec3 = [0, BONE_LENGTHS.torsoHeight * 0.5, 0];
  const leftHip: Vec3 = [BONE_LENGTHS.hipHalfWidth * mirrorSign, BONE_LENGTHS.torsoHeight, 0];
  const rightHip: Vec3 = [-BONE_LENGTHS.hipHalfWidth * mirrorSign, BONE_LENGTHS.torsoHeight, 0];

  // 3. Neck & Head
  const neck: Vec3 = [0, -BONE_LENGTHS.neck, 0];
  const head: Vec3 = [0, -(BONE_LENGTHS.neck + BONE_LENGTHS.headRadius), 0];

  // Eyes
  const leftEye: Vec3 = [0.07 * mirrorSign, head[1] - 0.03, 0.18];
  const rightEye: Vec3 = [-0.07 * mirrorSign, head[1] - 0.03, 0.18];

  // Eyebrows (lift +0.05 units when question is active)
  const browLift = isQuestion ? -0.05 : 0.0;
  const leftEyebrow: Vec3 = [0.08 * mirrorSign, head[1] - 0.08 + browLift, 0.19];
  const rightEyebrow: Vec3 = [-0.08 * mirrorSign, head[1] - 0.08 + browLift, 0.19];

  // 4. Arms direction retargeting
  // Left arm (Pose: 11=L_Shoulder, 13=L_Elbow, 15=L_Wrist)
  let rawLShoulder: Vec3 = [0.5, 0, 0];
  let rawLElbow: Vec3 = [0.45, 0.35, 0];
  let rawLWrist: Vec3 = [0.30, 0.45, 0];

  if (pose && pose.length > 16) {
    if (pose[11]) rawLShoulder = [pose[11][0], pose[11][1], pose[11][2] ?? 0];
    if (pose[13]) rawLElbow = [pose[13][0], pose[13][1], pose[13][2] ?? 0];
    if (pose[15]) rawLWrist = [pose[15][0], pose[15][1], pose[15][2] ?? 0];
  }

  // Right arm (Pose: 12=R_Shoulder, 14=R_Elbow, 16=R_Wrist)
  let rawRShoulder: Vec3 = [-0.5, 0, 0];
  let rawRElbow: Vec3 = [-0.45, 0.35, 0];
  let rawRWrist: Vec3 = [-0.30, 0.45, 0];

  if (pose && pose.length > 16) {
    if (pose[12]) rawRShoulder = [pose[12][0], pose[12][1], pose[12][2] ?? 0];
    if (pose[14]) rawRElbow = [pose[14][0], pose[14][1], pose[14][2] ?? 0];
    if (pose[16]) rawRWrist = [pose[16][0], pose[16][1], pose[16][2] ?? 0];
  }

  // Left arm directions
  const lUpperDir = vecNormalize(vecSub(rawLElbow, rawLShoulder), [-0.1, 0.8, 0.1]);
  const leftElbow = vecAdd(leftShoulder, vecScale(lUpperDir, BONE_LENGTHS.upperArm));

  const lForearmDir = vecNormalize(vecSub(rawLWrist, rawLElbow), [-0.2, 0.7, 0.3]);
  const leftWrist = vecAdd(leftElbow, vecScale(lForearmDir, BONE_LENGTHS.forearm));

  // Right arm directions
  const rUpperDir = vecNormalize(vecSub(rawRElbow, rawRShoulder), [0.1, 0.8, 0.1]);
  const rightElbow = vecAdd(rightShoulder, vecScale(rUpperDir, BONE_LENGTHS.upperArm));

  const rForearmDir = vecNormalize(vecSub(rawRWrist, rawRElbow), [0.2, 0.7, 0.3]);
  const rightWrist = vecAdd(rightElbow, vecScale(rForearmDir, BONE_LENGTHS.forearm));

  // 5. Retarget Hands with 21 articulated joint nodes
  const leftHand = retargetHand(leftWrist, frame.left_hand, false);
  const rightHand = retargetHand(rightWrist, frame.right_hand, true);

  return {
    neck,
    head,
    leftEye,
    rightEye,
    leftEyebrow,
    rightEyebrow,
    leftShoulder,
    rightShoulder,
    leftElbow,
    rightElbow,
    leftWrist,
    rightWrist,
    spineMid,
    leftHip,
    rightHip,
    leftHand,
    rightHand,
  };
}

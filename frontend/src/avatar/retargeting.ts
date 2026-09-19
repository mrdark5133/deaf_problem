/**
 * retargeting.ts — Direction-only landmark retargeting with fixed bone lengths (Hard Rule 3).
 *
 * Takes noisy/scaled landmark arrays from SignFrame and projects them onto
 * rigid, fixed-length anatomical bones so limbs never stretch, shrink, or distort in 3D.
 * Supports full-body mannequin geometry including pelvis, thighs, knees, shins, feet,
 * and articulated 21-joint hands.
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
  pelvisHeight: 0.15,
  thigh: 0.48,
  shin: 0.45,
  foot: 0.18,
  neck: 0.20,
  headRadius: 0.22,
  // Hand finger segments [metacarpal/CMC, proximal, intermediate, distal/tip]
  thumb: [0.045, 0.035, 0.028, 0.022],
  index: [0.052, 0.038, 0.026, 0.020],
  middle: [0.054, 0.040, 0.028, 0.022],
  ring: [0.050, 0.036, 0.025, 0.020],
  pinky: [0.045, 0.030, 0.022, 0.018],
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

// ─── Retargeted Full-Body & Hand Joints ───────────────────────────────────────

export interface RetargetedSkeleton {
  // Upper body joints
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
  // Lower body & pelvis joints
  pelvis: Vec3;
  leftHip: Vec3;
  rightHip: Vec3;
  leftKnee: Vec3;
  rightKnee: Vec3;
  leftAnkle: Vec3;
  rightAnkle: Vec3;
  leftFoot: Vec3;
  rightFoot: Vec3;
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
  // Thumb: 1 (CMC), 2 (MCP), 3 (IP), 4 (Tip)
  BONE_LENGTHS.thumb[0], BONE_LENGTHS.thumb[1], BONE_LENGTHS.thumb[2], BONE_LENGTHS.thumb[3],
  // Index: 5 (MCP), 6 (PIP), 7 (DIP), 8 (Tip)
  BONE_LENGTHS.index[0], BONE_LENGTHS.index[1], BONE_LENGTHS.index[2], BONE_LENGTHS.index[3],
  // Middle: 9 (MCP), 10 (PIP), 11 (DIP), 12 (Tip)
  BONE_LENGTHS.middle[0], BONE_LENGTHS.middle[1], BONE_LENGTHS.middle[2], BONE_LENGTHS.middle[3],
  // Ring: 13 (MCP), 14 (PIP), 15 (DIP), 16 (Tip)
  BONE_LENGTHS.ring[0], BONE_LENGTHS.ring[1], BONE_LENGTHS.ring[2], BONE_LENGTHS.ring[3],
  // Pinky: 17 (MCP), 18 (PIP), 19 (DIP), 20 (Tip)
  BONE_LENGTHS.pinky[0], BONE_LENGTHS.pinky[1], BONE_LENGTHS.pinky[2], BONE_LENGTHS.pinky[3],
];

function detectMediaPipeNegativeZ(pose: Landmark3D[] | undefined): boolean {
  if (!pose || pose.length < 17) return false;
  const shZ = ((pose[11]?.[2] ?? 0) + (pose[12]?.[2] ?? 0)) / 2;
  const wrZ = ((pose[15]?.[2] ?? 0) + (pose[16]?.[2] ?? 0)) / 2;
  // MediaPipe raw coordinates use negative Z for landmarks closer to camera
  return wrZ < shZ - 0.05;
}

function retargetHand(
  wrist: Vec3,
  rawHand: Landmark3D[] | null,
  isRight: boolean,
  isMediaPipeNegZ = false
): Vec3[] | null {
  if (!rawHand || rawHand.length < 21) return null;

  // Check if hand landmarks are dummy/identical placeholder coordinates
  const p0 = rawHand[0];
  const p4 = rawHand[4];
  const p8 = rawHand[8];
  if (
    p0 && p4 && p8 &&
    Math.abs(p0[0] - p4[0]) < 1e-4 &&
    Math.abs(p0[1] - p4[1]) < 1e-4 &&
    Math.abs(p0[0] - p8[0]) < 1e-4
  ) {
    return null;
  }

  const result: Vec3[] = [wrist];
  const sideSign = isRight ? 1 : -1;
  const zSign = isMediaPipeNegZ ? -1 : 1;

  for (let i = 1; i < 21; i++) {
    const parentIdx = HAND_PARENT_MAP[i];
    const parentPos = result[parentIdx];
    const rawCur = rawHand[i];
    const rawParent = rawHand[parentIdx];

    const rawDir: Vec3 = [
      rawCur[0] - rawParent[0],
      rawCur[1] - rawParent[1],
      (rawCur[2] !== undefined && rawParent[2] !== undefined)
        ? (rawCur[2] - rawParent[2]) * zSign
        : 0,
    ];

    // Natural resting defaults for each finger
    let defaultDir: Vec3 = [sideSign * 0.1, 0.85, 0.2];
    if (i <= 4) defaultDir = [sideSign * 0.4, 0.6, 0.2]; // Thumb
    else if (i <= 8) defaultDir = [sideSign * 0.15, 0.85, 0.2]; // Index
    else if (i <= 12) defaultDir = [0.0, 0.90, 0.2]; // Middle
    else if (i <= 16) defaultDir = [-sideSign * 0.1, 0.85, 0.2]; // Ring
    else defaultDir = [-sideSign * 0.2, 0.80, 0.2]; // Pinky

    const uDir = vecNormalize(rawDir, defaultDir);
    const segLength = FINGER_LENGTHS_MAP[i] || 0.025;

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
 * Retarget a raw SignFrame into a rigid full-body 3D skeleton with invariant bone lengths.
 */
export function retargetFrame(
  frame: SignFrame,
  isQuestion = false,
  mirrored = false,
  questionType: 'wh' | 'yes_no' | null = null
): RetargetedSkeleton {
  const pose = frame.pose;
  const isMediaPipeNegZ = detectMediaPipeNegativeZ(pose);
  const zSign = isMediaPipeNegZ ? -1 : 1;

  // 1. Shoulders anchor the coordinate frame at midpoint [0, 0, 0]
  const mirrorSign = mirrored ? -1 : 1;
  const leftShoulder: Vec3 = [BONE_LENGTHS.shoulderHalfWidth * mirrorSign, 0, 0];
  const rightShoulder: Vec3 = [-BONE_LENGTHS.shoulderHalfWidth * mirrorSign, 0, 0];

  // 2. Spine, Pelvis & Hips
  const spineMid: Vec3 = [0, BONE_LENGTHS.torsoHeight * 0.5, 0];
  const pelvis: Vec3 = [0, BONE_LENGTHS.torsoHeight, 0];
  const leftHip: Vec3 = [BONE_LENGTHS.hipHalfWidth * mirrorSign, BONE_LENGTHS.torsoHeight, 0];
  const rightHip: Vec3 = [-BONE_LENGTHS.hipHalfWidth * mirrorSign, BONE_LENGTHS.torsoHeight, 0];

  // 3. Lower Body: Thighs, Knees, Shins, Feet
  let rawLKnee: Vec3 = [0.32, 1.33, 0.05];
  let rawLAnkle: Vec3 = [0.32, 1.78, 0.0];
  let rawRKnee: Vec3 = [-0.32, 1.33, 0.05];
  let rawRAnkle: Vec3 = [-0.32, 1.78, 0.0];

  if (pose && pose.length > 28) {
    if (pose[25]) rawLKnee = [pose[25][0], pose[25][1], (pose[25][2] ?? 0) * zSign];
    if (pose[27]) rawLAnkle = [pose[27][0], pose[27][1], (pose[27][2] ?? 0) * zSign];
    if (pose[26]) rawRKnee = [pose[26][0], pose[26][1], (pose[26][2] ?? 0) * zSign];
    if (pose[28]) rawRAnkle = [pose[28][0], pose[28][1], (pose[28][2] ?? 0) * zSign];
  }

  // Left Leg
  const lThighDir = vecNormalize(
    [rawLKnee[0] - leftHip[0], rawLKnee[1] - leftHip[1], rawLKnee[2] - leftHip[2]],
    [0.02, 0.99, 0.05]
  );
  const leftKnee = vecAdd(leftHip, vecScale(lThighDir, BONE_LENGTHS.thigh));

  const lShinDir = vecNormalize(
    [rawLAnkle[0] - rawLKnee[0], rawLAnkle[1] - rawLKnee[1], rawLAnkle[2] - rawLKnee[2]],
    [0.0, 1.0, 0.0]
  );
  const leftAnkle = vecAdd(leftKnee, vecScale(lShinDir, BONE_LENGTHS.shin));
  const leftFoot = vecAdd(leftAnkle, [0.0, 0.02, BONE_LENGTHS.foot]);

  // Right Leg
  const rThighDir = vecNormalize(
    [rawRKnee[0] - rightHip[0], rawRKnee[1] - rightHip[1], rawRKnee[2] - rightHip[2]],
    [-0.02, 0.99, 0.05]
  );
  const rightKnee = vecAdd(rightHip, vecScale(rThighDir, BONE_LENGTHS.thigh));

  const rShinDir = vecNormalize(
    [rawRAnkle[0] - rawRKnee[0], rawRAnkle[1] - rawRKnee[1], rawRAnkle[2] - rawRKnee[2]],
    [0.0, 1.0, 0.0]
  );
  const rightAnkle = vecAdd(rightKnee, vecScale(rShinDir, BONE_LENGTHS.shin));
  const rightFoot = vecAdd(rightAnkle, [0.0, 0.02, BONE_LENGTHS.foot]);

  // 4. Neck & Head
  const neck: Vec3 = [0, -BONE_LENGTHS.neck, 0];
  const head: Vec3 = [0, -(BONE_LENGTHS.neck + BONE_LENGTHS.headRadius), 0];

  // Eyes (sitting on the front surface of head sphere facing camera at +Z)
  const leftEye: Vec3 = [0.07 * mirrorSign, -0.42, 0.21];
  const rightEye: Vec3 = [-0.07 * mirrorSign, -0.42, 0.21];

  // Eyebrows (ASL Grammar NMM: WH-question furrows brow; Yes/No question raises brow)
  let browLift = 0.0;
  if (isQuestion) {
    browLift = questionType === 'wh' ? -0.025 : 0.045;
  }
  const leftEyebrow: Vec3 = [0.075 * mirrorSign, -0.47 - browLift, 0.20];
  const rightEyebrow: Vec3 = [-0.075 * mirrorSign, -0.47 - browLift, 0.20];

  // 5. Arms direction retargeting
  // Left arm (Pose: 11=L_Shoulder, 13=L_Elbow, 15=L_Wrist)
  let rawLShoulder: Vec3 = [0.5, 0, 0];
  let rawLElbow: Vec3 = [0.55, 0.60, 0.08];
  let rawLWrist: Vec3 = [0.45, 1.10, 0.10];

  if (pose && pose.length > 16) {
    const shZ = pose[11]?.[2] ?? 0;
    if (pose[11]) rawLShoulder = [pose[11][0], pose[11][1], 0];
    if (pose[13]) rawLElbow = [pose[13][0], pose[13][1], (pose[13][2] ?? shZ) * zSign];
    if (pose[15]) rawLWrist = [pose[15][0], pose[15][1], (pose[15][2] ?? shZ) * zSign];
  }

  // Right arm (Pose: 12=R_Shoulder, 14=R_Elbow, 16=R_Wrist)
  let rawRShoulder: Vec3 = [-0.5, 0, 0];
  let rawRElbow: Vec3 = [-0.55, 0.60, 0.08];
  let rawRWrist: Vec3 = [-0.45, 1.10, 0.10];

  if (pose && pose.length > 16) {
    const shZ = pose[12]?.[2] ?? 0;
    if (pose[12]) rawRShoulder = [pose[12][0], pose[12][1], 0];
    if (pose[14]) rawRElbow = [pose[14][0], pose[14][1], (pose[14][2] ?? shZ) * zSign];
    if (pose[16]) rawRWrist = [pose[16][0], pose[16][1], (pose[16][2] ?? shZ) * zSign];
  }

  // Left arm directions (guarantee exact invariant bone length by normalizing 3D vector)
  const lUpperDir = vecNormalize(
    [
      rawLElbow[0] - rawLShoulder[0],
      rawLElbow[1] - rawLShoulder[1],
      Math.max(rawLElbow[2] - rawLShoulder[2], 0.04),
    ],
    [-0.1, 0.8, 0.15]
  );
  const leftElbow = vecAdd(leftShoulder, vecScale(lUpperDir, BONE_LENGTHS.upperArm));

  const lForearmDir = vecNormalize(
    [
      rawLWrist[0] - rawLElbow[0],
      rawLWrist[1] - rawLElbow[1],
      Math.max(rawLWrist[2] - rawLElbow[2], 0.14),
    ],
    [-0.2, 0.7, 0.35]
  );
  const leftWrist = vecAdd(leftElbow, vecScale(lForearmDir, BONE_LENGTHS.forearm));

  // Right arm directions (guarantee exact invariant bone length by normalizing 3D vector)
  const rUpperDir = vecNormalize(
    [
      rawRElbow[0] - rawRShoulder[0],
      rawRElbow[1] - rawRShoulder[1],
      Math.max(rawRElbow[2] - rawRShoulder[2], 0.04),
    ],
    [0.1, 0.8, 0.15]
  );
  const rightElbow = vecAdd(rightShoulder, vecScale(rUpperDir, BONE_LENGTHS.upperArm));

  const rForearmDir = vecNormalize(
    [
      rawRWrist[0] - rawRElbow[0],
      rawRWrist[1] - rawRElbow[1],
      Math.max(rawRWrist[2] - rawRElbow[2], 0.14),
    ],
    [0.2, 0.7, 0.35]
  );
  const rightWrist = vecAdd(rightElbow, vecScale(rForearmDir, BONE_LENGTHS.forearm));

  // 6. Retarget Hands with 21 articulated joint nodes
  const leftHand = retargetHand(leftWrist, frame.left_hand, false, isMediaPipeNegZ);
  const rightHand = retargetHand(rightWrist, frame.right_hand, true, isMediaPipeNegZ);

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
    pelvis,
    leftHip,
    rightHip,
    leftKnee,
    rightKnee,
    leftAnkle,
    rightAnkle,
    leftFoot,
    rightFoot,
    leftHand,
    rightHand,
  };
}

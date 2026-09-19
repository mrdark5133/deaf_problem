/**
 * Computer Vision processing utilities for SignBridge.
 * Includes normalization, wrist-proximity hand assignment, missing-frame interpolation, and smoothing.
 */

import type { Landmark3D, SignFrame } from '../lib/clipTypes';

// MediaPipe Pose Upper Body Landmark Indices
export const POSE_INDICES = {
  NOSE: 0,
  LEFT_EYE: 2,
  RIGHT_EYE: 5,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
};

/**
 * Calculates Euclidean distance between two 3D landmarks.
 */
export function distance3D(a: Landmark3D, b: Landmark3D): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Normalizes pose and hand landmarks:
 * - Origin (0,0,0) at the midpoint between left shoulder and right shoulder.
 * - Uniform scale normalized by shoulder width.
 */
export function normalizeFrame(
  poseLandmarks: Landmark3D[],
  leftHand: Landmark3D[] | null,
  rightHand: Landmark3D[] | null
): SignFrame {
  const leftShoulder = poseLandmarks[POSE_INDICES.LEFT_SHOULDER] || [0.2, 0.5, 0];
  const rightShoulder = poseLandmarks[POSE_INDICES.RIGHT_SHOULDER] || [-0.2, 0.5, 0];

  const midX = (leftShoulder[0] + rightShoulder[0]) / 2;
  const midY = (leftShoulder[1] + rightShoulder[1]) / 2;
  const midZ = (leftShoulder[2] + rightShoulder[2]) / 2;

  const shoulderWidth = distance3D(leftShoulder, rightShoulder) || 0.4;
  const scale = 1.0 / shoulderWidth;

  const transformLandmark = (lm: Landmark3D): Landmark3D => [
    (lm[0] - midX) * scale,
    (lm[1] - midY) * scale,
    (lm[2] - midZ) * scale,
  ];

  const normPose = poseLandmarks.map(transformLandmark);
  const normLeft = leftHand ? leftHand.map(transformLandmark) : null;
  const normRight = rightHand ? rightHand.map(transformLandmark) : null;

  return {
    pose: normPose,
    left_hand: normLeft,
    right_hand: normRight,
  };
}

/**
 * Assigns raw detected hands to Left or Right based on Euclidean proximity to pose wrists.
 * Solves MediaPipe mirror-flip handedness classification bugs.
 */
export function assignHandsByWristProximity(
  detectedHands: Landmark3D[][],
  poseLandmarks: Landmark3D[]
): { leftHand: Landmark3D[] | null; rightHand: Landmark3D[] | null } {
  if (!detectedHands.length) {
    return { leftHand: null, rightHand: null };
  }

  const leftPoseWrist = poseLandmarks[POSE_INDICES.LEFT_WRIST] || [0.3, 0.8, 0];
  const rightPoseWrist = poseLandmarks[POSE_INDICES.RIGHT_WRIST] || [-0.3, 0.8, 0];

  if (detectedHands.length === 1) {
    const hand = detectedHands[0];
    const handWrist = hand[0]; // Landmark 0 in hand is wrist
    const distLeft = distance3D(handWrist, leftPoseWrist);
    const distRight = distance3D(handWrist, rightPoseWrist);

    return distLeft < distRight
      ? { leftHand: hand, rightHand: null }
      : { leftHand: null, rightHand: hand };
  }

  // 2 hands detected
  const [handA, handB] = detectedHands;
  const distAtoLeft = distance3D(handA[0], leftPoseWrist);
  const distBtoLeft = distance3D(handB[0], leftPoseWrist);

  if (distAtoLeft < distBtoLeft) {
    return { leftHand: handA, rightHand: handB };
  } else {
    return { leftHand: handB, rightHand: handA };
  }
}

/**
 * Interpolates missing hand frames when gap is <= maxGap frames.
 */
export function interpolateMissingHandFrames(
  frames: SignFrame[],
  handKey: 'left_hand' | 'right_hand',
  maxGap: number = 3
): SignFrame[] {
  const result: SignFrame[] = frames.map((f) => ({ ...f }));
  const n = result.length;

  let i = 0;
  while (i < n) {
    if (result[i][handKey] === null) {
      const gapStart = i;
      while (i < n && result[i][handKey] === null) {
        i++;
      }
      const gapEnd = i;
      const gapLength = gapEnd - gapStart;

      // Only interpolate if bounded on both sides and gap is within threshold
      if (gapStart > 0 && gapEnd < n && gapLength <= maxGap) {
        const prevHand = result[gapStart - 1][handKey]!;
        const nextHand = result[gapEnd][handKey]!;

        for (let k = 0; k < gapLength; k++) {
          const t = (k + 1) / (gapLength + 1);
          const interpLandmarks: Landmark3D[] = prevHand.map((prevLm, idx) => {
            const nextLm = nextHand[idx];
            return [
              prevLm[0] + (nextLm[0] - prevLm[0]) * t,
              prevLm[1] + (nextLm[1] - prevLm[1]) * t,
              prevLm[2] + (nextLm[2] - prevLm[2]) * t,
            ];
          });
          result[gapStart + k][handKey] = interpLandmarks;
        }
      }
    } else {
      i++;
    }
  }

  return result;
}

/**
 * Smooths sequence of landmark frames with a weighted moving average window (window size 3).
 */
export function smoothSignFrames(frames: SignFrame[]): SignFrame[] {
  if (frames.length <= 2) return frames;

  const smoothed: SignFrame[] = [];

  for (let i = 0; i < frames.length; i++) {
    if (i === 0 || i === frames.length - 1) {
      smoothed.push(frames[i]);
      continue;
    }

    const prev = frames[i - 1];
    const curr = frames[i];
    const next = frames[i + 1];

    const smoothLandmarks = (
      p: Landmark3D[] | null,
      c: Landmark3D[] | null,
      n: Landmark3D[] | null
    ): Landmark3D[] | null => {
      if (!c) return null;
      if (!p || !n) return c;

      return c.map((lm, idx) => [
        p[idx][0] * 0.25 + lm[0] * 0.5 + n[idx][0] * 0.25,
        p[idx][1] * 0.25 + lm[1] * 0.5 + n[idx][1] * 0.25,
        p[idx][2] * 0.25 + lm[2] * 0.5 + n[idx][2] * 0.25,
      ]);
    };

    smoothed.push({
      pose: smoothLandmarks(prev.pose, curr.pose, next.pose) || curr.pose,
      left_hand: smoothLandmarks(prev.left_hand, curr.left_hand, next.left_hand),
      right_hand: smoothLandmarks(prev.right_hand, curr.right_hand, next.right_hand),
    });
  }

  return smoothed;
}

/**
 * Linear interpolation utilities for SignFrame blending.
 * Used by SignPlayer to blend between clips (~150 ms ease) and return-to-rest.
 */

import type { Landmark3D, SignFrame } from '../lib/clipTypes';

export function lerpLandmark(
  a: Landmark3D | undefined | null,
  b: Landmark3D | undefined | null,
  t: number
): Landmark3D {
  const ax = a && typeof a[0] === 'number' ? a[0] : 0;
  const ay = a && typeof a[1] === 'number' ? a[1] : 0;
  const az = a && typeof a[2] === 'number' ? a[2] : 0;

  const bx = b && typeof b[0] === 'number' ? b[0] : ax;
  const by = b && typeof b[1] === 'number' ? b[1] : ay;
  const bz = b && typeof b[2] === 'number' ? b[2] : az;

  return [
    ax + (bx - ax) * t,
    ay + (by - ay) * t,
    az + (bz - az) * t,
  ];
}

/** Lerp two arrays of landmarks even if lengths differ. */
export function lerpLandmarkArray(
  a: Landmark3D[] | null | undefined,
  b: Landmark3D[] | null | undefined,
  t: number
): Landmark3D[] {
  if (!a && !b) return [];
  const src = a || b || [];
  const tgt = b || a || [];
  const count = Math.max(src.length, tgt.length);
  const result: Landmark3D[] = [];
  for (let i = 0; i < count; i++) {
    result.push(lerpLandmark(src[i], tgt[i], t));
  }
  return result;
}

/**
 * Lerp two SignFrames.
 * - pose: always lerped across common landmarks.
 * - hands: lerped smoothly when present; fades gracefully otherwise.
 */
export function lerpFrames(a: SignFrame, b: SignFrame, t: number): SignFrame {
  const poseA = a?.pose || [];
  const poseB = b?.pose || [];
  const pose = lerpLandmarkArray(poseA, poseB, t);

  // Left hand
  let left_hand: Landmark3D[] | null = null;
  if (a?.left_hand && b?.left_hand) {
    left_hand = lerpLandmarkArray(a.left_hand, b.left_hand, t);
  } else if (b?.left_hand) {
    left_hand = t >= 0.5 ? b.left_hand : null;
  } else if (a?.left_hand) {
    left_hand = t < 0.5 ? a.left_hand : null;
  }

  // Right hand
  let right_hand: Landmark3D[] | null = null;
  if (a?.right_hand && b?.right_hand) {
    right_hand = lerpLandmarkArray(a.right_hand, b.right_hand, t);
  } else if (b?.right_hand) {
    right_hand = t >= 0.5 ? b.right_hand : null;
  } else if (a?.right_hand) {
    right_hand = t < 0.5 ? a.right_hand : null;
  }

  return { pose, left_hand, right_hand };
}

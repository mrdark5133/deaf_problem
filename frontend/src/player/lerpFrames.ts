/**
 * Linear interpolation utilities for SignFrame blending.
 * Used by SignPlayer to blend between clips (~150 ms ease) and return-to-rest.
 */

import type { Landmark3D, SignFrame } from '../lib/clipTypes';

/** Lerp a single 3D landmark. */
export function lerpLandmark(a: Landmark3D, b: Landmark3D, t: number): Landmark3D {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Lerp two equal-length arrays of landmarks. */
export function lerpLandmarkArray(
  a: Landmark3D[],
  b: Landmark3D[],
  t: number
): Landmark3D[] {
  return a.map((lmA, i) => lerpLandmark(lmA, b[i], t));
}

/**
 * Lerp two SignFrames.
 * - pose: always lerped (same count guaranteed by schema).
 * - hands: lerped only when both frames have the hand; otherwise fades in/out
 *   by lerping from/to a collapsed wrist position rather than snapping.
 */
export function lerpFrames(a: SignFrame, b: SignFrame, t: number): SignFrame {
  const pose = lerpLandmarkArray(a.pose, b.pose, t);

  // Left hand
  let left_hand: Landmark3D[] | null = null;
  if (a.left_hand && b.left_hand) {
    left_hand = lerpLandmarkArray(a.left_hand, b.left_hand, t);
  } else if (b.left_hand) {
    // Fade in: t < 0.5 hide, t >= 0.5 show target
    left_hand = t >= 0.5 ? b.left_hand : null;
  } else if (a.left_hand) {
    // Fade out: t < 0.5 show source, t >= 0.5 hide
    left_hand = t < 0.5 ? a.left_hand : null;
  }

  // Right hand
  let right_hand: Landmark3D[] | null = null;
  if (a.right_hand && b.right_hand) {
    right_hand = lerpLandmarkArray(a.right_hand, b.right_hand, t);
  } else if (b.right_hand) {
    right_hand = t >= 0.5 ? b.right_hand : null;
  } else if (a.right_hand) {
    right_hand = t < 0.5 ? a.right_hand : null;
  }

  return { pose, left_hand, right_hand };
}

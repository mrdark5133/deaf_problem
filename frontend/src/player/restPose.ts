/**
 * Static rest / idle pose for the SignBridge skeleton avatar.
 *
 * Coordinate system:
 *   - Origin (0, 0, 0) = midpoint between left and right shoulder.
 *   - Scale normalized by shoulder-width (shoulder ≈ ±0.5 on X axis).
 *   - +X = signer's left side.  +Y = downward.  +Z = toward camera.
 *
 * Pose landmark order (19 points, upper-body subset):
 *  0  Nose        1  L-eye-inner  2  L-eye       3  L-eye-outer
 *  4  R-eye-inner 5  R-eye        6  R-eye-outer  7  L-ear
 *  8  R-ear       9  Mouth-L     10  Mouth-R     11  L-shoulder
 * 12  R-shoulder  13  L-elbow    14  R-elbow     15  L-wrist
 * 16  R-wrist     17  L-hip      18  R-hip
 */

import type { SignFrame } from '../lib/clipTypes';

export const REST_POSE: SignFrame = {
  pose: [
    [0.0, -0.72, 0.02],    //  0 Nose
    [0.08, -0.80, 0.0],    //  1 L-eye-inner
    [0.13, -0.80, 0.0],    //  2 L-eye
    [0.17, -0.80, 0.0],    //  3 L-eye-outer
    [-0.08, -0.80, 0.0],   //  4 R-eye-inner
    [-0.13, -0.80, 0.0],   //  5 R-eye
    [-0.17, -0.80, 0.0],   //  6 R-eye-outer
    [0.24, -0.74, 0.0],    //  7 L-ear
    [-0.24, -0.74, 0.0],   //  8 R-ear
    [0.07, -0.57, 0.01],   //  9 Mouth-L
    [-0.07, -0.57, 0.01],  // 10 Mouth-R
    [0.50, 0.0, 0.0],      // 11 L-shoulder
    [-0.50, 0.0, 0.0],     // 12 R-shoulder
    [0.55, 0.60, 0.08],    // 13 L-elbow
    [-0.55, 0.60, 0.08],   // 14 R-elbow
    [0.45, 1.10, 0.10],    // 15 L-wrist  (arms at sides, relaxed)
    [-0.45, 1.10, 0.10],   // 16 R-wrist
    [0.35, 1.25, 0.0],     // 17 L-hip
    [-0.35, 1.25, 0.0],    // 18 R-hip
  ],
  left_hand: null,
  right_hand: null,
};

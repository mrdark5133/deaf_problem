/**
 * signCompiler.ts — Compiles SignSpec definitions into standard 30 FPS SignClip instances.
 */

import type { Landmark3D, SignClip, SignFrame } from '../lib/clipTypes';
import { evaluateSignSpecAtTime } from './signSolver';
import type { SignSpec } from './specTypes';

// Standard 33-point MediaPipe upper body rest pose template
function createUpperBodyPose(
  rightShoulder: [number, number, number],
  rightElbow: [number, number, number],
  rightWrist: [number, number, number],
  leftShoulder: [number, number, number],
  leftElbow: [number, number, number],
  leftWrist: [number, number, number]
): Landmark3D[] {
  const pose: Landmark3D[] = [];

  // 0: Nose, 1-3: Left eye, 4-6: Right eye, 7: Left ear, 8: Right ear, 9: Mouth left, 10: Mouth right
  pose.push([0.0, -0.60, 0.0]); // 0: Nose
  pose.push([0.03, -0.63, 0.0]); // 1
  pose.push([0.05, -0.63, 0.0]); // 2
  pose.push([0.07, -0.63, 0.0]); // 3
  pose.push([-0.03, -0.63, 0.0]); // 4
  pose.push([-0.05, -0.63, 0.0]); // 5
  pose.push([-0.07, -0.63, 0.0]); // 6
  pose.push([0.12, -0.61, 0.0]); // 7
  pose.push([-0.12, -0.61, 0.0]); // 8
  pose.push([0.04, -0.54, 0.0]); // 9
  pose.push([-0.04, -0.54, 0.0]); // 10

  // 11: Right Shoulder, 12: Left Shoulder (MediaPipe indices: 11 is right, 12 is left in standard anatomical/camera orientation)
  pose.push(rightShoulder); // 11
  pose.push(leftShoulder); // 12

  // 13: Right Elbow, 14: Left Elbow
  pose.push(rightElbow); // 13
  pose.push(leftElbow); // 14

  // 15: Right Wrist, 16: Left Wrist
  pose.push(rightWrist); // 15
  pose.push(leftWrist); // 16

  // 17-22: Hand knuckle points
  pose.push([rightWrist[0] + 0.02, rightWrist[1] + 0.05, rightWrist[2]]); // 17
  pose.push([leftWrist[0] - 0.02, leftWrist[1] + 0.05, leftWrist[2]]); // 18
  pose.push([rightWrist[0] + 0.03, rightWrist[1] + 0.07, rightWrist[2]]); // 19
  pose.push([leftWrist[0] - 0.03, leftWrist[1] + 0.07, leftWrist[2]]); // 20
  pose.push([rightWrist[0] + 0.01, rightWrist[1] + 0.06, rightWrist[2]]); // 21
  pose.push([leftWrist[0] - 0.01, leftWrist[1] + 0.06, leftWrist[2]]); // 22

  // 23: Right Hip, 24: Left Hip
  pose.push([0.30, 0.85, 0.0]); // 23
  pose.push([-0.30, 0.85, 0.0]); // 24

  // 25-32: Lower body legs/feet
  for (let i = 25; i <= 32; i++) {
    pose.push([0.0, 1.2, 0.0]);
  }

  return pose;
}

/**
 * Compiles a SignSpec into a standard 30 FPS SignClip.
 */
export function compileSignSpecToClip(
  spec: SignSpec,
  handshapeMap: Record<string, Landmark3D[]>
): SignClip {
  const fps = 30;
  const durationMs = spec.duration_ms || 1000;
  const totalFrames = Math.max(15, Math.round((durationMs / 1000) * fps));

  const frames: SignFrame[] = [];

  // Default rest arm pose for non-dominant arm when inactive
  const defaultLeftElbow: [number, number, number] = [-0.45, 0.35, 0.0];
  const defaultLeftWrist: [number, number, number] = [-0.30, 0.45, 0.0];

  for (let f = 0; f < totalFrames; f++) {
    const tNorm = f / (totalFrames - 1);
    const solved = evaluateSignSpecAtTime(spec, tNorm, handshapeMap);

    const rightShoulder = solved.dominantArm.shoulder;
    const rightElbow = solved.dominantArm.elbow;
    const rightWrist = solved.dominantArm.wrist;

    const leftShoulder = solved.nonDominantArm?.shoulder || [-0.5, 0.0, 0.0];
    const leftElbow = solved.nonDominantArm?.elbow || defaultLeftElbow;
    const leftWrist = solved.nonDominantArm?.wrist || defaultLeftWrist;

    const pose = createUpperBodyPose(
      rightShoulder,
      rightElbow,
      rightWrist,
      leftShoulder,
      leftElbow,
      leftWrist
    );

    const rightHand = solved.dominantArm.handLandmarks;
    const leftHand = solved.nonDominantArm?.handLandmarks || null;

    frames.push({
      pose,
      right_hand: rightHand,
      left_hand: leftHand,
    });
  }

  const clipId = spec.gloss.toLowerCase().replace(/[^a-z0-9]/g, '-');

  return {
    id: clipId,
    gloss: spec.gloss.toUpperCase(),
    fps,
    synthetic: false,
    source: 'handshape-spec',
    license: 'MIT',
    signer: spec.verified_by || 'handshape-spec-compiler',
    original_id: `spec-${clipId}`,
    verified: Boolean(spec.verified_by),
    verified_by: spec.verified_by,
    verified_at: spec.verified_at,
    frames,
    meta: {
      duration_ms: durationMs,
      recorded_at: new Date().toISOString(),
      notes: `Compiled from sign specification with canonical handshapes. Verified: ${spec.verified_by || 'false'}`,
    },
  };
}

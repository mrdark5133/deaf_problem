import type { SignFrame } from '../lib/clipTypes';
import { distance3D } from './cvUtils';

export type QualityVerdict = 'GREEN' | 'AMBER' | 'RED';

export interface QualityMetrics {
  totalFrames: number;
  missingHandRatio: number; // 0.0 (none missing) to 1.0 (all missing)
  avgJitter: number; // in landmark coordinate units
  boneLengthCoV: number; // coefficient of variation (0.0 to 1.0+)
  durationMs: number;
  overallScore: number; // 0 to 100
  verdict: QualityVerdict;
  issues: string[];
}

/**
 * Evaluates the quality of a recorded or imported SignBridge sign clip.
 * Returns automated metrics, an overall score (0-100), and a traffic-light verdict.
 */
export function evaluateClipQuality(
  frames: SignFrame[],
  fps: number = 30
): QualityMetrics {
  const totalFrames = frames.length;
  const issues: string[] = [];

  if (!frames || totalFrames === 0) {
    return {
      totalFrames: 0,
      missingHandRatio: 1.0,
      avgJitter: 0,
      boneLengthCoV: 0,
      durationMs: 0,
      overallScore: 0,
      verdict: 'RED',
      issues: ['No frames in clip.'],
    };
  }

  // 1. Missing hand frame ratio
  let missingHandFrames = 0;
  for (const f of frames) {
    if (!f.left_hand && !f.right_hand) {
      missingHandFrames++;
    }
  }
  const missingHandRatio = totalFrames > 0 ? missingHandFrames / totalFrames : 1.0;
  if (missingHandRatio > 0.30) {
    issues.push(`High missing hand ratio: ${(missingHandRatio * 100).toFixed(1)}% of frames lack hand landmarks.`);
  }

  // 2. Average frame-to-frame joint jitter
  let totalJitter = 0;
  let jitterCount = 0;

  for (let i = 1; i < totalFrames; i++) {
    const prev = frames[i - 1];
    const curr = frames[i];

    // Check right hand jitter
    if (prev.right_hand && curr.right_hand && prev.right_hand.length === curr.right_hand.length) {
      for (let j = 0; j < curr.right_hand.length; j++) {
        totalJitter += distance3D(prev.right_hand[j], curr.right_hand[j]);
        jitterCount++;
      }
    }
    // Check left hand jitter
    if (prev.left_hand && curr.left_hand && prev.left_hand.length === curr.left_hand.length) {
      for (let j = 0; j < curr.left_hand.length; j++) {
        totalJitter += distance3D(prev.left_hand[j], curr.left_hand[j]);
        jitterCount++;
      }
    }
    // Check pose wrist jitter
    if (prev.pose && curr.pose && prev.pose.length > 16 && curr.pose.length > 16) {
      totalJitter += distance3D(prev.pose[15], curr.pose[15]);
      totalJitter += distance3D(prev.pose[16], curr.pose[16]);
      jitterCount += 2;
    }
  }

  const avgJitter = jitterCount > 0 ? totalJitter / jitterCount : 0;
  if (avgJitter > 0.05) {
    issues.push(`Elevated joint jitter (${(avgJitter * 1000).toFixed(1)} mU/frame) exceeds threshold.`);
  }

  // 3. Bone length consistency (CoV) across frames for middle palm segment (wrist 0 -> middle MCP 9)
  const palmLengths: number[] = [];
  for (const f of frames) {
    const hand = f.right_hand || f.left_hand;
    if (hand && hand.length >= 10) {
      const len = distance3D(hand[0], hand[9]);
      if (len > 0.001) {
        palmLengths.push(len);
      }
    }
  }

  let boneLengthCoV = 0;
  if (palmLengths.length >= 3) {
    const mean = palmLengths.reduce((a, b) => a + b, 0) / palmLengths.length;
    const variance = palmLengths.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / palmLengths.length;
    const std = Math.sqrt(variance);
    boneLengthCoV = mean > 0 ? std / mean : 0;
  }

  if (boneLengthCoV > 0.35) {
    issues.push(`Inconsistent finger bone lengths (CoV ${(boneLengthCoV * 100).toFixed(1)}%).`);
  }

  // 4. Duration plausibility
  const durationMs = Math.round((totalFrames / fps) * 1000);
  let durationFactor = 1.0;
  if (durationMs < 400) {
    durationFactor = 0.5;
    issues.push(`Clip duration (${durationMs}ms) is unusually short for a complete ASL sign.`);
  } else if (durationMs > 3500) {
    durationFactor = 0.7;
    issues.push(`Clip duration (${durationMs}ms) is unusually long; consider trimming.`);
  }

  // 5. Composite Score Calculation (0 to 100)
  const handPresenceScore = Math.max(0, 1.0 - missingHandRatio) * 100;
  const jitterScore = Math.max(0, 1.0 - (avgJitter / 0.06)) * 100;
  const boneScore = Math.max(0, 1.0 - (boneLengthCoV / 0.40)) * 100;

  const rawScore = (
    handPresenceScore * 0.35 +
    jitterScore * 0.25 +
    boneScore * 0.25 +
    (durationFactor * 100) * 0.15
  );

  const overallScore = Math.min(100, Math.max(0, Math.round(rawScore)));

  // 6. Traffic-Light Verdict
  let verdict: QualityVerdict = 'GREEN';
  if (overallScore < 60 || missingHandRatio > 0.40) {
    verdict = 'RED';
    if (!issues.length) issues.push('Sign failed minimum acceptance criteria.');
  } else if (overallScore < 80) {
    verdict = 'AMBER';
  }

  return {
    totalFrames,
    missingHandRatio,
    avgJitter,
    boneLengthCoV,
    durationMs,
    overallScore,
    verdict,
    issues,
  };
}

/**
 * demoSpecs.test.ts — Unit tests and validation for Phase S3 Demo-Critical Signs.
 */

import { describe, it, expect } from 'vitest';
import { DEMO_SCENARIOS } from '../demo/demoScenarios';
import { SAMPLE_SPECS } from './sampleSpecs';
import { compileSignSpecToClip } from './signCompiler';
import type { Landmark3D } from '../lib/clipTypes';

describe('Demo Sign Specifications Validation (Phase S3)', () => {
  const dummyHandshapeMap: Record<string, Landmark3D[]> = {
    flat_b: Array.from({ length: 21 }, () => [0.0, 0.5, 0.0]),
    fist_s: Array.from({ length: 21 }, () => [0.0, 0.3, 0.0]),
    fist_a: Array.from({ length: 21 }, () => [0.0, 0.3, 0.0]),
    bent_v: Array.from({ length: 21 }, () => [0.0, 0.4, 0.0]),
    open_5: Array.from({ length: 21 }, () => [0.0, 0.5, 0.0]),
    flat_o: Array.from({ length: 21 }, () => [0.0, 0.3, 0.0]),
    index_1: Array.from({ length: 21 }, () => [0.0, 0.5, 0.0]),
    horns_y: Array.from({ length: 21 }, () => [0.0, 0.4, 0.0]),
    flat_m: Array.from({ length: 21 }, () => [0.0, 0.3, 0.0]),
    letter_e: Array.from({ length: 21 }, () => [0.0, 0.3, 0.0]),
    letter_i: Array.from({ length: 21 }, () => [0.0, 0.4, 0.0]),
    letter_n: Array.from({ length: 21 }, () => [0.0, 0.3, 0.0]),
    letter_u: Array.from({ length: 21 }, () => [0.0, 0.4, 0.0]),
  };

  it('verifies all sample specs compile cleanly into valid 30 FPS SignClips', () => {
    for (const [name, spec] of Object.entries(SAMPLE_SPECS)) {
      const clip = compileSignSpecToClip(spec, dummyHandshapeMap);
      expect(clip.id).toBeTruthy();
      expect(clip.gloss).toBe(name);
      expect(clip.fps).toBe(30);
      expect(clip.frames.length).toBeGreaterThanOrEqual(15);

      for (const frame of clip.frames) {
        expect(frame.pose.length).toBe(33);
        expect(frame.right_hand?.length).toBe(21);
        if (spec.hands === 'two') {
          expect(frame.left_hand?.length).toBe(21);
        }

        // Verify no NaNs in landmarks
        for (const pt of frame.pose) {
          expect(Number.isNaN(pt[0])).toBe(false);
          expect(Number.isNaN(pt[1])).toBe(false);
          expect(Number.isNaN(pt[2])).toBe(false);
        }
      }
    }
  });

  it('verifies demo scenarios contain zero unmapped tokens', () => {
    const allTokens = DEMO_SCENARIOS.flatMap((s) => s.sentences.flatMap((sent) => sent.tokens));
    expect(allTokens.length).toBeGreaterThan(0);

    for (const token of allTokens) {
      expect(token.clip_id).toBeTruthy();
      expect(token.gloss).toBeTruthy();
    }
  });
});

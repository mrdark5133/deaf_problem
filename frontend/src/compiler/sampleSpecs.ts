/**
 * sampleSpecs.ts — Verified and baseline sign specifications for ASL expressions (Phase S2).
 */

import type { SignSpec } from './specTypes';

export const SAMPLE_SPECS: Record<string, SignSpec> = {
  HELLO: {
    gloss: 'HELLO',
    hands: 'dominant',
    duration_ms: 1000,
    reference: 'Standard ASL Salute from temple moving outward and forward',
    verified_by: null,
    verified_at: null,
    keyframes: [
      {
        t: 0.0,
        dominant: {
          handshape: 'flat_b',
          palm: 'forward',
          fingers: 'up',
          location: 'temple',
          offset: [0.05, 0.0, 0.05],
        },
      },
      {
        t: 1.0,
        dominant: {
          handshape: 'flat_b',
          palm: 'forward',
          fingers: 'up',
          location: 'neutral',
          offset: [0.25, -0.15, 0.35],
        },
      },
    ],
  },

  'THANK-YOU': {
    gloss: 'THANK-YOU',
    hands: 'dominant',
    duration_ms: 1100,
    reference: 'Flat-B hand from chin/mouth moving outward and forward toward receiver',
    verified_by: null,
    verified_at: null,
    keyframes: [
      {
        t: 0.0,
        dominant: {
          handshape: 'flat_b',
          palm: 'toward_body',
          fingers: 'up',
          location: 'chin',
          offset: [0.0, 0.02, 0.06],
        },
      },
      {
        t: 1.0,
        dominant: {
          handshape: 'flat_b',
          palm: 'up',
          fingers: 'forward',
          location: 'neutral',
          offset: [0.05, 0.0, 0.32],
        },
      },
    ],
  },

  YES: {
    gloss: 'YES',
    hands: 'dominant',
    duration_ms: 900,
    reference: 'Fist-S hand nodding down at wrist like a head nodding yes',
    verified_by: null,
    verified_at: null,
    keyframes: [
      {
        t: 0.0,
        dominant: {
          handshape: 'fist_s',
          palm: 'forward',
          fingers: 'up',
          location: 'neutral',
          offset: [0.05, -0.10, 0.20],
        },
      },
      {
        t: 0.5,
        dominant: {
          handshape: 'fist_s',
          palm: 'forward',
          fingers: 'forward',
          location: 'neutral',
          offset: [0.05, 0.05, 0.25],
        },
      },
      {
        t: 1.0,
        dominant: {
          handshape: 'fist_s',
          palm: 'forward',
          fingers: 'up',
          location: 'neutral',
          offset: [0.05, -0.10, 0.20],
        },
      },
    ],
  },

  NO: {
    gloss: 'NO',
    hands: 'dominant',
    duration_ms: 850,
    reference: 'Index + middle snap onto thumb (H/N handshape closing onto thumb)',
    verified_by: null,
    verified_at: null,
    keyframes: [
      {
        t: 0.0,
        dominant: {
          handshape: 'letter_u',
          palm: 'forward',
          fingers: 'forward',
          location: 'neutral',
          offset: [0.08, -0.05, 0.22],
        },
      },
      {
        t: 1.0,
        dominant: {
          handshape: 'flat_o',
          palm: 'forward',
          fingers: 'forward',
          location: 'neutral',
          offset: [0.08, 0.0, 0.22],
        },
      },
    ],
  },

  PLEASE: {
    gloss: 'PLEASE',
    hands: 'dominant',
    duration_ms: 1200,
    reference: 'Flat-B hand circular motion over chest',
    verified_by: null,
    verified_at: null,
    keyframes: [
      {
        t: 0.0,
        dominant: {
          handshape: 'flat_b',
          palm: 'toward_body',
          fingers: 'left',
          location: 'chest',
          offset: [0.05, 0.0, 0.06],
        },
      },
      {
        t: 0.33,
        dominant: {
          handshape: 'flat_b',
          palm: 'toward_body',
          fingers: 'up',
          location: 'chest',
          offset: [-0.05, -0.06, 0.06],
        },
      },
      {
        t: 0.66,
        dominant: {
          handshape: 'flat_b',
          palm: 'toward_body',
          fingers: 'right',
          location: 'chest',
          offset: [-0.08, 0.04, 0.06],
        },
      },
      {
        t: 1.0,
        dominant: {
          handshape: 'flat_b',
          palm: 'toward_body',
          fingers: 'left',
          location: 'chest',
          offset: [0.05, 0.0, 0.06],
        },
      },
    ],
  },

  HELP: {
    gloss: 'HELP',
    hands: 'two',
    duration_ms: 1100,
    reference: 'Dominant fist-A with thumb up resting on non-dominant flat-B palm, lifted together',
    verified_by: null,
    verified_at: null,
    keyframes: [
      {
        t: 0.0,
        dominant: {
          handshape: 'fist_a',
          palm: 'left',
          fingers: 'up',
          location: 'neutral',
          offset: [0.0, 0.15, 0.20],
        },
        non_dominant: {
          handshape: 'flat_b',
          palm: 'up',
          fingers: 'forward',
          location: 'neutral',
          offset: [0.0, 0.18, 0.20],
        },
      },
      {
        t: 1.0,
        dominant: {
          handshape: 'fist_a',
          palm: 'left',
          fingers: 'up',
          location: 'neutral',
          offset: [0.0, -0.10, 0.22],
        },
        non_dominant: {
          handshape: 'flat_b',
          palm: 'up',
          fingers: 'forward',
          location: 'neutral',
          offset: [0.0, -0.07, 0.22],
        },
      },
    ],
  },
};

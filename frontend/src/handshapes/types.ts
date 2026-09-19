/**
 * types.ts — Type definitions for SignBridge Handshape-First Library & Wizard.
 */

import type { Landmark3D } from '../lib/clipTypes';

export interface CanonicalHandshape {
  id: string;
  name: string;
  category: 'fingerspell-alpha' | 'fingerspell-digit' | 'asl-classifier' | 'asl-standard';
  description?: string;
  canonicalLandmarks: Landmark3D[]; // Exactly 21 landmarks in canonical frame
  qualityScore: number;
  qualityVerdict: 'GREEN' | 'AMBER' | 'RED';
  spread: number;
  sampleCount: number;
  capturedAt: string;
  source: 'webcam-capture' | 'asl-mnist-baseline' | 'synthetic-baseline';
  verified: boolean;
  verifiedBy: string | null;
}

export interface HandshapeStabilityResult {
  score: number;
  verdict: 'GREEN' | 'AMBER' | 'RED';
  spread: number;
  validFrameCount: number;
}

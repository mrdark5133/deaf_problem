/**
 * specTypes.ts — Sign Specification types for Handshape-First Compiler (Phase S2).
 */

import type { Landmark3D } from '../lib/clipTypes';

export type DirectionName =
  | 'forward'
  | 'back'
  | 'toward_body'
  | 'away'
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'inward'
  | 'outward';

export type NamedLocation =
  | 'neutral'
  | 'chest'
  | 'chin'
  | 'mouth'
  | 'nose'
  | 'forehead'
  | 'temple'
  | 'cheek'
  | 'shoulder_ipsi'
  | 'shoulder_contra'
  | 'waist'
  | 'non_dominant_palm'
  | 'non_dominant_wrist';

export interface HandKeyframeSpec {
  handshape: string; // ID in data/handshapes/, e.g. "flat_b", "letter_d"
  palm: DirectionName | [number, number, number];
  fingers: DirectionName | [number, number, number];
  location: NamedLocation | [number, number, number];
  offset?: [number, number, number]; // [dx, dy, dz] in shoulder units
}

export interface KeyframeSpec {
  t: number; // Normalized time 0.0 to 1.0
  dominant: HandKeyframeSpec;
  non_dominant?: HandKeyframeSpec;
}

export interface SignSpec {
  gloss: string;
  hands: 'dominant' | 'two';
  duration_ms: number;
  repeat?: number;
  nmm?: {
    brows?: 'raised' | 'furrowed' | 'none';
    head_tilt?: 'left' | 'right' | 'forward' | 'back' | 'none';
    mouth?: string;
  };
  keyframes: KeyframeSpec[];
  verified_by: string | null;
  verified_at: string | null;
  reference: string;
}

export interface SolvedFrameArm {
  shoulder: [number, number, number];
  elbow: [number, number, number];
  wrist: [number, number, number];
  palmNormal: [number, number, number];
  fingerDir: [number, number, number];
  handLandmarks: Landmark3D[];
}

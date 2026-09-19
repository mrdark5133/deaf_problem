/**
 * SignBridge Sign Clip and Library Schema Types.
 */

export type Landmark3D = [number, number, number]; // [x, y, z] normalized coordinates

export interface SignFrame {
  // Pose landmarks: upper-body subset (nose, eyes, ears, mouth, shoulders, elbows, wrists, hips)
  pose: Landmark3D[];
  // 21 hand landmarks for left hand or null if offscreen/not detected
  left_hand: Landmark3D[] | null;
  // 21 hand landmarks for right hand or null if offscreen/not detected
  right_hand: Landmark3D[] | null;
}

export interface SignClipMeta {
  duration_ms: number;
  recorded_at: string;
  notes?: string;
}

export interface SignClip {
  id: string;
  gloss: string;
  fps: number;
  synthetic: boolean;
  signer?: string;
  source?: string;
  license?: string;
  original_id?: string;
  frames: SignFrame[];
  meta: SignClipMeta;
}

export interface SignIndexEntry {
  id: string;
  gloss: string;
  category: string;
  synthetic: boolean;
  source?: string;
  license?: string;
  original_id?: string;
  file: string;
  fps: number;
  duration_ms: number;
}

export interface SignLibraryIndex {
  version: string;
  sign_language: string;
  total_signs: number;
  real_signs: number;
  synthetic_signs: number;
  signs: Record<string, SignIndexEntry>;
}

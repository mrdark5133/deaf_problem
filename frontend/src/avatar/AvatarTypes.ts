/**
 * Avatar rendering types and interfaces.
 */

import type { SignFrame } from '../lib/clipTypes';

export type AvatarMode = '2d' | '3d';

export type CameraPreset = 'front' | 'three-quarter' | 'hands';

export interface AvatarThemeColors {
  body: string;
  joints: string;
  rightHand: string;
  leftHand: string;
  head: string;
  eyes: string;
  brows: string;
  background: string;
}

export interface AvatarRendererProps {
  frame: SignFrame;
  isIdle: boolean;
  mirrored?: boolean;
  highContrast?: boolean;
  isQuestion?: boolean;
  badge?: string;
  className?: string;
  cameraPreset?: CameraPreset;
  onFpsUpdate?: (fps: number) => void;
  onFallback?: (reason: string) => void;
}

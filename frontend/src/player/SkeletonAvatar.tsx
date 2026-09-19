/**
 * SkeletonAvatar — 2D canvas skeleton renderer for SignBridge.
 *
 * Renders a MediaPipe upper-body skeleton with detailed 21-landmark hands.
 * Uses ResizeObserver to fill its container at any size.
 *
 * Coordinate system expected (normalized SignFrame):
 *   - Origin at shoulder midpoint.
 *   - Shoulder half-width ≈ 0.5 units.
 *   - +X = signer's left, +Y = down, +Z = toward camera.
 */

import React, { useEffect, useRef } from 'react';
import type { Landmark3D, SignFrame } from '../lib/clipTypes';

// ─── Pose landmark indices ────────────────────────────────────────────────────
const NOSE = 0;
const L_EYE = 2;
const R_EYE = 5;
const L_EAR = 7;
const R_EAR = 8;
const MOUTH_L = 9;
const MOUTH_R = 10;
const L_SHOULDER = 11;
const R_SHOULDER = 12;
const L_ELBOW = 13;
const R_ELBOW = 14;
const L_WRIST = 15;
const R_WRIST = 16;
const L_HIP = 17;
const R_HIP = 18;

// MediaPipe hand landmark connections
const HAND_CONNECTIONS: [number, number][] = [
  // Palm
  [0, 1], [0, 5], [0, 17], [5, 9], [9, 13], [13, 17],
  // Thumb
  [1, 2], [2, 3], [3, 4],
  // Index
  [5, 6], [6, 7], [7, 8],
  // Middle
  [9, 10], [10, 11], [11, 12],
  // Ring
  [13, 14], [14, 15], [15, 16],
  // Pinky
  [17, 18], [18, 19], [19, 20],
];

// ─── Drawing helpers ──────────────────────────────────────────────────────────

interface DrawCtx {
  ctx: CanvasRenderingContext2D;
  cx: number; // canvas center X
  cy: number; // canvas origin Y (mapped to shoulder-mid)
  scale: number;
  mirrored?: boolean;
  highContrast?: boolean;
}

function project(lm: Landmark3D, d: DrawCtx): [number, number] {
  const xOffset = d.mirrored ? -lm[0] * d.scale : lm[0] * d.scale;
  return [d.cx + xOffset, d.cy + lm[1] * d.scale];
}

function drawLine(
  d: DrawCtx,
  a: Landmark3D,
  b: Landmark3D,
  color: string,
  lineWidth = 3
) {
  const [ax, ay] = project(a, d);
  const [bx, by] = project(b, d);
  d.ctx.beginPath();
  d.ctx.moveTo(ax, ay);
  d.ctx.lineTo(bx, by);
  d.ctx.strokeStyle = color;
  d.ctx.lineWidth = lineWidth;
  d.ctx.lineCap = 'round';
  d.ctx.stroke();
}

function drawDot(
  d: DrawCtx,
  lm: Landmark3D,
  radius: number,
  fillColor: string,
  strokeColor = 'rgba(255,255,255,0.6)',
  strokeWidth = 1.5
) {
  const [x, y] = project(lm, d);
  d.ctx.beginPath();
  d.ctx.arc(x, y, radius, 0, Math.PI * 2);
  d.ctx.fillStyle = fillColor;
  d.ctx.fill();
  if (strokeWidth > 0) {
    d.ctx.lineWidth = strokeWidth;
    d.ctx.strokeStyle = strokeColor;
    d.ctx.stroke();
  }
}

function drawHand(d: DrawCtx, landmarks: Landmark3D[], color: string, glowColor: string) {
  // Glow pass
  d.ctx.save();
  d.ctx.shadowBlur = 10;
  d.ctx.shadowColor = glowColor;

  for (const [a, b] of HAND_CONNECTIONS) {
    if (landmarks[a] && landmarks[b]) {
      drawLine(d, landmarks[a], landmarks[b], color, 2.5);
    }
  }

  // Fingertips (4, 8, 12, 16, 20)
  for (const tip of [4, 8, 12, 16, 20]) {
    if (landmarks[tip]) {
      drawDot(d, landmarks[tip], 4, color, 'rgba(255,255,255,0.8)', 1.5);
    }
  }
  // Wrist dot
  if (landmarks[0]) {
    drawDot(d, landmarks[0], 5, 'rgba(255,255,255,0.9)', color, 2);
  }

  d.ctx.restore();
}

function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  frame: SignFrame,
  isIdle: boolean,
  mirrored = false,
  highContrast = false
) {
  const pose = frame.pose;
  if (!pose || pose.length < 19) return;

  // Dynamic scale: shoulder to shoulder ≈ 1.0 unit, target ~40 % of min dimension
  const scale = Math.min(w, h) * 0.32;
  const cx = w / 2;
  const cy = h * 0.46;
  const d: DrawCtx = { ctx, cx, cy, scale, mirrored, highContrast };

  const BODY_COLOR = highContrast
    ? '#ffffff'
    : isIdle
    ? 'rgba(148, 163, 184, 0.55)' // slate-300 muted when idle
    : 'rgba(129, 140, 248, 0.9)'; // indigo-400 when playing
  const JOINT_COLOR = highContrast
    ? '#facc15'
    : isIdle
    ? 'rgba(148, 163, 184, 0.7)'
    : 'rgba(199, 210, 254, 0.95)';
  const BODY_GLOW = highContrast
    ? 'rgba(250, 204, 21, 0.5)'
    : isIdle
    ? 'rgba(99,102,241,0.1)'
    : 'rgba(99,102,241,0.35)';

  const RIGHT_HAND_COLOR = highContrast ? '#facc15' : 'rgba(129,140,248,1)';
  const RIGHT_HAND_GLOW = highContrast ? 'rgba(250, 204, 21, 0.8)' : 'rgba(99,102,241,0.6)';
  const LEFT_HAND_COLOR = highContrast ? '#22d3ee' : 'rgba(34,211,238,1)';
  const LEFT_HAND_GLOW = highContrast ? 'rgba(34, 211, 238, 0.8)' : 'rgba(6,182,212,0.6)';

  ctx.save();
  ctx.shadowBlur = isIdle ? 6 : (highContrast ? 24 : 18);
  ctx.shadowColor = BODY_GLOW;

  const lineWidthBase = highContrast ? 5 : 4;

  // ── Torso ─────────────────────────────────────────────────────────────────
  // Shoulder bar
  drawLine(d, pose[L_SHOULDER], pose[R_SHOULDER], BODY_COLOR, lineWidthBase);
  // Hip bar
  drawLine(d, pose[L_HIP], pose[R_HIP], BODY_COLOR, lineWidthBase);
  // Spine (shoulder mid → hip mid)
  const shMid: Landmark3D = [
    (pose[L_SHOULDER][0] + pose[R_SHOULDER][0]) / 2,
    (pose[L_SHOULDER][1] + pose[R_SHOULDER][1]) / 2,
    0,
  ];
  const hipMid: Landmark3D = [
    (pose[L_HIP][0] + pose[R_HIP][0]) / 2,
    (pose[L_HIP][1] + pose[R_HIP][1]) / 2,
    0,
  ];
  drawLine(d, shMid, hipMid, BODY_COLOR, lineWidthBase * 0.9);

  // ── Arms ──────────────────────────────────────────────────────────────────
  // Left arm
  drawLine(d, pose[L_SHOULDER], pose[L_ELBOW], BODY_COLOR, lineWidthBase);
  drawLine(d, pose[L_ELBOW], pose[L_WRIST], BODY_COLOR, lineWidthBase * 0.9);
  // Right arm
  drawLine(d, pose[R_SHOULDER], pose[R_ELBOW], BODY_COLOR, lineWidthBase);
  drawLine(d, pose[R_ELBOW], pose[R_WRIST], BODY_COLOR, lineWidthBase * 0.9);

  ctx.restore();

  // ── Joints ────────────────────────────────────────────────────────────────
  const jointRadius = highContrast ? 6 : 5;
  for (const idx of [L_SHOULDER, R_SHOULDER, L_ELBOW, R_ELBOW, L_WRIST, R_WRIST, L_HIP, R_HIP]) {
    if (pose[idx]) {
      drawDot(d, pose[idx], jointRadius, JOINT_COLOR, BODY_COLOR, 2);
    }
  }

  // ── Head ──────────────────────────────────────────────────────────────────
  if (pose[NOSE]) {
    const [nx, ny] = project(pose[NOSE], d);
    const headR = scale * 0.24;

    // Head circle
    ctx.save();
    ctx.shadowBlur = isIdle ? 8 : (highContrast ? 25 : 20);
    ctx.shadowColor = BODY_GLOW;

    const grad = ctx.createRadialGradient(nx, ny - headR * 0.2, headR * 0.1, nx, ny, headR);
    if (highContrast) {
      grad.addColorStop(0, '#000000');
      grad.addColorStop(1, '#0f172a');
    } else {
      grad.addColorStop(0, isIdle ? 'rgba(71,85,105,0.85)' : 'rgba(67,56,202,0.6)');
      grad.addColorStop(1, isIdle ? 'rgba(30,41,59,0.7)' : 'rgba(49,46,129,0.5)');
    }
    ctx.beginPath();
    ctx.arc(nx, ny, headR, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = highContrast ? 3 : 2;
    ctx.strokeStyle = highContrast ? '#facc15' : JOINT_COLOR;
    ctx.stroke();
    ctx.restore();

    // Eyes
    const eyeR = scale * (highContrast ? 0.03 : 0.025);
    const eyeColor = highContrast ? '#ffffff' : JOINT_COLOR;
    if (pose[L_EYE]) drawDot(d, pose[L_EYE], eyeR, eyeColor, 'transparent', 0);
    if (pose[R_EYE]) drawDot(d, pose[R_EYE], eyeR, eyeColor, 'transparent', 0);

    // Ears
    if (pose[L_EAR]) drawDot(d, pose[L_EAR], eyeR * 1.4, BODY_COLOR, 'transparent', 0);
    if (pose[R_EAR]) drawDot(d, pose[R_EAR], eyeR * 1.4, BODY_COLOR, 'transparent', 0);

    // Mouth line
    if (pose[MOUTH_L] && pose[MOUTH_R]) {
      drawLine(d, pose[MOUTH_L], pose[MOUTH_R], eyeColor, highContrast ? 2.5 : 1.5);
    }
  }

  // ── Hands ─────────────────────────────────────────────────────────────────
  if (frame.right_hand) {
    drawHand(d, frame.right_hand, RIGHT_HAND_COLOR, RIGHT_HAND_GLOW);
  }
  if (frame.left_hand) {
    drawHand(d, frame.left_hand, LEFT_HAND_COLOR, LEFT_HAND_GLOW);
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface SkeletonAvatarProps {
  frame: SignFrame;
  isIdle?: boolean;
  mirrored?: boolean;
  highContrast?: boolean;
  /** Optional overlay text (e.g. SYNTHETIC badge). */
  badge?: string;
  className?: string;
}

export const SkeletonAvatar: React.FC<SkeletonAvatarProps> = ({
  frame,
  isIdle = false,
  mirrored = false,
  highContrast = false,
  badge,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Keep a ref to the latest frame to avoid closure staleness in ResizeObserver
  const frameRef = useRef<SignFrame>(frame);
  const idleRef = useRef<boolean>(isIdle);
  const mirroredRef = useRef<boolean>(mirrored);
  const highContrastRef = useRef<boolean>(highContrast);
  frameRef.current = frame;
  idleRef.current = isIdle;
  mirroredRef.current = mirrored;
  highContrastRef.current = highContrast;

  // Resize canvas when container size changes
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          canvas.width = width * devicePixelRatio;
          canvas.height = height * devicePixelRatio;
          canvas.style.width = `${width}px`;
          canvas.style.height = `${height}px`;
          // Re-draw at new size
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.scale(devicePixelRatio, devicePixelRatio);
            drawFrame(
              ctx,
              width,
              height,
              frameRef.current,
              idleRef.current,
              mirroredRef.current,
              highContrastRef.current
            );
          }
        }
      }
    });

    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // Re-draw on every frame update
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      drawFrame(ctx, w, h, frame, isIdle, mirrored, highContrast);
    }
  }, [frame, isIdle, mirrored, highContrast]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden ${className}`}
      role="img"
      aria-label="ASL signing avatar"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ imageRendering: 'auto' }}
      />
      {badge && (
        <div className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-amber-950/80 border border-amber-700/60 text-amber-300 select-none pointer-events-none">
          {badge}
        </div>
      )}
    </div>
  );
};

// ─── Internal draw function (extracted so ResizeObserver can call it) ─────────
function drawFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  frame: SignFrame,
  isIdle: boolean,
  mirrored = false,
  highContrast = false
) {
  ctx.clearRect(0, 0, w, h);

  // Background gradient
  const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
  bg.addColorStop(0, 'rgba(15, 23, 42, 0.0)'); // transparent center
  bg.addColorStop(1, 'rgba(2, 6, 23, 0.0)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  drawSkeleton(ctx, w, h, frame, isIdle, mirrored, highContrast);
}

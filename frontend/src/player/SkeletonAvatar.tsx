/**
 * SkeletonAvatar — High-Precision, Anatomically Clear 2D Canvas ASL Avatar.
 *
 * Minimalist Mono Edition (White Background / Studio Crisp Lines):
 *  1. Dynamic Mid-Shoulder Anchoring: Auto-centers and scales across synthetic & real signs.
 *  2. 3D Palm Orientation Shading: Vector normal calculates anterior (palm), posterior (dorsum),
 *     or lateral blade view with realistic palm creases and knuckle plates.
 *  3. Z-Depth Sorted Finger Rendering: Outlined tapered phalanx bones with joint rings and
 *     bright glowing fingertip pads so overlapping fingers never blur.
 *  4. Luminous Dominant/Base Hand Distinction: Dominant (Right) = Sun Amber; Base (Left) = Electric Cyan.
 *  5. Motion Trajectory Ribbon: Fading spline path showing hand movement dynamics.
 *  6. Anatomical Torso & Limb Layering: Contoured chest plate, clavicle, spine, and arm capsules.
 *  7. Non-Manual Facial Expression: Dynamic question-lifting eyebrows, eyes, and mouth arc.
 *  8. High-DPI Retina Rendering with anti-aliasing and High-Contrast Mode support.
 */

import React, { useEffect, useRef } from 'react';
import type { Landmark3D, SignFrame } from '../lib/clipTypes';

// ─── MediaPipe Landmark Index Constants ────────────────────────────────────────
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

// Finger definitions: [root, mcp, pip, dip, tip]
const FINGER_CHAINS = [
  { name: 'thumb', indices: [0, 1, 2, 3, 4] },
  { name: 'index', indices: [0, 5, 6, 7, 8] },
  { name: 'middle', indices: [0, 9, 10, 11, 12] },
  { name: 'ring', indices: [0, 13, 14, 15, 16] },
  { name: 'pinky', indices: [0, 17, 18, 19, 20] },
];

const PALM_INDICES = [0, 1, 5, 9, 13, 17];

interface TrailPoint {
  x: number;
  y: number;
  age: number;
}

interface DrawCtx {
  ctx: CanvasRenderingContext2D;
  cx: number;
  cy: number;
  scale: number;
  mirrored?: boolean;
  highContrast?: boolean;
  isQuestion?: boolean;
  questionType?: 'wh' | 'yes_no' | null;
}

function project(lm: Landmark3D, d: DrawCtx): [number, number] {
  const xOffset = d.mirrored ? -lm[0] * d.scale : lm[0] * d.scale;
  return [d.cx + xOffset, d.cy + lm[1] * d.scale];
}

/**
 * Calculates the 3D normal vector of the palm to determine orientation.
 * Returns Nz: > 0 => Palm facing camera; < 0 => Back of hand facing camera.
 */
function getPalmNormalZ(landmarks: Landmark3D[]): number {
  if (!landmarks || landmarks.length < 21) return 1.0;
  const p0 = landmarks[0];   // Wrist
  const p5 = landmarks[5];   // Index MCP
  const p17 = landmarks[17]; // Pinky MCP

  const v1x = p5[0] - p0[0];
  const v1y = p5[1] - p0[1];
  const v2x = p17[0] - p0[0];
  const v2y = p17[1] - p0[1];

  // 2D cross product Z-component
  return v1x * v2y - v1y * v2x;
}

/**
 * Draw a clean rounded capsule limb (e.g. upper arm, forearm, finger phalanx)
 * with distinct start/end widths and high-contrast outline borders.
 */
function drawCapsule(
  d: DrawCtx,
  a: Landmark3D,
  b: Landmark3D,
  widthA: number,
  widthB: number,
  fillColor: string,
  strokeColor: string,
  strokeWidth = 1.5
) {
  const [ax, ay] = project(a, d);
  const [bx, by] = project(b, d);
  const ctx = d.ctx;

  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy);
  if (len < 0.5) return;

  const nx = -dy / len;
  const ny = dx / len;

  const rA = widthA / 2;
  const rB = widthB / 2;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(ax + nx * rA, ay + ny * rA);
  ctx.lineTo(bx + nx * rB, by + ny * rB);
  ctx.arc(bx, by, rB, Math.atan2(ny, nx), Math.atan2(-ny, -nx), false);
  ctx.lineTo(ax - nx * rA, ay - ny * rA);
  ctx.arc(ax, ay, rA, Math.atan2(-ny, -nx), Math.atan2(ny, nx), false);
  ctx.closePath();

  ctx.fillStyle = fillColor;
  ctx.fill();

  if (strokeWidth > 0) {
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = strokeColor;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
  ctx.restore();
}

function drawDot(
  d: DrawCtx,
  lm: Landmark3D,
  radius: number,
  fillColor: string,
  strokeColor = '#000000',
  strokeWidth = 1.5
) {
  const [x, y] = project(lm, d);
  const ctx = d.ctx;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = fillColor;
  ctx.fill();
  if (strokeWidth > 0) {
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = strokeColor;
    ctx.stroke();
  }
}

/**
 * Renders an articulated 21-landmark hand with depth-sorted fingers,
 * palm facet orientation shading, and glowing high-visibility fingertip nodes.
 */
function drawHighPrecisionHand(
  d: DrawCtx,
  landmarks: Landmark3D[],
  isRightHand: boolean
) {
  if (!landmarks || landmarks.length < 21) return;
  const ctx = d.ctx;
  const hc = d.highContrast;

  // Palm orientation detection
  const palmNormal = getPalmNormalZ(landmarks);
  const isPalmFacing = isRightHand ? palmNormal > 0 : palmNormal < 0;

  // Colors
  const baseColor = hc
    ? (isRightHand ? '#facc15' : '#38bdf8')
    : (isRightHand ? '#d97706' : '#0284c7'); // Rich Amber vs Cyan

  const darkOutline = hc ? '#000000' : '#0f172a';

  const palmFill = hc
    ? (isPalmFacing ? 'rgba(250, 204, 21, 0.35)' : 'rgba(250, 204, 21, 0.18)')
    : (isRightHand
        ? (isPalmFacing ? 'rgba(217, 119, 6, 0.22)' : 'rgba(180, 83, 9, 0.15)')
        : (isPalmFacing ? 'rgba(2, 132, 199, 0.22)' : 'rgba(14, 116, 144, 0.15)'));

  // 1. Shaded Palm Polygon (shows palm orientation)
  ctx.save();
  ctx.beginPath();
  const [p0x, p0y] = project(landmarks[PALM_INDICES[0]], d);
  ctx.moveTo(p0x, p0y);
  for (let i = 1; i < PALM_INDICES.length; i++) {
    const [px, py] = project(landmarks[PALM_INDICES[i]], d);
    ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = palmFill;
  ctx.fill();

  ctx.lineWidth = 1.8;
  ctx.strokeStyle = baseColor;
  ctx.stroke();

  // Palm interior crease / knuckle plate cues
  if (isPalmFacing) {
    const [wX, wY] = project(landmarks[0], d);
    const [mMCPx, mMCPy] = project(landmarks[9], d);
    ctx.beginPath();
    ctx.moveTo(wX * 0.4 + mMCPx * 0.6, wY * 0.4 + mMCPy * 0.6);
    ctx.lineTo(wX * 0.2 + mMCPx * 0.8, wY * 0.2 + mMCPy * 0.8);
    ctx.strokeStyle = hc ? 'rgba(255, 255, 255, 0.6)' : 'rgba(15, 23, 42, 0.35)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  } else {
    const [iX, iY] = project(landmarks[5], d);
    const [pX, pY] = project(landmarks[17], d);
    ctx.beginPath();
    ctx.moveTo(iX, iY);
    ctx.lineTo(pX, pY);
    ctx.strokeStyle = hc ? 'rgba(255, 255, 255, 0.6)' : 'rgba(15, 23, 42, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();

  // 2. Metacarpal Palm Rays (Wrist to MCP joints)
  const mcpJoints = [1, 5, 9, 13, 17];
  for (const mcp of mcpJoints) {
    if (landmarks[mcp]) {
      drawCapsule(
        d,
        landmarks[0],
        landmarks[mcp],
        3.5,
        3.0,
        hc ? 'rgba(255,255,255,0.15)' : 'rgba(15, 23, 42, 0.1)',
        darkOutline,
        0.8
      );
    }
  }

  // 3. Depth-Sorted Finger Chains (Draw furthest finger first to prevent overlap blurring)
  const fingerDepths = FINGER_CHAINS.map((chain, chainIdx) => {
    let avgZ = 0;
    for (const idx of chain.indices) {
      avgZ += landmarks[idx]?.[2] ?? 0;
    }
    return { chain, chainIdx, avgZ: avgZ / chain.indices.length };
  });

  fingerDepths.sort((a, b) => b.avgZ - a.avgZ);

  for (const { chain } of fingerDepths) {
    const idxs = chain.indices;

    // Phalange 1: MCP -> PIP
    if (landmarks[idxs[1]] && landmarks[idxs[2]]) {
      drawCapsule(
        d,
        landmarks[idxs[1]],
        landmarks[idxs[2]],
        4.8,
        4.2,
        baseColor,
        darkOutline,
        1.2
      );
    }

    // Phalange 2: PIP -> DIP
    if (landmarks[idxs[2]] && landmarks[idxs[3]]) {
      drawCapsule(
        d,
        landmarks[idxs[2]],
        landmarks[idxs[3]],
        4.2,
        3.6,
        baseColor,
        darkOutline,
        1.2
      );
    }

    // Phalange 3: DIP -> Tip
    if (landmarks[idxs[3]] && landmarks[idxs[4]]) {
      drawCapsule(
        d,
        landmarks[idxs[3]],
        landmarks[idxs[4]],
        3.6,
        2.8,
        baseColor,
        darkOutline,
        1.2
      );
    }

    // Articulated Knuckle & PIP Joint Rings
    for (let j = 1; j <= 3; j++) {
      if (landmarks[idxs[j]]) {
        drawDot(
          d,
          landmarks[idxs[j]],
          j === 1 ? 2.8 : 2.2,
          hc ? '#000000' : '#ffffff',
          darkOutline,
          1.0
        );
      }
    }

    // 4. Glowing Fingertip Node (Sharp contrast pad for pinch & touch handshapes)
    const tipIdx = idxs[4];
    if (landmarks[tipIdx]) {
      const tipColor = hc ? '#ffffff' : isRightHand ? '#f59e0b' : '#0284c7';
      drawDot(d, landmarks[tipIdx], 3.5, tipColor, darkOutline, 1.2);
    }
  }

  // 5. Wrist Joint Pivot
  drawDot(
    d,
    landmarks[0],
    5.0,
    hc ? '#facc15' : baseColor,
    darkOutline,
    1.5
  );
}

export interface SkeletonAvatarProps {
  frame: SignFrame;
  isIdle: boolean;
  mirrored?: boolean;
  highContrast?: boolean;
  isQuestion?: boolean;
  questionType?: 'wh' | 'yes_no' | null;
  badge?: string;
  className?: string;
}

export const SkeletonAvatar: React.FC<SkeletonAvatarProps> = ({
  frame,
  isIdle,
  mirrored = false,
  highContrast = false,
  isQuestion = false,
  questionType = null,
  badge,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const trailsRef = useRef<TrailPoint[]>([]);

  // Track wrist motion trail for gesture ghosting
  useEffect(() => {
    const rWrist = frame.pose?.[R_WRIST];
    if (rWrist && canvasRef.current) {
      const w = canvasRef.current.clientWidth;
      const h = canvasRef.current.clientHeight;
      const scale = Math.min(w, h) * 0.38;
      const midShX = (frame.pose?.[L_SHOULDER]?.[0] ?? 0 + (frame.pose?.[R_SHOULDER]?.[0] ?? 0)) / 2;
      const midShY = (frame.pose?.[L_SHOULDER]?.[1] ?? 0 + (frame.pose?.[R_SHOULDER]?.[1] ?? 0)) / 2;
      const cx = w / 2 - (mirrored ? -midShX : midShX) * scale;
      const cy = h * 0.38 - midShY * scale;

      const x = cx + (mirrored ? -rWrist[0] * scale : rWrist[0] * scale);
      const y = cy + rWrist[1] * scale;

      trailsRef.current.unshift({ x, y, age: 0 });
      if (trailsRef.current.length > 8) trailsRef.current.pop();
    }
    trailsRef.current.forEach((t) => t.age++);
  }, [frame, mirrored]);

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
    };

    handleResize();
    const ro = new ResizeObserver(handleResize);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      drawFrame(
        ctx,
        w,
        h,
        frame,
        isIdle,
        mirrored,
        highContrast,
        isQuestion,
        questionType,
        trailsRef.current
      );
    }
  }, [frame, isIdle, mirrored, highContrast, isQuestion, questionType]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden bg-white select-none font-mono ${className}`}
      role="img"
      aria-label="High-Precision 2D ASL signing avatar"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block"
        style={{ imageRendering: 'auto' }}
      />

      {/* Top Left: Active Sign/Badge */}
      {badge && (
        <div className="absolute top-3 left-3 px-2.5 py-1 text-[10px] font-mono font-bold uppercase rounded bg-neutral-900 text-white border border-black shadow-xs pointer-events-none z-10 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span>{badge}</span>
        </div>
      )}

      {/* Bottom Right: Hand Clarity Indicator Legend */}
      <div className="absolute bottom-3 right-3 flex items-center gap-3 px-2.5 py-1 rounded bg-white/95 border border-neutral-300 text-[10px] font-mono font-semibold text-neutral-800 shadow-xs pointer-events-none z-10">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500 border border-amber-600" />
          <span>RIGHT (DOMINANT)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-sky-500 border border-sky-600" />
          <span>LEFT (BASE)</span>
        </div>
      </div>
    </div>
  );
};

function drawFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  frame: SignFrame,
  isIdle: boolean,
  mirrored = false,
  highContrast = false,
  isQuestion = false,
  questionType: 'wh' | 'yes_no' | null = null,
  motionTrails: TrailPoint[] = []
) {
  ctx.clearRect(0, 0, w, h);

  if (highContrast) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);
  } else {
    // Clean minimalist white studio backdrop
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Subtle floor plane reference line
    ctx.strokeStyle = '#f5f5f5';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.90);
    ctx.lineTo(w, h * 0.90);
    ctx.stroke();
  }

  drawSkeleton(
    ctx,
    w,
    h,
    frame,
    isIdle,
    mirrored,
    highContrast,
    isQuestion,
    questionType,
    motionTrails
  );
}

function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  frame: SignFrame,
  isIdle: boolean,
  mirrored = false,
  highContrast = false,
  isQuestion = false,
  questionType: 'wh' | 'yes_no' | null = null,
  motionTrails: TrailPoint[] = []
) {
  const pose = frame.pose;
  if (!pose || pose.length < 19) return;

  const lShoulder = pose[L_SHOULDER];
  const rShoulder = pose[R_SHOULDER];

  const midShX = lShoulder && rShoulder ? (lShoulder[0] + rShoulder[0]) / 2 : 0;
  const midShY = lShoulder && rShoulder ? (lShoulder[1] + rShoulder[1]) / 2 : 0;

  const scale = Math.min(w, h) * 0.38;
  const cx = w / 2 - (mirrored ? -midShX : midShX) * scale;
  const cy = h * 0.38 - midShY * scale;

  const d: DrawCtx = { ctx, cx, cy, scale, mirrored, highContrast, isQuestion, questionType };

  // Color Definitions for Clean White Minimalist Mono
  const BODY_COLOR = highContrast ? '#ffffff' : '#1e293b';
  const BODY_DARK = highContrast ? '#000000' : '#0f172a';
  const TORSO_FILL = highContrast ? 'rgba(255, 255, 255, 0.08)' : 'rgba(241, 245, 249, 0.85)';
  const JOINT_COLOR = highContrast ? '#facc15' : '#334155';

  // 1. Subtle Signing Zone Framing Guide
  ctx.save();
  ctx.strokeStyle = highContrast ? 'rgba(250, 204, 21, 0.15)' : 'rgba(0, 0, 0, 0.04)';
  ctx.lineWidth = 1.0;
  ctx.setLineDash([3, 5]);

  ctx.beginPath();
  ctx.ellipse(w / 2, h * 0.50, scale * 0.95, scale * 0.75, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // 2. Motion Trajectory Trail (Ghosting)
  if (motionTrails.length > 1 && !isIdle) {
    ctx.save();
    for (let i = 0; i < motionTrails.length - 1; i++) {
      const pA = motionTrails[i];
      const pB = motionTrails[i + 1];
      const alpha = (1 - pA.age / 8) * 0.35;
      if (alpha > 0.02) {
        ctx.beginPath();
        ctx.moveTo(pA.x, pA.y);
        ctx.lineTo(pB.x, pB.y);
        ctx.strokeStyle = highContrast
          ? `rgba(250, 204, 21, ${alpha})`
          : `rgba(217, 119, 6, ${alpha})`;
        ctx.lineWidth = (1 - pA.age / 8) * 4 + 1;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // 3. Anatomical Torso Silhouette Plate
  if (pose[L_SHOULDER] && pose[R_SHOULDER] && pose[R_HIP] && pose[L_HIP]) {
    const [lsx, lsy] = project(pose[L_SHOULDER], d);
    const [rsx, rsy] = project(pose[R_SHOULDER], d);
    const [rhx, rhy] = project(pose[R_HIP], d);
    const [lhx, lhy] = project(pose[L_HIP], d);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(lsx, lsy);
    ctx.lineTo(rsx, rsy);
    ctx.quadraticCurveTo((rsx + rhx) / 2 + 10, (rsy + rhy) / 2, rhx, rhy);
    ctx.lineTo(lhx, lhy);
    ctx.quadraticCurveTo((lsx + lhx) / 2 - 10, (lsy + lhy) / 2, lsx, lsy);
    ctx.closePath();

    ctx.fillStyle = TORSO_FILL;
    ctx.fill();
    ctx.strokeStyle = highContrast ? 'rgba(255,255,255,0.2)' : 'rgba(203, 213, 225, 0.9)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  }

  // 4. Torso Skeletal Frame (Clavicle, Spine)
  ctx.save();
  drawCapsule(d, pose[L_SHOULDER], pose[R_SHOULDER], 6.5, 6.5, BODY_COLOR, BODY_DARK, 1.2);
  drawCapsule(d, pose[L_HIP], pose[R_HIP], 5.5, 5.5, BODY_COLOR, BODY_DARK, 1.2);

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
  drawCapsule(d, shMid, hipMid, 6.0, 6.0, BODY_COLOR, BODY_DARK, 1.2);

  // 5. Arm Limbs (Bone Invariant Capsules)
  drawCapsule(d, pose[L_SHOULDER], pose[L_ELBOW], 7.0, 5.5, BODY_COLOR, BODY_DARK, 1.2);
  drawCapsule(d, pose[L_ELBOW], pose[L_WRIST], 5.5, 4.5, BODY_COLOR, BODY_DARK, 1.2);

  drawCapsule(d, pose[R_SHOULDER], pose[R_ELBOW], 7.0, 5.5, BODY_COLOR, BODY_DARK, 1.2);
  drawCapsule(d, pose[R_ELBOW], pose[R_WRIST], 5.5, 4.5, BODY_COLOR, BODY_DARK, 1.2);
  ctx.restore();

  // 6. Body Pivot Joints
  for (const idx of [L_SHOULDER, R_SHOULDER, L_ELBOW, R_ELBOW, L_WRIST, R_WRIST, L_HIP, R_HIP]) {
    if (pose[idx]) {
      const isWrist = idx === L_WRIST || idx === R_WRIST;
      const radius = isWrist ? 5.5 : 6.5;
      drawDot(d, pose[idx], radius, JOINT_COLOR, BODY_DARK, 1.5);
    }
  }

  // 7. Head, Eyes & Question Eyebrows
  if (pose[NOSE]) {
    const [nx, ny] = project(pose[NOSE], d);
    const headR = scale * 0.25;

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(nx, ny, headR * 0.9, headR * 1.05, 0, 0, Math.PI * 2);
    ctx.fillStyle = highContrast ? '#000000' : '#f8fafc';
    ctx.fill();
    ctx.lineWidth = highContrast ? 3.0 : 2.0;
    ctx.strokeStyle = highContrast ? '#facc15' : '#0f172a';
    ctx.stroke();
    ctx.restore();

    // Ears
    if (pose[L_EAR]) drawDot(d, pose[L_EAR], scale * 0.02, JOINT_COLOR, BODY_DARK, 1.0);
    if (pose[R_EAR]) drawDot(d, pose[R_EAR], scale * 0.02, JOINT_COLOR, BODY_DARK, 1.0);

    // Eyes
    const eyeR = scale * 0.03;
    const eyeColor = highContrast ? '#ffffff' : '#0f172a';
    if (pose[L_EYE]) {
      drawDot(d, pose[L_EYE], eyeR, eyeColor, BODY_DARK, 1.0);
    }
    if (pose[R_EYE]) {
      drawDot(d, pose[R_EYE], eyeR, eyeColor, BODY_DARK, 1.0);
    }

    // Question Eyebrows
    const isWh = d.isQuestion && d.questionType === 'wh';
    const isYesNo = d.isQuestion && (!d.questionType || d.questionType === 'yes_no');
    const browOffset = isWh ? scale * 0.035 : isYesNo ? -scale * 0.055 : 0;
    const browColor = isWh ? '#d97706' : isYesNo ? '#f59e0b' : (highContrast ? '#ffffff' : '#0f172a');

    if (pose[L_EYE]) {
      const [lex, ley] = project(pose[L_EYE], d);
      ctx.beginPath();
      if (isWh) {
        ctx.moveTo(lex - scale * 0.045, ley - scale * 0.065 + browOffset);
        ctx.lineTo(lex + scale * 0.045, ley - scale * 0.042 + browOffset);
      } else {
        ctx.moveTo(lex - scale * 0.045, ley - scale * 0.045 + browOffset);
        ctx.lineTo(lex + scale * 0.045, ley - scale * 0.058 + browOffset);
      }
      ctx.strokeStyle = browColor;
      ctx.lineWidth = d.isQuestion ? 3.5 : 2.5;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    if (pose[R_EYE]) {
      const [rex, rey] = project(pose[R_EYE], d);
      ctx.beginPath();
      if (isWh) {
        ctx.moveTo(rex - scale * 0.045, rey - scale * 0.042 + browOffset);
        ctx.lineTo(rex + scale * 0.045, rey - scale * 0.065 + browOffset);
      } else {
        ctx.moveTo(rex - scale * 0.045, rey - scale * 0.058 + browOffset);
        ctx.lineTo(rex + scale * 0.045, rey - scale * 0.045 + browOffset);
      }
      ctx.strokeStyle = browColor;
      ctx.lineWidth = d.isQuestion ? 3.5 : 2.5;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // Mouth Arc
    if (pose[MOUTH_L] && pose[MOUTH_R]) {
      const [mlx, mly] = project(pose[MOUTH_L], d);
      const [mrx, mry] = project(pose[MOUTH_R], d);
      const midX = (mlx + mrx) / 2;
      const midY = (mly + mry) / 2 + (isQuestion ? 2.5 : 1.5);

      ctx.beginPath();
      ctx.moveTo(mlx, mly);
      ctx.quadraticCurveTo(midX, midY, mrx, mry);
      ctx.strokeStyle = highContrast ? '#ffffff' : '#0f172a';
      ctx.lineWidth = 2.0;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }

  // 8. Articulated 21-Landmark Hands
  if (frame.left_hand && frame.left_hand.length === 21) {
    drawHighPrecisionHand(d, frame.left_hand, false);
  }
  if (frame.right_hand && frame.right_hand.length === 21) {
    drawHighPrecisionHand(d, frame.right_hand, true);
  }
}

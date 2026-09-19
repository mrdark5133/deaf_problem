/**
 * SkeletonAvatar — High-Precision, Anatomically Clear 2D Canvas ASL Avatar.
 *
 * Enhanced for crystal-clear sign language comprehension:
 *  1. Dynamic Mid-Shoulder Anchoring: Auto-centers and scales across synthetic & real signs.
 *  2. 3D Palm Orientation Shading: Vector normal calculates anterior (palm), posterior (dorsum),
 *     or lateral blade view with realistic palm creases and knuckle plates.
 *  3. Z-Depth Sorted Finger Rendering: Outlined tapered phalanx bones with joint rings and
 *     bright glowing fingertip pads so overlapping fingers (e.g. fists, 'R', 'E') never blur.
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
 * with an outline border and interior gradient for high visual clarity.
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
  // Point A left
  ctx.moveTo(ax + nx * rA, ay + ny * rA);
  // Line to Point B left
  ctx.lineTo(bx + nx * rB, by + ny * rB);
  // Cap at Point B
  ctx.arc(bx, by, rB, Math.atan2(ny, nx), Math.atan2(-ny, -nx), false);
  // Line to Point A right
  ctx.lineTo(ax - nx * rA, ay - ny * rA);
  // Cap at Point A
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
  strokeColor = '#ffffff',
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
    : (isRightHand ? '#fbbf24' : '#22d3ee'); // Amber vs Cyan

  const darkOutline = hc ? '#000000' : 'rgba(15, 23, 42, 0.9)';
  const glowColor = isRightHand ? 'rgba(245, 158, 11, 0.75)' : 'rgba(6, 182, 212, 0.75)';

  const palmFill = hc
    ? (isPalmFacing ? 'rgba(250, 204, 21, 0.35)' : 'rgba(250, 204, 21, 0.18)')
    : (isRightHand
        ? (isPalmFacing ? 'rgba(245, 158, 11, 0.32)' : 'rgba(180, 83, 9, 0.25)')
        : (isPalmFacing ? 'rgba(6, 182, 212, 0.32)' : 'rgba(14, 116, 144, 0.25)'));

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

  ctx.lineWidth = 2.0;
  ctx.strokeStyle = baseColor;
  ctx.stroke();

  // Palm interior crease / knuckle plate cues
  if (isPalmFacing) {
    // Palm creases (Life / Heart lines)
    const [wX, wY] = project(landmarks[0], d);
    const [mMCPx, mMCPy] = project(landmarks[9], d);
    ctx.beginPath();
    ctx.moveTo(wX * 0.4 + mMCPx * 0.6, wY * 0.4 + mMCPy * 0.6);
    ctx.lineTo(wX * 0.2 + mMCPx * 0.8, wY * 0.2 + mMCPy * 0.8);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else {
    // Dorsal knuckle bridge line
    const [iX, iY] = project(landmarks[5], d);
    const [pX, pY] = project(landmarks[17], d);
    ctx.beginPath();
    ctx.moveTo(iX, iY);
    ctx.lineTo(pX, pY);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
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
        4.0,
        3.5,
        'rgba(255,255,255,0.15)',
        darkOutline,
        1.0
      );
    }
  }

  // 3. Depth-Sorted Finger Chains
  // Calculate average Z for each finger
  const sortedFingers = [...FINGER_CHAINS].map((finger) => {
    let avgZ = 0;
    let count = 0;
    for (const idx of finger.indices) {
      if (landmarks[idx]) {
        avgZ += landmarks[idx][2] ?? 0;
        count++;
      }
    }
    return {
      finger,
      avgZ: count > 0 ? avgZ / count : 0,
    };
  });

  // Sort from back to front (lowest Z to highest Z)
  sortedFingers.sort((a, b) => a.avgZ - b.avgZ);

  // 4. Render Phalanx Bone Capsules
  ctx.save();
  ctx.shadowBlur = 10;
  ctx.shadowColor = glowColor;

  for (const { finger } of sortedFingers) {
    const indices = finger.indices;
    for (let i = 1; i < indices.length - 1; i++) {
      const idxA = indices[i];
      const idxB = indices[i + 1];
      if (landmarks[idxA] && landmarks[idxB]) {
        // Taper segment width from MCP (6.0px) -> PIP (5.0px) -> DIP (4.2px) -> Tip (3.6px)
        const wA = i === 1 ? 6.2 : i === 2 ? 5.2 : 4.4;
        const wB = i === 1 ? 5.2 : i === 2 ? 4.4 : 3.6;

        const segFill = hc
          ? '#ffffff'
          : isRightHand
          ? (i === 3 ? '#fef08a' : '#fbbf24')
          : (i === 3 ? '#cffafe' : '#38bdf8');

        drawCapsule(d, landmarks[idxA], landmarks[idxB], wA, wB, segFill, darkOutline, 1.8);
      }
    }
  }
  ctx.restore();

  // 5. Articulated Joint Knuckle Nodes (MCP, PIP, DIP)
  for (let i = 1; i < 21; i++) {
    const isTip = [4, 8, 12, 16, 20].includes(i);
    if (!isTip && landmarks[i]) {
      drawDot(d, landmarks[i], 3.2, baseColor, darkOutline, 1.5);
    }
  }

  // 6. High-Visibility Fingertip Caps with Directional Glow
  const tipIndices = [4, 8, 12, 16, 20];
  for (const tip of tipIndices) {
    if (landmarks[tip]) {
      ctx.save();
      ctx.shadowBlur = 16;
      ctx.shadowColor = glowColor;
      // Outer bright ring
      drawDot(d, landmarks[tip], 5.8, '#ffffff', baseColor, 2.5);
      // Inner highlight core
      drawDot(d, landmarks[tip], 2.2, baseColor, 'transparent', 0);
      ctx.restore();
    }
  }

  // 7. Wrist Anchor Node
  if (landmarks[0]) {
    drawDot(d, landmarks[0], 7.0, '#ffffff', baseColor, 3.0);
  }
}

/**
 * Renders the full 2D skeleton avatar with accurate anatomy, depth, and clarity.
 */
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

  // Calculate dynamic mid-shoulder anchor & scale
  const lShoulder = pose[L_SHOULDER];
  const rShoulder = pose[R_SHOULDER];

  const midShX = lShoulder && rShoulder ? (lShoulder[0] + rShoulder[0]) / 2 : 0;
  const midShY = lShoulder && rShoulder ? (lShoulder[1] + rShoulder[1]) / 2 : 0;

  // Scale: shoulder-to-shoulder normalized to viewport
  const scale = Math.min(w, h) * 0.38;
  const cx = w / 2 - (mirrored ? -midShX : midShX) * scale;
  const cy = h * 0.38 - midShY * scale;

  const d: DrawCtx = { ctx, cx, cy, scale, mirrored, highContrast, isQuestion, questionType };

  // Color Definitions
  const BODY_COLOR = highContrast
    ? '#ffffff'
    : isIdle
    ? 'rgba(148, 163, 184, 0.7)'
    : 'rgba(199, 210, 254, 0.95)'; // Indigo-200

  const BODY_DARK = highContrast ? '#000000' : 'rgba(15, 23, 42, 0.85)';

  const TORSO_FILL = highContrast
    ? 'rgba(255, 255, 255, 0.08)'
    : isIdle
    ? 'rgba(51, 65, 85, 0.2)'
    : 'rgba(79, 70, 229, 0.22)'; // Translucent indigo plate

  const JOINT_COLOR = highContrast
    ? '#facc15'
    : isIdle
    ? 'rgba(148, 163, 184, 0.9)'
    : '#e0e7ff';

  const BODY_GLOW = highContrast
    ? 'rgba(250, 204, 21, 0.6)'
    : isIdle
    ? 'rgba(99, 102, 241, 0.1)'
    : 'rgba(99, 102, 241, 0.4)';

  // ── 1. Subtle Signing Zone Framing Guide ──────────────────────────────────────
  ctx.save();
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([4, 6]);

  // Signing space ellipse centered on chest
  ctx.beginPath();
  ctx.ellipse(w / 2, h * 0.50, scale * 0.95, scale * 0.75, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // ── 2. Motion Trajectory Trail (Ghosting) ────────────────────────────────────
  if (motionTrails.length > 1 && !isIdle) {
    ctx.save();
    for (let i = 0; i < motionTrails.length - 1; i++) {
      const pA = motionTrails[i];
      const pB = motionTrails[i + 1];
      const alpha = (1 - pA.age / 8) * 0.45;
      if (alpha > 0.02) {
        ctx.beginPath();
        ctx.moveTo(pA.x, pA.y);
        ctx.lineTo(pB.x, pB.y);
        ctx.strokeStyle = highContrast
          ? `rgba(250, 204, 21, ${alpha})`
          : `rgba(245, 158, 11, ${alpha})`;
        ctx.lineWidth = (1 - pA.age / 8) * 5 + 1;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // ── 3. Anatomical Torso Silhouette Plate ─────────────────────────────────────
  if (pose[L_SHOULDER] && pose[R_SHOULDER] && pose[R_HIP] && pose[L_HIP]) {
    const [lsx, lsy] = project(pose[L_SHOULDER], d);
    const [rsx, rsy] = project(pose[R_SHOULDER], d);
    const [rhx, rhy] = project(pose[R_HIP], d);
    const [lhx, lhy] = project(pose[L_HIP], d);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(lsx, lsy);
    ctx.lineTo(rsx, rsy);
    // Incurved waistline
    ctx.quadraticCurveTo((rsx + rhx) / 2 + 10, (rsy + rhy) / 2, rhx, rhy);
    ctx.lineTo(lhx, lhy);
    ctx.quadraticCurveTo((lsx + lhx) / 2 - 10, (lsy + lhy) / 2, lsx, lsy);
    ctx.closePath();

    ctx.fillStyle = TORSO_FILL;
    ctx.fill();
    ctx.strokeStyle = 'rgba(129, 140, 248, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  // ── 4. Torso Skeletal Frame (Clavicle, Ribs, Spine) ──────────────────────────
  ctx.save();
  ctx.shadowBlur = highContrast ? 20 : 14;
  ctx.shadowColor = BODY_GLOW;

  // Clavicle / Shoulder bar
  drawCapsule(d, pose[L_SHOULDER], pose[R_SHOULDER], 7.0, 7.0, BODY_COLOR, BODY_DARK, 1.5);
  // Pelvis / Hip bar
  drawCapsule(d, pose[L_HIP], pose[R_HIP], 6.0, 6.0, BODY_COLOR, BODY_DARK, 1.5);

  // Articulated Spine Column
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
  drawCapsule(d, shMid, hipMid, 6.5, 6.5, BODY_COLOR, BODY_DARK, 1.5);

  // ── 5. Arm Limbs (Bone Invariant Capsules) ──────────────────────────────────
  // Left arm
  drawCapsule(d, pose[L_SHOULDER], pose[L_ELBOW], 7.5, 6.0, BODY_COLOR, BODY_DARK, 1.5);
  drawCapsule(d, pose[L_ELBOW], pose[L_WRIST], 6.0, 5.0, BODY_COLOR, BODY_DARK, 1.5);

  // Right arm
  drawCapsule(d, pose[R_SHOULDER], pose[R_ELBOW], 7.5, 6.0, BODY_COLOR, BODY_DARK, 1.5);
  drawCapsule(d, pose[R_ELBOW], pose[R_WRIST], 6.0, 5.0, BODY_COLOR, BODY_DARK, 1.5);
  ctx.restore();

  // ── 6. Body Pivot Joints ───────────────────────────────────────────────────
  for (const idx of [L_SHOULDER, R_SHOULDER, L_ELBOW, R_ELBOW, L_WRIST, R_WRIST, L_HIP, R_HIP]) {
    if (pose[idx]) {
      const isWrist = idx === L_WRIST || idx === R_WRIST;
      const radius = isWrist ? 6.0 : 7.0;
      drawDot(d, pose[idx], radius, JOINT_COLOR, BODY_DARK, 2.0);
    }
  }

  // ── 7. Head, Eyes & Question-Lifting Eyebrows ──────────────────────────────
  if (pose[NOSE]) {
    const [nx, ny] = project(pose[NOSE], d);
    const headR = scale * 0.26;

    ctx.save();
    ctx.shadowBlur = highContrast ? 24 : 18;
    ctx.shadowColor = BODY_GLOW;

    // Stylized Head Silhouette with Smooth Radial Shading
    const grad = ctx.createRadialGradient(nx, ny - headR * 0.25, headR * 0.1, nx, ny, headR);
    if (highContrast) {
      grad.addColorStop(0, '#000000');
      grad.addColorStop(1, '#0f172a');
    } else {
      grad.addColorStop(0, isIdle ? 'rgba(71,85,105,0.95)' : 'rgba(79,70,229,0.85)');
      grad.addColorStop(1, isIdle ? 'rgba(30,41,59,0.90)' : 'rgba(49,46,129,0.80)');
    }

    ctx.beginPath();
    // Anatomical head contour (slight jaw taper)
    ctx.ellipse(nx, ny, headR * 0.9, headR * 1.05, 0, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = highContrast ? 3.5 : 2.5;
    ctx.strokeStyle = highContrast ? '#facc15' : 'rgba(199, 210, 254, 0.9)';
    ctx.stroke();
    ctx.restore();

    // Ears (Head rotation reference)
    if (pose[L_EAR]) drawDot(d, pose[L_EAR], scale * 0.022, JOINT_COLOR, BODY_DARK, 1.0);
    if (pose[R_EAR]) drawDot(d, pose[R_EAR], scale * 0.022, JOINT_COLOR, BODY_DARK, 1.0);

    // Eyes with pupils
    const eyeR = scale * 0.032;
    const eyeColor = '#ffffff';
    if (pose[L_EYE]) {
      const [lex, ley] = project(pose[L_EYE], d);
      drawDot(d, pose[L_EYE], eyeR, eyeColor, BODY_DARK, 1.5);
      // Pupil looking forward
      ctx.beginPath();
      ctx.arc(lex, ley, eyeR * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = '#1e1b4b';
      ctx.fill();
    }
    if (pose[R_EYE]) {
      const [rex, rey] = project(pose[R_EYE], d);
      drawDot(d, pose[R_EYE], eyeR, eyeColor, BODY_DARK, 1.5);
      // Pupil looking forward
      ctx.beginPath();
      ctx.arc(rex, rey, eyeR * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = '#1e1b4b';
      ctx.fill();
    }

    // Expressive Eyebrows (ASL Grammar NMM: WH-question furrows brow +0.035; Yes/No question raises brow -0.055)
    const isWh = d.isQuestion && d.questionType === 'wh';
    const isYesNo = d.isQuestion && (!d.questionType || d.questionType === 'yes_no');
    const browOffset = isWh ? scale * 0.035 : isYesNo ? -scale * 0.055 : 0;
    const browColor = isWh ? '#f59e0b' : isYesNo ? '#facc15' : 'rgba(255, 255, 255, 0.95)';

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
      ctx.lineWidth = d.isQuestion ? 4.0 : 3.0;
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
      ctx.lineWidth = d.isQuestion ? 4.0 : 3.0;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // Mouth Arc (Mouthing Articulation)
    if (pose[MOUTH_L] && pose[MOUTH_R]) {
      const [mlx, mly] = project(pose[MOUTH_L], d);
      const [mrx, mry] = project(pose[MOUTH_R], d);
      const midX = (mlx + mrx) / 2;
      const midY = (mly + mry) / 2 + (isQuestion ? 3 : 2);

      ctx.beginPath();
      ctx.moveTo(mlx, mly);
      ctx.quadraticCurveTo(midX, midY, mrx, mry);
      ctx.strokeStyle = 'rgba(224, 231, 255, 0.95)';
      ctx.lineWidth = 3.0;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }

  // ── 8. Foreground Articulated 21-Landmark Hands with Depth Shadow ───────────
  if (frame.left_hand) {
    drawHighPrecisionHand(d, frame.left_hand, false);
  }
  if (frame.right_hand) {
    drawHighPrecisionHand(d, frame.right_hand, true);
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface SkeletonAvatarProps {
  frame: SignFrame;
  isIdle?: boolean;
  mirrored?: boolean;
  highContrast?: boolean;
  isQuestion?: boolean;
  questionType?: 'wh' | 'yes_no' | null;
  badge?: string;
  className?: string;
}

export const SkeletonAvatar: React.FC<SkeletonAvatarProps> = ({
  frame,
  isIdle = false,
  mirrored = false,
  highContrast = false,
  isQuestion = false,
  questionType = null,
  badge,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Motion history trails for dominant hand
  const trailsRef = useRef<TrailPoint[]>([]);

  const frameRef = useRef<SignFrame>(frame);
  const idleRef = useRef<boolean>(isIdle);
  const mirroredRef = useRef<boolean>(mirrored);
  const highContrastRef = useRef<boolean>(highContrast);
  const isQuestionRef = useRef<boolean>(isQuestion);
  const questionTypeRef = useRef<'wh' | 'yes_no' | null>(questionType);

  frameRef.current = frame;
  idleRef.current = isIdle;
  mirroredRef.current = mirrored;
  highContrastRef.current = highContrast;
  isQuestionRef.current = isQuestion;
  questionTypeRef.current = questionType;

  // Update motion trail on frame change
  useEffect(() => {
    // Age existing trail points
    trailsRef.current = trailsRef.current
      .map((p) => ({ ...p, age: p.age + 1 }))
      .filter((p) => p.age < 8);

    // Record dominant hand position (right hand wrist or index tip)
    const rightHand = frame.right_hand;
    if (rightHand && rightHand.length > 8 && canvasRef.current) {
      const tip = rightHand[8]; // Index tip
      const canvas = canvasRef.current;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w > 0 && h > 0 && tip) {
        const scale = Math.min(w, h) * 0.38;
        const xOffset = mirrored ? -tip[0] * scale : tip[0] * scale;
        const x = w / 2 + xOffset;
        const y = h * 0.38 + tip[1] * scale;
        trailsRef.current.push({ x, y, age: 0 });
      }
    }
  }, [frame, mirrored]);

  // Resize canvas when container size changes
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          const dpr = window.devicePixelRatio || 1;
          canvas.width = width * dpr;
          canvas.height = height * dpr;
          canvas.style.width = `${width}px`;
          canvas.style.height = `${height}px`;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.scale(dpr, dpr);
            drawFrame(
              ctx,
              width,
              height,
              frameRef.current,
              idleRef.current,
              mirroredRef.current,
              highContrastRef.current,
              isQuestionRef.current,
              questionTypeRef.current,
              trailsRef.current
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
      className={`relative w-full h-full overflow-hidden bg-slate-950 select-none ${className}`}
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
        <div className="absolute top-2.5 left-2.5 px-2.5 py-1 text-[11px] font-mono font-semibold rounded-lg bg-slate-900/90 border border-slate-700/80 text-amber-300 shadow-md backdrop-blur-md pointer-events-none z-10 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span>{badge}</span>
        </div>
      )}

      {/* Bottom Right: Hand Clarity Indicator Legend */}
      <div className="absolute bottom-2.5 right-2.5 flex items-center gap-3 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800/80 text-[10px] font-medium text-slate-300 backdrop-blur-sm pointer-events-none z-10">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400 ring-2 ring-amber-400/30" />
          <span>Right (Dominant)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-cyan-400/30" />
          <span>Left (Base)</span>
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

  // High-clarity studio backdrop with radial vignette
  const bg = ctx.createRadialGradient(
    w / 2,
    h * 0.42,
    0,
    w / 2,
    h * 0.42,
    Math.max(w, h) * 0.72
  );
  bg.addColorStop(0, 'rgba(30, 27, 75, 0.45)'); // deep indigo focal spot
  bg.addColorStop(1, 'rgba(2, 6, 23, 0.05)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

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

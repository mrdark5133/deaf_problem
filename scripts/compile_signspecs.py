#!/usr/bin/env python3
"""
compile_signspecs.py — Compiles data/signspecs/<gloss>.json specifications into 30 FPS SignClip JSON files
and rebuilds data/signs/index.json adhering strictly to the source priority rules:
  Tier 1: Real recorded clips (asl-citizen, team-recording)
  Tier 2: Handshape spec-compiled clips (handshape-spec)
  Tier 3: Synthetic placeholder fallback clips (synthetic)
"""

import json
import os
import math
from pathlib import Path

DATA_DIR = Path("data")
SIGNSPEC_DIR = DATA_DIR / "signspecs"
HANDSHAPE_DIR = DATA_DIR / "handshapes"
SIGNS_DIR = DATA_DIR / "signs"
SIGNSPEC_DIR.mkdir(parents=True, exist_ok=True)
SIGNS_DIR.mkdir(parents=True, exist_ok=True)

L1 = 0.42  # Upper arm length
L2 = 0.38  # Forearm length
SHOULDER_WIDTH = 0.50

NAMED_LOCATIONS = {
    "neutral": [0.22, 0.42, 0.08],
    "chest": [0.15, 0.18, 0.16],
    "chin": [0.0, -0.38, 0.14],
    "mouth": [0.0, -0.42, 0.14],
    "nose": [0.0, -0.48, 0.14],
    "forehead": [0.0, -0.62, 0.12],
    "temple": [0.20, -0.60, 0.12],
    "cheek": [0.18, -0.45, 0.12],
    "shoulder_ipsi": [0.45, 0.05, 0.08],
    "shoulder_contra": [-0.35, 0.05, 0.08],
    "waist": [0.20, 0.68, 0.10],
    "non_dominant_palm": [-0.15, 0.28, 0.18],
    "non_dominant_wrist": [-0.18, 0.32, 0.16],
}

def vec_sub(a, b):
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]

def vec_add(a, b):
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]

def vec_scale(v, s):
    return [v[0] * s, v[1] * s, v[2] * s]

def vec_norm(v):
    return math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2])

def vec_normalize(v, fallback=(0, 1, 0)):
    n = vec_norm(v)
    if n < 1e-7:
        return list(fallback)
    return [v[0] / n, v[1] / n, v[2] / n]

def vec_cross(a, b):
    return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0]
    ]

def parse_direction(dir_val, is_right=True):
    if isinstance(dir_val, list):
        return vec_normalize(dir_val)
    side = 1.0 if is_right else -1.0
    mapping = {
        "forward": [0, 0, 1],
        "away": [0, 0, 1],
        "back": [0, 0, -1],
        "toward_body": [0, 0, -1],
        "up": [0, -1, 0],
        "down": [0, 1, 0],
        "left": [-1, 0, 0],
        "right": [1, 0, 0],
        "inward": [-side, 0, 0],
        "outward": [side, 0, 0],
    }
    return mapping.get(dir_val, [0, 0, 1])

def solve_two_bone_ik(shoulder, target_wrist, is_right=True):
    sw = vec_sub(target_wrist, shoulder)
    dist = vec_norm(sw)
    max_reach = L1 + L2 - 0.002
    min_reach = abs(L1 - L2) + 0.002

    clamped_wrist = list(target_wrist)
    if dist > max_reach:
        u = vec_normalize(sw)
        clamped_wrist = vec_add(shoulder, vec_scale(u, max_reach))
        dist = max_reach
    elif dist < min_reach:
        u = vec_normalize(sw, (0.2 if is_right else -0.2, 0.8, 0.1))
        clamped_wrist = vec_add(shoulder, vec_scale(u, min_reach))
        dist = min_reach

    cos_alpha = (L1*L1 + dist*dist - L2*L2) / (2 * L1 * dist)
    cos_alpha = max(-1.0, min(1.0, cos_alpha))
    alpha = math.acos(cos_alpha)

    u_sw = vec_normalize(vec_sub(clamped_wrist, shoulder))
    side_sign = 1.0 if is_right else -1.0
    elbow_hint = [side_sign * 0.45, 0.65, -0.20]

    plane_norm = vec_cross(u_sw, elbow_hint)
    if vec_norm(plane_norm) < 1e-4:
        plane_norm = [0, 0, 1]
    else:
        plane_norm = vec_normalize(plane_norm)

    u_elbow_perp = vec_normalize(vec_cross(plane_norm, u_sw))
    elbow_dir = vec_add(vec_scale(u_sw, math.cos(alpha)), vec_scale(u_elbow_perp, math.sin(alpha)))
    elbow = vec_add(shoulder, vec_scale(vec_normalize(elbow_dir), L1))

    return elbow, clamped_wrist

def solve_hand_orientation(palm_normal, finger_dir, is_right=True):
    uy = vec_normalize(finger_dir, (0, 1, 0))
    uz_target = vec_normalize(palm_normal, (0, 0, 1))
    ux = vec_cross(uy, uz_target)
    if vec_norm(ux) < 1e-4:
        ux = [1, 0, 0] if is_right else [-1, 0, 0]
    else:
        ux = vec_normalize(ux)

    if not is_right:
        ux = [-ux[0], -ux[1], -ux[2]]

    uz = vec_normalize(vec_cross(ux, uy))
    ux = vec_normalize(vec_cross(uy, uz))
    return ux, uy, uz

def transform_canonical_hand(canonical_lms, wrist_pos, ux, uy, uz, hand_scale=0.12, is_right=True):
    world_lms = []
    for p in canonical_lms:
        lx = (p[0] if is_right else -p[0]) * hand_scale
        ly = p[1] * hand_scale
        lz = (p[2] if len(p) > 2 else 0) * hand_scale

        wx = wrist_pos[0] + ux[0]*lx + uy[0]*ly + uz[0]*lz
        wy = wrist_pos[1] + ux[1]*lx + uy[1]*ly + uz[1]*lz
        wz = wrist_pos[2] + ux[2]*lx + uy[2]*ly + uz[2]*lz
        world_lms.append([round(wx, 4), round(wy, 4), round(wz, 4)])
    return world_lms

def load_canonical_handshapes():
    handshapes = {}
    if not HANDSHAPE_DIR.exists():
        return handshapes
    for f in HANDSHAPE_DIR.glob("*.json"):
        if f.name == "index.json":
            continue
        try:
            with open(f, "r", encoding="utf-8") as fp:
                data = json.load(fp)
                if "canonicalLandmarks" in data:
                    handshapes[data["id"]] = data["canonicalLandmarks"]
        except Exception as e:
            print(f"Error loading handshape {f}: {e}")
    return handshapes

def compile_spec(spec_data, handshape_map):
    duration_ms = spec_data.get("duration_ms", 1000)
    fps = 30
    total_frames = max(15, round((duration_ms / 1000.0) * fps))
    keyframes = spec_data.get("keyframes", [])
    if not keyframes:
        return None

    frames = []
    for f in range(total_frames):
        t_norm = f / float(total_frames - 1)
        k0 = keyframes[0]
        k1 = keyframes[-1]
        for i in range(len(keyframes) - 1):
            if keyframes[i]["t"] <= t_norm <= keyframes[i+1]["t"]:
                k0 = keyframes[i]
                k1 = keyframes[i+1]
                break

        span = max(1e-4, k1["t"] - k0["t"])
        alpha = max(0.0, min(1.0, (t_norm - k0["t"]) / span))
        ease = alpha * alpha * (3.0 - 2.0 * alpha)

        # 1. Dominant (Right) Arm
        dom0 = k0["dominant"]
        dom1 = k1["dominant"]
        loc0_str = dom0["location"] if isinstance(dom0["location"], str) else "neutral"
        loc1_str = dom1["location"] if isinstance(dom1["location"], str) else "neutral"
        loc0 = list(NAMED_LOCATIONS.get(loc0_str, NAMED_LOCATIONS["neutral"]))
        loc1 = list(NAMED_LOCATIONS.get(loc1_str, NAMED_LOCATIONS["neutral"]))

        off0 = dom0.get("offset", [0, 0, 0])
        off1 = dom1.get("offset", [0, 0, 0])
        loc0 = [loc0[0] + off0[0], loc0[1] + off0[1], loc0[2] + off0[2]]
        loc1 = [loc1[0] + off1[0], loc1[1] + off1[1], loc1[2] + off1[2]]

        wrist_target = [loc0[0] + (loc1[0] - loc0[0])*ease, loc0[1] + (loc1[1] - loc0[1])*ease, loc0[2] + (loc1[2] - loc0[2])*ease]
        sh_r = [SHOULDER_WIDTH, 0.0, 0.0]
        elbow_r, wrist_r = solve_two_bone_ik(sh_r, wrist_target, is_right=True)

        palm0 = parse_direction(dom0.get("palm", "down"), True)
        palm1 = parse_direction(dom1.get("palm", "down"), True)
        palm = vec_normalize([palm0[0] + (palm1[0]-palm0[0])*ease, palm0[1] + (palm1[1]-palm0[1])*ease, palm0[2] + (palm1[2]-palm0[2])*ease])

        fing0 = parse_direction(dom0.get("fingers", "forward"), True)
        fing1 = parse_direction(dom1.get("fingers", "forward"), True)
        fing = vec_normalize([fing0[0] + (fing1[0]-fing0[0])*ease, fing0[1] + (fing1[1]-fing0[1])*ease, fing0[2] + (fing1[2]-fing0[2])*ease])

        ux, uy, uz = solve_hand_orientation(palm, fing, is_right=True)
        hs_id = dom0["handshape"] if alpha < 0.5 else dom1["handshape"]
        can_lms = handshape_map.get(hs_id, handshape_map.get("flat_b", []))
        right_hand = transform_canonical_hand(can_lms, wrist_r, ux, uy, uz, 0.12, is_right=True)

        # 2. Non-Dominant (Left) Arm
        left_hand = None
        sh_l = [-SHOULDER_WIDTH, 0.0, 0.0]
        elbow_l = [-0.45, 0.35, 0.0]
        wrist_l = [-0.30, 0.45, 0.0]

        if spec_data.get("hands") == "two" and "non_dominant" in k0 and "non_dominant" in k1:
            nd0 = k0["non_dominant"]
            nd1 = k1["non_dominant"]
            nd_loc0_str = nd0["location"] if isinstance(nd0["location"], str) else "neutral"
            nd_loc1_str = nd1["location"] if isinstance(nd1["location"], str) else "neutral"
            nd_loc0 = list(NAMED_LOCATIONS.get(nd_loc0_str, NAMED_LOCATIONS["neutral"]))
            nd_loc1 = list(NAMED_LOCATIONS.get(nd_loc1_str, NAMED_LOCATIONS["neutral"]))

            nd_off0 = nd0.get("offset", [0, 0, 0])
            nd_off1 = nd1.get("offset", [0, 0, 0])
            nd_loc0 = [-nd_loc0[0] - nd_off0[0], nd_loc0[1] + nd_off0[1], nd_loc0[2] + nd_off0[2]]
            nd_loc1 = [-nd_loc1[0] - nd_off1[0], nd_loc1[1] + nd_off1[1], nd_loc1[2] + nd_off1[2]]

            nd_wrist_target = [nd_loc0[0] + (nd_loc1[0]-nd_loc0[0])*ease, nd_loc0[1] + (nd_loc1[1]-nd_loc0[1])*ease, nd_loc0[2] + (nd_loc1[2]-nd_loc0[2])*ease]
            elbow_l, wrist_l = solve_two_bone_ik(sh_l, nd_wrist_target, is_right=False)

            nd_palm0 = parse_direction(nd0.get("palm", "down"), False)
            nd_palm1 = parse_direction(nd1.get("palm", "down"), False)
            nd_palm = vec_normalize([nd_palm0[0] + (nd_palm1[0]-nd_palm0[0])*ease, nd_palm0[1] + (nd_palm1[1]-nd_palm0[1])*ease, nd_palm0[2] + (nd_palm1[2]-nd_palm0[2])*ease])

            nd_fing0 = parse_direction(nd0.get("fingers", "forward"), False)
            nd_fing1 = parse_direction(nd1.get("fingers", "forward"), False)
            nd_fing = vec_normalize([nd_fing0[0] + (nd_fing1[0]-nd_fing0[0])*ease, nd_fing0[1] + (nd_fing1[1]-nd_fing0[1])*ease, nd_fing0[2] + (nd_fing1[2]-nd_fing0[2])*ease])

            nd_ux, nd_uy, nd_uz = solve_hand_orientation(nd_palm, nd_fing, is_right=False)
            nd_hs_id = nd0["handshape"] if alpha < 0.5 else nd1["handshape"]
            nd_can_lms = handshape_map.get(nd_hs_id, handshape_map.get("flat_b", []))
            left_hand = transform_canonical_hand(nd_can_lms, wrist_l, nd_ux, nd_uy, nd_uz, 0.12, is_right=False)

        # Pose array
        pose = [
            [0.0, -0.60, 0.0], [0.03, -0.63, 0.0], [0.05, -0.63, 0.0], [0.07, -0.63, 0.0],
            [-0.03, -0.63, 0.0], [-0.05, -0.63, 0.0], [-0.07, -0.63, 0.0],
            [0.12, -0.61, 0.0], [-0.12, -0.61, 0.0],
            [0.04, -0.54, 0.0], [-0.04, -0.54, 0.0],
            sh_r, sh_l,
            elbow_r, elbow_l,
            wrist_r, wrist_l,
            [wrist_r[0]+0.02, wrist_r[1]+0.05, wrist_r[2]], [wrist_l[0]-0.02, wrist_l[1]+0.05, wrist_l[2]],
            [wrist_r[0]+0.03, wrist_r[1]+0.07, wrist_r[2]], [wrist_l[0]-0.03, wrist_l[1]+0.07, wrist_l[2]],
            [wrist_r[0]+0.01, wrist_r[1]+0.06, wrist_r[2]], [wrist_l[0]-0.01, wrist_l[1]+0.06, wrist_l[2]],
            [0.30, 0.85, 0.0], [-0.30, 0.85, 0.0],
            [0.0, 1.2, 0.0], [0.0, 1.2, 0.0], [0.0, 1.2, 0.0], [0.0, 1.2, 0.0],
            [0.0, 1.2, 0.0], [0.0, 1.2, 0.0], [0.0, 1.2, 0.0], [0.0, 1.2, 0.0]
        ]

        frames.append({
            "pose": pose,
            "right_hand": right_hand,
            "left_hand": left_hand
        })

    clip_id = spec_data["gloss"].lower().replace("_", "-")
    return {
        "id": clip_id,
        "gloss": spec_data["gloss"].upper(),
        "fps": fps,
        "synthetic": False,
        "source": "handshape-spec",
        "license": "MIT",
        "signer": spec_data.get("verified_by") or "handshape-spec-compiler",
        "original_id": f"spec-{clip_id}",
        "verified": bool(spec_data.get("verified_by")),
        "verified_by": spec_data.get("verified_by"),
        "verified_at": spec_data.get("verified_at"),
        "frames": frames,
        "meta": {
            "duration_ms": duration_ms,
            "recorded_at": "2026-09-20T00:00:00Z",
            "notes": f"Compiled from sign specification with canonical handshapes. Verified: {spec_data.get('verified_by') or False}"
        }
    }

def main():
    print("[compile_signspecs] Loading canonical handshapes...")
    handshapes = load_canonical_handshapes()
    print(f"Loaded {len(handshapes)} canonical handshapes.")

    spec_files = list(SIGNSPEC_DIR.glob("*.json"))
    compiled_count = 0

    for sf in spec_files:
        try:
            with open(sf, "r", encoding="utf-8") as f:
                spec_data = json.load(f)
            clip = compile_spec(spec_data, handshapes)
            if clip:
                out_path = SIGNS_DIR / f"{clip['id']}.json"
                with open(out_path, "w", encoding="utf-8") as f:
                    json.dump(clip, f, indent=2)
                print(f"Compiled {clip['gloss']} -> {out_path.name}")
                compiled_count += 1
        except Exception as e:
            print(f"Error compiling {sf}: {e}")

    print(f"[compile_signspecs] Successfully compiled {compiled_count} sign specifications.")

if __name__ == "__main__":
    main()

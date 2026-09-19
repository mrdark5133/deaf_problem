"""Generates linguistically authentic synthetic sign clips and fingerspelling for SignBridge.
All generated clips are explicitly flagged with "synthetic": true.
"""

import json
import math
from datetime import datetime, timezone
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "data"
SIGNS_DIR = DATA_DIR / "signs"
VOCAB_FILE = DATA_DIR / "vocabulary.json"

# Base upper-body pose normalized landmarks (origin at shoulder mid)
# 0: Nose, 1-6: Eyes, 7-8: Ears, 9-10: Mouth, 11-12: Shoulders, 13-14: Elbows, 15-16: Wrists, 17-18: Hips
BASE_POSE = [
    [0.0, -0.7, 0.0],     # 0: Nose
    [0.08, -0.78, 0.0],   # 1: Left eye inner
    [0.12, -0.78, 0.0],   # 2: Left eye
    [0.16, -0.78, 0.0],   # 3: Left eye outer
    [-0.08, -0.78, 0.0],  # 4: Right eye inner
    [-0.12, -0.78, 0.0],  # 5: Right eye
    [-0.16, -0.78, 0.0],  # 6: Right eye outer
    [0.22, -0.72, 0.0],   # 7: Left ear
    [-0.22, -0.72, 0.0],  # 8: Right ear
    [0.08, -0.55, 0.0],   # 9: Mouth left
    [-0.08, -0.55, 0.0],  # 10: Mouth right
    [0.5, 0.0, 0.0],      # 11: Left shoulder
    [-0.5, 0.0, 0.0],     # 12: Right shoulder
    [0.65, 0.45, 0.05],   # 13: Left elbow (rest)
    [-0.65, 0.45, 0.05],  # 14: Right elbow (rest)
    [0.35, 0.85, 0.1],    # 15: Left wrist (rest)
    [-0.35, 0.85, 0.1],   # 16: Right wrist (rest)
    [0.35, 1.2, 0.0],     # 17: Left hip
    [-0.35, 1.2, 0.0],    # 18: Right hip
]

# ─── Handshape Builder ────────────────────────────────────────────────────────

def build_hand(
    wx: float, wy: float, wz: float,
    shape: str = "open",
    pitch: float = 0.0,   # Up/down tilt of hand
    yaw: float = 0.0,     # Left/right rotation
    roll: float = 0.0,    # In/out twist
    scale: float = 0.14,
    is_left: bool = False,
) -> list[list[float]]:
    """
    Constructs a 21-landmark hand centered at wrist (wx, wy, wz).
    Finger extensions and angles are parameterized based on ASL handshapes.
    """
    hand = [[wx, wy, wz]]  # 0: Wrist

    # Finger configuration: (ext_length, curl_factor, spread_angle)
    # curl_factor: 1.0 = straight out, 0.0 = tight fist, 0.5 = bent hook
    if shape == "fist" or shape == "a" or shape == "s":
        # All fingers curled tightly
        ext = [0.25, 0.22, 0.22, 0.22, 0.22]
        curls = [0.3, 0.05, 0.05, 0.05, 0.05]
        spreads = [0.35 if shape == "a" else 0.05, 0.0, 0.0, 0.0, 0.0]
    elif shape == "open" or shape == "5" or shape == "b":
        # Open 4 or 5 fingers straight
        ext = [0.8 if shape == "5" else 0.2, 1.0, 1.0, 1.0, 1.0]
        curls = [0.8 if shape == "5" else 0.2, 1.0, 1.0, 1.0, 1.0]
        spreads = [0.45, 0.12, 0.0, -0.12, -0.25] if shape == "5" else [0.1, 0.02, 0.0, -0.02, -0.04]
    elif shape == "point" or shape == "1" or shape == "d":
        # Index extended, others curled
        ext = [0.3, 1.0, 0.2, 0.2, 0.2]
        curls = [0.2, 1.0, 0.05, 0.05, 0.05]
        spreads = [0.2, 0.0, 0.0, 0.0, 0.0]
    elif shape == "v" or shape == "2":
        # Index & Middle extended in V
        ext = [0.25, 1.0, 1.0, 0.2, 0.2]
        curls = [0.2, 1.0, 1.0, 0.05, 0.05]
        spreads = [0.2, 0.14, -0.14, 0.0, 0.0]
    elif shape == "u" or shape == "h" or shape == "n":
        # Index & Middle extended together
        ext = [0.25, 1.0, 1.0, 0.2, 0.2]
        curls = [0.2, 1.0, 1.0, 0.05, 0.05]
        spreads = [0.15, 0.02, -0.02, 0.0, 0.0]
    elif shape == "w" or shape == "3":
        # Index, Middle, Ring in W
        ext = [0.25, 1.0, 1.0, 1.0, 0.2]
        curls = [0.2, 1.0, 1.0, 1.0, 0.05]
        spreads = [0.15, 0.18, 0.0, -0.18, 0.0]
    elif shape == "y":
        # Thumb and Pinky extended, middle 3 in fist
        ext = [1.0, 0.2, 0.2, 0.2, 1.0]
        curls = [0.9, 0.05, 0.05, 0.05, 0.9]
        spreads = [0.55, 0.0, 0.0, 0.0, -0.45]
    elif shape == "i" or shape == "j":
        # Pinky only extended
        ext = [0.25, 0.2, 0.2, 0.2, 1.0]
        curls = [0.2, 0.05, 0.05, 0.05, 1.0]
        spreads = [0.15, 0.0, 0.0, 0.0, -0.15]
    elif shape == "c" or shape == "o":
        # Curved into C/O
        ext = [0.6, 0.6, 0.6, 0.6, 0.6]
        curls = [0.45, 0.45, 0.45, 0.45, 0.45]
        spreads = [0.35, 0.08, 0.0, -0.08, -0.16]
    elif shape == "ok" or shape == "f" or shape == "9":
        # Index + Thumb circle, other 3 extended
        ext = [0.4, 0.4, 1.0, 1.0, 1.0]
        curls = [0.3, 0.3, 1.0, 1.0, 1.0]
        spreads = [0.2, 0.05, 0.05, -0.08, -0.2]
    elif shape == "l":
        # Index up, thumb 90 deg
        ext = [0.9, 1.0, 0.2, 0.2, 0.2]
        curls = [0.9, 1.0, 0.05, 0.05, 0.05]
        spreads = [0.75, 0.0, 0.0, 0.0, 0.0]
    elif shape == "flat_o":
        # Flattened O (all 4 tips touch thumb)
        ext = [0.45, 0.45, 0.45, 0.45, 0.45]
        curls = [0.35, 0.35, 0.35, 0.35, 0.35]
        spreads = [0.15, 0.04, 0.0, -0.04, -0.08]
    elif shape == "claw":
        # Claw hand (all 5 bent)
        ext = [0.65, 0.65, 0.65, 0.65, 0.65]
        curls = [0.5, 0.5, 0.5, 0.5, 0.5]
        spreads = [0.4, 0.15, 0.0, -0.15, -0.3]
    elif shape == "x":
        # Index hooked, rest in fist
        ext = [0.25, 0.5, 0.2, 0.2, 0.2]
        curls = [0.2, 0.45, 0.05, 0.05, 0.05]
        spreads = [0.15, 0.0, 0.0, 0.0, 0.0]
    else:
        # Default open palm
        ext = [0.7, 1.0, 1.0, 1.0, 1.0]
        curls = [0.7, 1.0, 1.0, 1.0, 1.0]
        spreads = [0.35, 0.08, 0.0, -0.08, -0.16]

    sign_side = 1.0 if not is_left else -1.0

    # Base finger origins at palm knuckles (MCPs)
    # Thumb: 1-4, Index: 5-8, Middle: 9-12, Ring: 13-16, Pinky: 17-20
    mcp_offsets = [
        (0.02 * sign_side, -0.04, 0.0),   # Thumb CMC
        (0.04 * sign_side, -0.12, 0.0),   # Index MCP
        (0.01 * sign_side, -0.13, 0.0),   # Middle MCP
        (-0.02 * sign_side, -0.12, 0.0),  # Ring MCP
        (-0.05 * sign_side, -0.10, 0.0),  # Pinky MCP
    ]

    for f_idx in range(5):
        mcp_x, mcp_y, mcp_z = mcp_offsets[f_idx]
        e = ext[f_idx]
        c = curls[f_idx]
        s = spreads[f_idx] * sign_side

        # 4 segments per finger (CMC/MCP -> PIP -> DIP -> TIP)
        seg_len = scale * (0.28 if f_idx == 2 else 0.24 if f_idx in (1, 3) else 0.20)
        
        # Calculate joints
        curr_x, curr_y, curr_z = wx + mcp_x, wy + mcp_y, wz + mcp_z
        for seg in range(1, 5):
            # Direction vector combining pitch, spread and curl
            dx = math.sin(s + yaw) * seg_len * e
            dy = -math.cos(pitch) * seg_len * c
            dz = math.sin(roll) * seg_len + (0.02 * (1.0 - c) * seg)
            
            curr_x += dx
            curr_y += dy
            curr_z += dz
            hand.append([round(curr_x, 4), round(curr_y, 4), round(curr_z, 4)])

    return hand


# ─── Specialized Gesture Generator for Words ──────────────────────────────────

def get_word_kinematics(gloss: str, t: float):
    """
    Returns (right_wrist, left_wrist, r_shape, l_shape, r_pitch, l_pitch) for time t [0..1].
    """
    g = gloss.upper().replace(" ", "-")

    # Cycle easing
    p = math.sin(t * math.pi)
    p2 = math.sin(t * math.pi * 2)

    # 1. HELLO: Right hand touches temple and salutes outward
    if g == "HELLO":
        rw = [-0.25 - 0.2 * t, -0.7 + 0.15 * t, 0.2 + 0.2 * t]
        return rw, None, "open", "open", -0.3, 0.0

    # 2. DOCTOR: Left wrist forward, right D/M taps left wrist
    elif g == "DOCTOR":
        lw = [0.18, -0.2, 0.25]
        rw = [0.18 - 0.05 * abs(p2), -0.22 - 0.08 * abs(p2), 0.28]
        return rw, lw, "u", "open", 0.2, 0.0

    # 3. WHERE: Right index finger pointing up, shaking side to side
    elif g == "WHERE":
        rw = [-0.25 + 0.1 * math.sin(t * math.pi * 6), -0.35, 0.35]
        return rw, None, "point", "open", 0.0, 0.0

    # 4. WHAT: Both open hands facing up, palms shaking side-to-side
    elif g == "WHAT":
        rw = [-0.3 + 0.08 * p2, -0.25, 0.35]
        lw = [0.3 - 0.08 * p2, -0.25, 0.35]
        return rw, lw, "open", "open", 0.6, 0.6

    # 5. WHEN: Left index up, right index circling and touching tip
    elif g == "WHEN":
        lw = [0.12, -0.3, 0.3]
        angle = t * math.pi * 2
        rw = [0.12 - 0.12 * math.cos(angle), -0.3 - 0.12 * math.sin(angle), 0.32]
        return rw, lw, "point", "point", 0.0, 0.0

    # 6. WHY: Right hand touching temple pulling down to Y
    elif g == "WHY":
        rw = [-0.22 - 0.15 * t, -0.65 + 0.35 * t, 0.2 + 0.1 * t]
        shape = "open" if t < 0.4 else "y"
        return rw, None, shape, "open", -0.2, 0.0

    # 7. HOW: Both curved hands rotating outward
    elif g == "HOW":
        rot = t * math.pi
        rw = [-0.15 - 0.15 * p, -0.25, 0.3]
        lw = [0.15 + 0.15 * p, -0.25, 0.3]
        return rw, lw, "c", "c", 0.2, 0.2

    # 8. ME / I: Right index points to center chest
    elif g in ("ME", "I"):
        rw = [-0.05, -0.2 + 0.05 * p, 0.15]
        return rw, None, "point", "open", 0.8, 0.0

    # 9. YOU: Right index points straight forward toward viewer
    elif g == "YOU":
        rw = [-0.18, -0.3, 0.35 + 0.2 * p]
        return rw, None, "point", "open", 0.0, 0.0

    # 10. MY / YOUR: Flat hand against chest (MY) or pushing forward (YOUR)
    elif g in ("MY", "MINE"):
        rw = [-0.05, -0.2, 0.12]
        return rw, None, "open", "open", 0.9, 0.0
    elif g in ("YOUR", "YOURS"):
        rw = [-0.2, -0.25, 0.35 + 0.2 * p]
        return rw, None, "open", "open", 0.0, 0.0

    # 11. PLEASE: Right flat hand rubs circle on chest
    elif g == "PLEASE":
        circle_x = -0.05 + 0.08 * math.cos(t * math.pi * 4)
        circle_y = -0.22 + 0.08 * math.sin(t * math.pi * 4)
        rw = [circle_x, circle_y, 0.12]
        return rw, None, "open", "open", 0.8, 0.0

    # 12. THANK-YOU: Right hand touches chin/lips and extends forward
    elif g in ("THANK-YOU", "THANKS"):
        rw = [-0.08 - 0.12 * t, -0.55 + 0.3 * t, 0.18 + 0.25 * t]
        return rw, None, "open", "open", -0.1, 0.0

    # 13. SORRY: 'A' fist rubs circle on chest
    elif g == "SORRY":
        rw = [-0.05 + 0.07 * math.cos(t * math.pi * 4), -0.22 + 0.07 * math.sin(t * math.pi * 4), 0.15]
        return rw, None, "a", "open", 0.7, 0.0

    # 14. YES: 'S' fist nods up and down
    elif g == "YES":
        rw = [-0.25, -0.4 + 0.1 * abs(p2), 0.35]
        return rw, None, "s", "open", 0.3 * math.sin(t * math.pi * 4), 0.0

    # 15. NO: Index + middle snap down onto thumb
    elif g == "NO":
        rw = [-0.22, -0.4, 0.35]
        shape = "u" if (f_mod := math.sin(t * math.pi * 4)) > 0 else "flat_o"
        return rw, None, shape, "open", 0.0, 0.0

    # 16. GOOD: Right hand chin -> Left palm
    elif g == "GOOD":
        lw = [0.15, -0.15, 0.25]
        rw = [-0.05 + 0.2 * t, -0.55 + 0.4 * t, 0.2 + 0.08 * t]
        return rw, lw, "open", "open", -0.2 + 0.4 * t, 0.0

    # 17. MORNING: Rising sun over horizon
    elif g == "MORNING":
        lw = [0.0, -0.15, 0.2]  # Horizon
        rw = [-0.15, -0.1 + 0.4 * (1.0 - t), 0.25]
        return rw, lw, "open", "open", -0.1, 0.5

    # 18. NAME: Two H hands tapping each other in X
    elif g == "NAME":
        lw = [0.05, -0.25, 0.3]
        rw = [-0.05 + 0.08 * abs(p2), -0.25 - 0.06 * abs(p2), 0.32]
        return rw, lw, "h", "h", 0.0, 0.0

    # 19. TEACHER: Flat-O at temples moving forward, then person marker down
    elif g == "TEACHER":
        if t < 0.6:
            rw = [-0.25 - 0.1 * p, -0.65 + 0.1 * p, 0.2 + 0.15 * p]
            lw = [0.25 + 0.1 * p, -0.65 + 0.1 * p, 0.2 + 0.15 * p]
            return rw, lw, "flat_o", "flat_o", 0.0, 0.0
        else:
            rw = [-0.35, -0.15, 0.2]
            lw = [0.35, -0.15, 0.2]
            return rw, lw, "open", "open", 0.5, 0.5

    # 20. NURSE: Right N taps left wrist pulse
    elif g == "NURSE":
        lw = [0.18, -0.2, 0.25]
        rw = [0.18 - 0.04 * abs(p2), -0.22 - 0.06 * abs(p2), 0.28]
        return rw, lw, "u", "open", 0.2, 0.0

    # 21. WANT: Claw hands pulling back to chest
    elif g == "WANT":
        rw = [-0.25, -0.25, 0.45 - 0.25 * t]
        lw = [0.25, -0.25, 0.45 - 0.25 * t]
        return rw, lw, "claw", "claw", 0.4, 0.4

    # 22. NEED: X hook nodding down
    elif g == "NEED":
        rw = [-0.25, -0.25 + 0.12 * abs(p2), 0.35]
        return rw, None, "x", "open", 0.4 * abs(p2), 0.0

    # 23. HELP: Right A-fist on Left open palm, lifting up together
    elif g == "HELP":
        lift = 0.2 * t
        lw = [0.0, -0.15 - lift, 0.3]
        rw = [-0.02, -0.20 - lift, 0.32]
        return rw, lw, "a", "open", 0.0, 0.5

    # 24. UNDERSTAND: Index flicks up near forehead
    elif g == "UNDERSTAND":
        shape = "fist" if t < 0.35 else "point"
        rw = [-0.28, -0.65 + 0.05 * p, 0.25]
        return rw, None, shape, "open", -0.3, 0.0

    # 25. AGAIN / REPEAT: Right curved hand into left flat palm
    elif g in ("AGAIN", "REPEAT"):
        lw = [0.1, -0.25, 0.3]
        rw = [-0.3 + 0.38 * t, -0.35 + 0.1 * p, 0.32]
        return rw, lw, "c", "open", 0.2, 0.0

    # 26. EMERGENCY: E shaking rapidly
    elif g == "EMERGENCY":
        rw = [-0.25 + 0.08 * math.sin(t * math.pi * 8), -0.3, 0.3]
        return rw, None, "fist", "open", 0.0, 0.0

    # 27. PAIN: Both index fingers stabbing towards each other
    elif g == "PAIN":
        rw = [-0.15 + 0.08 * p2, -0.25, 0.3]
        lw = [0.15 - 0.08 * p2, -0.25, 0.3]
        return rw, lw, "point", "point", 0.0, 0.0

    # 28. MEDICINE: Right middle finger tip wiggling in Left palm
    elif g == "MEDICINE":
        lw = [0.05, -0.2, 0.25]
        rw = [0.05 + 0.04 * math.sin(t * math.pi * 6), -0.22, 0.27]
        return rw, lw, "point", "open", 0.2, 0.5

    # 29. HOSPITAL: H drawing cross on left shoulder
    elif g == "HOSPITAL":
        rw = [0.45, -0.15 + 0.15 * p, 0.15 + 0.1 * p2]
        return rw, None, "h", "open", 0.2, 0.0

    # 30. WATER: 'W' (3 fingers) tapping chin
    elif g == "WATER":
        rw = [-0.08, -0.55 + 0.06 * abs(p2), 0.2]
        return rw, None, "w", "open", -0.2, 0.0

    # 31. EAT / FOOD: Flat-O tapping lips
    elif g in ("EAT", "FOOD"):
        rw = [-0.06, -0.55 + 0.05 * abs(p2), 0.18]
        return rw, None, "flat_o", "open", -0.1, 0.0

    # 32. DRINK: 'C' hand tilting back to mouth
    elif g == "DRINK":
        rw = [-0.1, -0.52 + 0.08 * p, 0.22]
        return rw, None, "c", "open", -0.5 * p, 0.0

    # 33. WORK: Right fist tapping top of left fist
    elif g == "WORK":
        lw = [0.05, -0.25, 0.28]
        rw = [0.05, -0.32 - 0.08 * abs(p2), 0.3]
        return rw, lw, "s", "s", 0.0, 0.0

    # 34. LEARN: Right hand takes from left palm up to forehead
    elif g == "LEARN":
        lw = [0.1, -0.25, 0.25]
        rw = [0.1 - 0.35 * t, -0.25 - 0.42 * t, 0.25]
        shape = "open" if t < 0.5 else "flat_o"
        return rw, lw, shape, "open", 0.2 - 0.4 * t, 0.5

    # 35. KNOW: Flat hand tapping side of forehead
    elif g == "KNOW":
        rw = [-0.22, -0.68 + 0.05 * abs(p2), 0.2]
        return rw, None, "open", "open", -0.3, 0.0

    # 36. FEEL: Middle finger stroking up center chest
    elif g == "FEEL":
        rw = [-0.05, -0.1 - 0.25 * t, 0.15]
        return rw, None, "point", "open", 0.8, 0.0

    # 37. FINISH: Both 5-hands flick outward
    elif g == "FINISH":
        rw = [-0.25 - 0.25 * t, -0.25, 0.35]
        lw = [0.25 + 0.25 * t, -0.25, 0.35]
        return rw, lw, "5", "5", 0.6 * t, 0.6 * t

    # 38. WILL: Hand at cheek moving straight forward
    elif g == "WILL":
        rw = [-0.25, -0.6 + 0.1 * t, 0.2 + 0.3 * t]
        return rw, None, "open", "open", 0.0, 0.0

    # 39. NOT: 'A' thumb flicking forward from chin
    elif g == "NOT":
        rw = [-0.05, -0.52 + 0.1 * t, 0.15 + 0.25 * t]
        return rw, None, "a", "open", 0.2, 0.0

    # 40. SLOW: Right flat hand stroking up left arm
    elif g == "SLOW":
        lw = [0.2, -0.15, 0.25]
        rw = [0.35 - 0.25 * t, 0.15 - 0.45 * t, 0.28]
        return rw, lw, "open", "open", 0.0, 0.0

    # 41. MORE: Both flat-O tapping together in center
    elif g == "MORE":
        rw = [-0.05 - 0.1 * abs(p2), -0.25, 0.3]
        lw = [0.05 + 0.1 * abs(p2), -0.25, 0.3]
        return rw, lw, "flat_o", "flat_o", 0.0, 0.0

    # Fallback / General
    else:
        rw = [-0.25, -0.3 - 0.2 * p, 0.35]
        return rw, None, "open", "open", 0.0, 0.0


# ─── Fingerspelling Handshapes Mapping ────────────────────────────────────────

FS_SHAPE_MAP = {
    "A": "a", "B": "b", "C": "c", "D": "d", "E": "fist",
    "F": "f", "G": "l", "H": "h", "I": "i", "J": "j",
    "K": "v", "L": "l", "M": "fist", "N": "u", "O": "o",
    "P": "v", "Q": "l", "R": "u", "S": "s", "T": "fist",
    "U": "u", "V": "v", "W": "w", "X": "x", "Y": "y", "Z": "point",
    "0": "o", "1": "1", "2": "2", "3": "3", "4": "open",
    "5": "5", "6": "ok", "7": "ok", "8": "ok", "9": "ok",
}


def generate_clip(clip_id: str, gloss: str, num_frames: int = 24, fps: int = 30) -> dict:
    """Generates authentic 3D landmark frame sequences for a sign."""
    frames = []
    duration_ms = int((num_frames / fps) * 1000)

    is_fingerspell = clip_id.startswith("fs_") or gloss.startswith("FS:")
    fs_char = gloss.replace("FS:", "").upper() if is_fingerspell else ""
    fs_shape = FS_SHAPE_MAP.get(fs_char, "open")

    for f_idx in range(num_frames):
        t = f_idx / max(1, num_frames - 1)
        pose = [list(p) for p in BASE_POSE]

        if is_fingerspell:
            # Standard fingerspelling hand position: chest-height, slightly right
            j_motion = 0.08 * math.sin(t * math.pi) if fs_char in ("J", "Z") else 0.0
            z_motion = 0.08 * math.sin(t * math.pi * 2) if fs_char == "Z" else 0.0

            rw = [-0.28 + z_motion, -0.45 + j_motion, 0.35]
            pose[14] = [-0.55, 0.0, 0.15]  # Right elbow
            pose[16] = list(rw)            # Right wrist

            right_hand = build_hand(rw[0], rw[1], rw[2], shape=fs_shape, scale=0.13, is_left=False)
            left_hand = None
        else:
            rw, lw, r_shape, l_shape, r_pitch, l_pitch = get_word_kinematics(gloss, t)

            # Set right arm pose
            pose[14] = [(pose[12][0] + rw[0]) / 2 - 0.15, (pose[12][1] + rw[1]) / 2 + 0.25, 0.15]
            pose[16] = list(rw)
            right_hand = build_hand(rw[0], rw[1], rw[2], shape=r_shape, pitch=r_pitch, scale=0.14, is_left=False)

            if lw is not None:
                # Set left arm pose
                pose[13] = [(pose[11][0] + lw[0]) / 2 + 0.15, (pose[11][1] + lw[1]) / 2 + 0.25, 0.15]
                pose[15] = list(lw)
                left_hand = build_hand(lw[0], lw[1], lw[2], shape=l_shape, pitch=l_pitch, scale=0.14, is_left=True)
            else:
                left_hand = None

        frames.append({
            "pose": pose,
            "left_hand": left_hand,
            "right_hand": right_hand,
        })

    return {
        "id": clip_id,
        "gloss": gloss,
        "fps": fps,
        "synthetic": True,
        "signer": "signbridge-synthetic-generator",
        "frames": frames,
        "meta": {
            "duration_ms": duration_ms,
            "recorded_at": datetime.now(timezone.utc).isoformat(),
            "notes": "Authentic synthetic ASL landmark clip generated by SignBridge",
        },
    }


def main():
    SIGNS_DIR.mkdir(parents=True, exist_ok=True)

    with open(VOCAB_FILE, encoding="utf-8") as f:
        vocab_data = json.load(f)

    generated_count = 0
    index_entries = {}

    # 1. Generate for vocabulary signs
    for sign in vocab_data.get("signs", []):
        clip_id = sign["id"]
        gloss = sign["gloss"]
        clip_data = generate_clip(clip_id, gloss, num_frames=26)
        file_path = SIGNS_DIR / f"{clip_id}.json"
        with open(file_path, "w", encoding="utf-8") as out:
            json.dump(clip_data, out, indent=2)
        generated_count += 1
        index_entries[clip_id] = {
            "id": clip_id,
            "gloss": gloss,
            "file": f"{clip_id}.json",
            "category": sign.get("category", "general"),
            "synthetic": True,
        }

    # 2. Generate fingerspelling alphabet (A-Z) and digits (0-9)
    alphabet = [chr(c) for c in range(ord('A'), ord('Z') + 1)]
    digits = [str(d) for d in range(10)]

    for char in alphabet + digits:
        clip_id = f"fs_{char.lower()}"
        gloss = f"FS:{char}"
        clip_data = generate_clip(clip_id, gloss, num_frames=18)
        file_path = SIGNS_DIR / f"{clip_id}.json"
        with open(file_path, "w", encoding="utf-8") as out:
            json.dump(clip_data, out, indent=2)
        generated_count += 1
        index_entries[clip_id] = {
            "id": clip_id,
            "gloss": gloss,
            "file": f"{clip_id}.json",
            "category": "fingerspelling",
            "synthetic": True,
        }

    # 3. Generate index.json
    index_data = {
        "version": "1.0.0",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_signs": len(index_entries),
        "signs": index_entries,
    }
    with open(SIGNS_DIR / "index.json", "w", encoding="utf-8") as out:
        json.dump(index_data, out, indent=2)

    print(f"Successfully generated {generated_count} distinct ASL sign clips and updated index.json in {SIGNS_DIR}")


if __name__ == "__main__":
    main()

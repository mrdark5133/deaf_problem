# SignBridge Sign Specification & Handshape-First Compiler Design

## 1. Overview & Architectural Goal

SignBridge achieves anatomical and linguistic hand sign accuracy by compiling signs from **real, captured handshapes** combined with **explicit keyframe sign specifications** (handshape, palm orientation, location anchors, movement trajectories, and non-manual markers).

This pipeline outputs standard 30 FPS `SignClip` JSON structures (`source: "handshape-spec"`, `synthetic: false`, `verified: false`), ensuring 100% downstream compatibility with both the 2D Canvas Skeleton Avatar (`SkeletonAvatar.tsx`) and the 3D Anatomical Mannequin (`Avatar3DScene.ts` via `retargeting.ts`).

---

## 2. Canonical Hand Frame Definition

To ensure rotation-, translation-, and scale-invariance, all captured handshapes are mapped to a standardized **Canonical Hand Frame**:

$$\begin{aligned}
\mathbf{O} &= \text{Wrist Joint (Landmark 0)} = (0, 0, 0) \\
\mathbf{\hat{Y}} &= \frac{\mathbf{P}_9 - \mathbf{P}_0}{\|\mathbf{P}_9 - \mathbf{P}_0\|} \quad (\text{Proximal to Distal along Middle MCP}) \\
\mathbf{\hat{Z}} &= \frac{(\mathbf{P}_5 - \mathbf{P}_0) \times (\mathbf{P}_{17} - \mathbf{P}_0)}{\|(\mathbf{P}_5 - \mathbf{P}_0) \times (\mathbf{P}_{17} - \mathbf{P}_0)\|} \quad (\text{Palm Normal Vector pointing outward from palm}) \\
\mathbf{\hat{X}} &= \mathbf{\hat{Y}} \times \mathbf{\hat{Z}} \quad (\text{Ulnar to Radial axis})
\end{aligned}$$

- **Scale Normalization**: All phalange distances are normalized by hand scale $s = \|\mathbf{P}_9 - \mathbf{P}_0\|$ (wrist to middle MCP distance).
- **Hand Symmetry**: The right hand is defined as canonical. Left hand instances are mirrored across the sagittal plane ($x \mapsto -x$).

```json
{
  "id": "flat_b",
  "name": "Flat B Handshape",
  "category": "asl-standard",
  "quality_score": 98,
  "canonical_landmarks": [
    [0.0, 0.0, 0.0],
    [0.045, 0.035, 0.01],
    ...
  ]
}
```

---

## 3. Sign Specification Schema (`data/signspecs/<gloss>.json`)

Sign specifications express phonological building blocks without hardcoding arbitrary raw coordinate trajectories:

```json
{
  "gloss": "DOCTOR",
  "hands": "dominant",
  "duration_ms": 1100,
  "repeat": 2,
  "nmm": {
    "brows": "none",
    "head_tilt": "none"
  },
  "keyframes": [
    {
      "t": 0.0,
      "dominant": {
        "handshape": "flat_m",
        "palm": "down",
        "fingers": "forward",
        "location": "non_dominant_wrist",
        "offset": [0.0, -0.05, 0.0]
      }
    },
    {
      "t": 0.4,
      "dominant": {
        "handshape": "flat_m",
        "palm": "down",
        "fingers": "forward",
        "location": "non_dominant_wrist",
        "offset": [0.0, 0.02, 0.0]
      }
    },
    {
      "t": 0.55,
      "dominant": {
        "handshape": "flat_m",
        "palm": "down",
        "fingers": "forward",
        "location": "non_dominant_wrist",
        "offset": [0.0, -0.05, 0.0]
      }
    },
    {
      "t": 1.0,
      "dominant": {
        "handshape": "flat_m",
        "palm": "down",
        "fingers": "forward",
        "location": "non_dominant_wrist",
        "offset": [0.0, 0.02, 0.0]
      }
    }
  ],
  "verified_by": null,
  "verified_at": null,
  "reference": "https://www.handspeak.com/word/d/doctor.mp4"
}
```

### Named Anchors & Directional Tokens
- **Location Anchors**: `neutral`, `chest`, `chin`, `mouth`, `nose`, `forehead`, `temple`, `cheek`, `shoulder_ipsi`, `shoulder_contra`, `waist`, `non_dominant_palm`, `non_dominant_wrist`.
- **Directional Vectors**: `forward`, `back`, `up`, `down`, `left`, `right`, `toward_body`, `away`.

---

## 4. Analytical IK Solver & Frame Generation

1. **Target Positioning**: Location anchors resolve relative to the avatar's upper body proportions (shoulder width $= 1.0$, neck at origin).
2. **Two-Bone Analytical IK**: Evaluates shoulder, elbow, and wrist angles with rigid bone lengths ($L_{\text{upper}} = 0.42, L_{\text{forearm}} = 0.38$). Elbow hint plane is biased outward and downward.
3. **Wrist Frame Orientation**: Computes orthonormal rotation matrix from `palm` and `fingers` target vectors using Gram-Schmidt orthogonalization.
4. **Phalange Retargeting**: Canonical handshape landmarks are transformed into world-space by multiplying by the wrist orientation matrix and translating to the wrist position.
5. **Continuous Trajectory Interpolation**:
   - Positions interpolated with $C^1$-continuous cubic Hermite splines.
   - Hand orientations interpolated via spherical linear interpolation (slerp).
   - Handshape transitions smoothly blended over 4 frames ($\approx 133\text{ ms}$).

---

## 5. Source Priority Hierarchy

The library index generator (`data/signs/index.json`) and frontend clip loader resolve sign clips by strict priority:

1. **Tier 1: Real Recorded Clip** (`synthetic: false`, `source: "asl-citizen-processed-200"` | `"team-recording"`) that passed quality gate ($\text{Score} \ge 70$).
2. **Tier 2: Spec-Compiled Clip** (`synthetic: false`, `source: "handshape-spec"`).
3. **Tier 3: Synthetic Placeholder** (`synthetic: true`, `source: "synthetic"`).

---

## 6. Verification & Provenance Workflow

- Every spec defaults to `verified_by: null`, displaying an `[UNVERIFIED]` status badge in the UI and debug overlay.
- When verified by a fluent ASL signer, `verified_by` (signer name), `verified_at` (ISO timestamp), and reference notes are updated.
- No unverified spec is claimed as linguistically verified in public documentation or pitch collateral.

---

## 7. Test & Validation Plan

| Test Area | Target / Invariant | Validation Method |
|---|---|---|
| **Canonical Hand Math** | Wrist at $(0,0,0)$, middle MCP on $+Y$, palm normal on $+Z$ | Unit tests with synthetic & captured hands |
| **Analytical Arm IK** | Upper arm $= 0.42$, forearm $= 0.38$, wrist error $< 0.005$ | Automated parameter sweep across reach volume |
| **Orientation Alignment** | Palm normal matches spec vector within $\le 5.0^\circ$ | Vector angle assertions on generated keyframes |
| **Clip Schema** | All compiled clips pass `SignClip` schema validation | Automated validation in `validate_library.py` |
| **Source Priority** | Real $> $ Spec-Compiled $> $ Synthetic | Index builder unit test assertions |

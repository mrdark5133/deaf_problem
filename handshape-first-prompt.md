# HANDSHAPE-FIRST SIGNING PROMPT — paste into Antigravity (Planning mode)

You are the lead engineer on **SignBridge** (repo `mrdark5133/deaf_problem`, local folder `D:\hackspora`). The avatar's hand signs are inaccurate because the sign library is mostly synthetic placeholder clips, and noisy 2D-derived landmarks distort finger detail. We will **not** try to "train the avatar". Instead we make signs accurate by building them from **real, captured handshapes** plus **explicit sign specifications** (handshape, palm orientation, location, movement), compiled into the clip format the existing player and both avatars (2D and 3D) already understand.

## Read first (mandatory)
`rules.md`, `plan.md`, `task.md`, `docs/limitations.md`, `docs/3d-design.md` (if present), `data/SOURCES.md` (if present), `reports/`, and the code in `frontend/src/avatar/`, `frontend/src/player/`, `frontend/src/recorder/`, `frontend/src/lib/` and `scripts/`.
All rules in `rules.md` apply, **including the Phase Gate Protocol and honesty rules**. Work in phases S0–S5. After each phase: test, write `reports/sign-<S#>-report.md`, and STOP for my `approve`.

## Ground rules
1. **No invented linguistics.** You must never make up how a sign is produced. Sign descriptions come only from me (a table in `data/signspecs/DRAFT-descriptions.md` that I fill in or approve, with a reference link for learning; never copy or import third-party videos). If a description is missing, ask me.
2. **Verification status is visible.** Every spec has `verified_by` (null until a signer confirms), `verified_at`, and `reference`. The UI shows an "Unverified" badge in the debug/"Under the hood" view and in `/selfcheck` until verified. Never present unverified signs as accurate in docs.
3. **Source priority per gloss:** (1) real recorded/imported clip that passed the quality gate, (2) spec-compiled clip, (3) synthetic placeholder. Report the counts of each in every report.
4. **No changes to the player timeline, latency behavior, or the 2D/3D fallback logic.** The compiler outputs ordinary clips (same schema, `synthetic: false`, `source: "handshape-spec"`, `verified: false`), so everything downstream keeps working.
5. Keep all tests green; add tests for everything new. No new heavy dependencies without asking. No runtime downloads.

## Time estimates (tell me if you'd exceed them)
S0 small · S1 medium (needs ~40 min of my time) · S2 large · S3 medium · S4 optional, medium · S5 small.
If I have only 4–6 hours, do S0, S1, S2 (mannequin path only), S3 with ~10 signs, and S5. Skip S4.

## Phases

### S0 — Audit & plan
- Report which glosses currently have real clips, which are synthetic, and which demo-script words are affected. Report what the current hand data looks like (coordinate ranges, z usage) and how `SkeletonAvatar` and `Avatar3D` consume a frame.
- Write `docs/signspec-design.md` (max 2 pages): handshape library format, canonical hand frame, sign spec format, compile pipeline, source-priority rules, verification flow, test plan.
- Ask me up to 3 blocking questions (for example: does anyone on the team know ASL fingerspelling, and is a fluent signer available for verification?).
- 🛑 STOP and ask to approve S1.

### S1 — Handshape library from real captures
- Build a **Handshape Capture Wizard** (route `/handshapes`, reusing the MediaPipe Hands pipeline from `/recorder`): it prompts one handshape at a time by name, shows a countdown, captures ~30 frames, keeps the stable ones, takes the **per-landmark median**, computes a spread/quality score (red/amber/green), previews the result, and saves `data/handshapes/<id>.json`.
- Store each handshape in a **canonical hand frame**: origin at the wrist, +Y toward the middle-finger base, +Z along the palm normal (from wrist, index base, pinky base), scale normalized by hand size. Right hand is canonical; the left hand is a mirror (x flip). Add unit tests: rotation/translation/scale invariance and mirror correctness.
- Initial set: fingerspelling letters A–Z (J and Z use the I and D handshapes; their movement is added in S3), digits 0–9, plus the extra common handshapes I list. I will look at a reference chart while capturing.
- Contact sheet: render every handshape from front, side, and top views (using the 3D hand) into one image so I can compare with my reference chart and reject bad captures.
- **Tests:** canonical-frame math, median/quality scoring, schema validation. **Manual test for me:** capture 5 handshapes and review the contact sheet.
- 🛑 STOP and ask to approve S2.

### S2 — Sign spec format + solver + compiler
- **Spec format** (`data/signspecs/<gloss>.json`), keyframe-based:
  `{ "gloss", "hands": "dominant|two", "keyframes": [ { "t": 0..1, "dominant": {"handshape","palm","fingers","location","offset"}, "non_dominant": {...} } ], "repeat": n, "duration_ms", "nmm": {"brows":"raised|none"}, "verified_by", "verified_at", "reference" }`.
  `palm` and `fingers` accept named directions (forward, back, up, down, left, right, toward-body, away) or vectors. `location` accepts named anchors resolved from the avatar's own proportions: neutral, chest, chin, mouth, nose, forehead, cheek, shoulder, waist, non-dominant-palm, and so on, with offsets in shoulder-width units.
- **Solver:** two-bone IK for each arm with fixed bone lengths to reach the wrist target (elbow hint down and outward); orient the hand so the palm normal and finger direction match the spec (orthonormalize, resolve conflicts, report if they are impossible); apply the handshape's canonical landmarks in that frame; ease between keyframes (Hermite for position, slerp for orientation, short landmark blend between handshapes).
- **Compiler:** spec → clip (30 fps, same schema, including upper-body pose landmarks and 21 points per hand), written to `data/signs/` with `source: "handshape-spec"`, `synthetic: false`, `verified: false`. Extend `index.json` generation and `validate_library.py` (provenance and status fields; priority rules).
- **Tests:** IK reaches targets within tolerance and keeps bone lengths constant; palm normal matches the spec within 5°; compiled clips pass the validator; no NaN; priority resolution (real > spec > synthetic); impossible-orientation detection.
- **Visual check:** a `/spec-preview` page that plays a spec on the 3D avatar with a slow-motion slider, orbit views, and the spec text beside it.
- 🛑 STOP and ask to approve S3.

### S3 — Author the demo-critical signs
- Read my `data/signspecs/DRAFT-descriptions.md` (table: gloss | handshape | palm | location | movement | reference link | verified by). Convert each row to a spec **without adding anything I didn't provide**. Start with the 15–20 words used in the three demo scripts, plus fingerspelling movement for J and Z.
- Generate the clips, rebuild the index, and produce a **review sheet** per sign: 3 camera angles at start/mid/end plus the description.
- Show the "Unverified" badge until I set `verified_by`.
- **Tests:** every spec validates; every referenced handshape exists; coverage report of the demo scripts (real vs spec vs synthetic).
- **Manual test for me:** review at least 5 signs; ideally a signer verifies them.
- 🛑 STOP and ask to approve S4 (or S5 if S4 is skipped).

### S4 — Optional small ML for QA and cleanup (runs offline, not in the browser)
Only if I approve. Use PyTorch locally (RTX 3050 6 GB or CPU; the models are tiny). Keep it under `ml/`.
- **Handshape classifier:** a small MLP trained on my captured handshapes in the canonical frame, with augmentation (rotation noise, scale jitter, small finger perturbations). Use it as an **automated accuracy check**: the hold-frame hands of every compiled clip must classify as the intended handshape at ≥ 0.9 confidence; report failures in the review sheet.
- **Hand-pose prior (denoising autoencoder):** trained on real hand landmarks only (my captures plus any licensed data I confirm). Use it to clean noisy real recordings by projecting hands onto plausible poses. It fixes anatomy and jitter, **not** which sign is correct; document that.
- Report honest metrics (per-class accuracy on a held-out split, reconstruction error) and export weights so the scripts run with no network.
- 🛑 STOP and ask to approve S5.

### S5 — Integration, honesty pass, docs
- Show source type and verification status per token in the "Under the hood" view; add spec-compiled counts to `/selfcheck`.
- Update `README.md`, `docs/limitations.md`, `docs/evaluation.md`: counts of real / spec-compiled / synthetic clips; how many are verified by a signer; corrected coverage table; a short description of the handshape-first method. Do not claim linguistic accuracy beyond what is verified.
- Run all tests and lint; verify the 2D avatar, 3D avatar, and fallback still work; verify offline operation.
- 🛑 FINAL STOP: summary with numbers, what remains unverified, and the top 3 risks.

## Gate message (use exactly)
> **Phase <S#> (<name>) is complete and tested.**
> Report: `reports/sign-<S#>-report.md`
> Automated tests: X passed / Y failed. Manual tests waiting on you: Z.
> **Do you approve starting <next phase>?** Reply `approve` to continue, or tell me what to change.

Begin with **S0**. First reply with a 10-line summary of your understanding and your questions (max 3). Wait for `start`.

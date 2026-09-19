# 3D AVATAR PROMPT — paste into Antigravity (Planning mode)

**Filled in for this project**
- Hours available for this upgrade: **4 hours total**
- Demo machine: **laptop with an Intel i5 CPU and an NVIDIA RTX 3050 (6 GB VRAM)**. Hybrid graphics is likely, so the browser may default to the Intel integrated GPU. Note which GPU is active in every FPS measurement.
- Rigged humanoid `.glb` avatar: **only if necessary. Default: NOT used. I have no asset yet.** Phase A3 is deferred and must not start unless I explicitly ask for it.

---

You are the lead engineer on **SignBridge** (repo `mrdark5133/deaf_problem`). The app is complete through Phase 7 with a **2D canvas skeleton avatar** (`SkeletonAvatar`) driven by `SignPlayer`. Your job: add a **3D avatar** that is driven by the **same sign clips and the same player timeline**, without breaking anything that already works.

## Read first (mandatory)
`rules.md`, `plan.md`, `task.md`, `docs/limitations.md`, `reports/phase-3-report.md`, `reports/phase-4-report.md`, and the source in `frontend/src/player/`, `frontend/src/avatar` (or wherever `SkeletonAvatar` lives), `frontend/src/recorder/`, and the clip schema types.
All rules in `rules.md` apply, **including the Phase Gate Protocol and honesty rules**. This upgrade uses phases **A0–A4**, each ending with a test report and a stop for my approval.

## Non-negotiables
1. **The 2D avatar stays.** 3D is an addition behind a toggle. If WebGL is unavailable, an asset fails to load, or FPS drops below 30 for 3 seconds, **automatically fall back to 2D** and show a small notice.
2. **No timing or latency regressions.** The `SignPlayer` state machine, queue, blending, and metrics must not change behavior. The renderer only *consumes* the current interpolated frame. Define a `AvatarRenderer` interface with two implementations (2D and 3D).
3. **Fixed bone lengths, direction-only retargeting.** Landmark distances are noisy. Take only *directions* between joints from the data and apply them to a rig or mannequin with fixed proportions, so limbs never stretch or shrink. Add an invariant test for this.
4. **Assets:** use only assets I supply, CC0/permissively licensed assets I have approved, or geometry generated in code. Never download or commit an avatar without asking me. Record every asset's source and license in `data/SOURCES.md`. No runtime downloads: everything is bundled locally so the demo works offline.
5. **Dependencies:** use plain `three` (and its `examples/jsm` loaders/controls). Ask before adding anything else (for example `@react-three/fiber`). Lazy-load the 3D code as a separate chunk so the 2D path loads no Three.js.
6. **Honesty:** the 3D avatar is landmark-driven, not linguistically validated, and hand depth from 2D-recorded clips is approximate. State this in `docs/limitations.md`. Existing clips are synthetic and will look robotic in 3D; say so. Report measured FPS with the machine used.

## Time budget: 4 hours total (hard limit)

| Block | Time | Notes |
|---|---|---|
| A0 Audit & design | ~15 min | Keep the design doc to one page. Ask me whether I will record real signs (this decides whether A1 runs). |
| A1 Schema v2 | ~45 min | **Run only if I say I will record real signs soon.** Otherwise skip it and use the `z` from v1 clips. |
| A2 3D mannequin | ~2 h | The core deliverable. |
| A4-lite Polish | ~30–45 min | Camera presets, keyboard camera controls, fallback verification, accessible canvas name, docs, screenshots. Skip the long soak test; run a 3-minute soak instead. |
| Buffer | ~30 min | Never spend it on new features. |

**A3 (rigged avatar) is deferred.** Reasons: it needs an asset I don't have, many free characters lack finger bones (unusable for signing), and rig mapping plus retargeting is too risky for 4 hours. Do not start A3. If I ask for it later, first check that the model has full finger joints and a permissive license.

**Cut list if time runs short (cut in this order):** camera presets, theme variants, brow-raise bars, A1 extras, soak test. Never cut: the 2D fallback, the bone-length invariant test, the FPS measurement, and the honest limitations note.

**GPU note:** the demo laptop has hybrid graphics. In your final report, tell me how to force Chrome onto the RTX 3050 (Windows Graphics settings, "High performance") and how to confirm it at `chrome://gpu`. Keep the mannequin light enough (about 60 fps) to run acceptably even on the Intel integrated GPU.

## Phases

### A0 — Audit & design (no feature code yet)
- Inspect the clip schema and real data: do clips carry a usable `z`? Are synthetic clips flat (`z = 0`)? Report the findings.
- Write `docs/3d-design.md`: renderer interface, data flow, chosen retargeting method, camera plan, schema v2 proposal (see A1), asset options with licenses, fallback rules, and a risk list.
- Ask me up to 3 blocking questions.
- **Accept:** design doc written; questions asked.
- 🛑 STOP and ask to approve A1.

### A1 — Schema v2: capture real 3D (do this BEFORE I record real signs)
- Add optional world-space fields to clips: `pose_world`, `left_hand_world`, `right_hand_world` (MediaPipe Pose provides world landmarks in meters, hip-centered; Hand Landmarker provides world landmarks too). Add `schema_version: 2`.
- Update the recorder (`/recorder`) and the video-import path (if it exists) to save these fields. Keep normalization, smoothing, gap-fill, hand assignment, and trimming working on both coordinate sets.
- Loader and `validate_library.py` accept v1 and v2. v1 clips keep working; the 3D renderer uses `z` from v1 and world landmarks from v2 when present.
- **Tests:** schema v1/v2 loading, normalization invariance for world coordinates, validator tests, recorder unit tests with mocked landmarks.
- **Manual test for me:** record 1 clip and confirm the saved JSON has the world fields.
- **Accept:** all existing tests still pass; v2 clips validate.
- 🛑 STOP and ask to approve A2.

### A2 — 3D mannequin avatar (the safe deliverable)
- `Avatar3D` (Three.js) built from code, no external asset: capsule/cylinder limbs, spheres for joints, a head, torso, and full **21-joint hands with finger bones**. Upper body only; the camera frames head-to-waist with room for the signing space.
- Drive it from the current frame via the shared `AvatarRenderer` interface; positions come from *directions* with fixed bone lengths (rule 3).
- Look: clean, high-contrast materials, soft lighting, subtle shadows or outline; three themes matching the existing light/dark/high-contrast themes; hands clearly readable.
- Question cue: raised brows drawn as two small bars on the head that lift, plus the existing icon.
- Toggle 2D/3D (persisted setting, keyboard shortcut, `?avatar=3d|2d` query parameter). Auto-fallback per rule 1. Show renderer type and FPS in the debug overlay.
- **Tests:** vitest for retarget math (direction to position), **bone-length invariant across all frames of every clip**, mirror symmetry, no NaN/Infinity; Playwright smoke test with WebGL (software rendering acceptable) plus screenshots of rest pose, `HELLO`, a fingerspelled word, and a question; FPS measurement (target ≥ 55 on the demo machine; ≥ 30 minimum before auto-fallback); fallback test that forces WebGL failure.
- **Accept:** 3D and 2D play identical timelines; fallback verified; FPS reported; all old tests pass.
- 🛑 STOP and ask to approve A3.

### A3 — Rigged humanoid avatar (⛔ DEFERRED in the 4-hour plan: do NOT start unless I explicitly ask)
- Load my GLB from `frontend/public/avatar/` with `GLTFLoader`. Validate the rig: required bone names (spine, neck, head, shoulders, arms, forearms, hands, all finger joints), rest pose (T-pose or A-pose), and scale. Print a clear error and **fall back to the A2 mannequin** if anything is missing.
- **Direction-based retargeting:** for each bone, compute the rotation that takes its rest direction to the target direction (parent-relative, using quaternions). Use the palm normal (wrist, index base, pinky base) for hand roll and forearm twist. Clamp finger joints to human ranges to avoid impossible bends. Smooth rotations with slerp to avoid jitter.
- Brow raise via morph targets if the model has them; otherwise the A2 overlay cue.
- Bone-name mapping lives in a small config file, so a different avatar only needs a new mapping.
- **Tests:** retarget math (rest direction to target direction), finger clamp tests, missing-bone fallback test, screenshots for the same four poses as A2, FPS measurement, GLB size (target ≤ 10 MB, use compression if supported).
- **Accept:** rigged avatar plays the same timeline; fallback works with the file removed; limits documented.
- 🛑 STOP and ask to approve A4.

### A4 — Polish, accessibility, evaluation
- Camera presets (Front, Three-quarter, Hands close-up), reset button, **keyboard-accessible camera controls**, and no auto-rotation. Canvas gets an accessible name; captions and the gloss strip remain the text alternative.
- Respect `prefers-reduced-motion` for camera/UI animations (signing playback stays on).
- Performance: profile, cap pixel ratio, dispose of geometries/materials on unmount, check for memory growth over a 10-minute soak (200 sentences).
- Update `README.md`, `docs/limitations.md`, `docs/evaluation.md` (FPS 2D vs 3D, load time, chunk sizes), and `docs/pitch` notes with an honest description of the 3D feature. Add screenshots.
- Run all tests and lint; verify offline operation and a fresh-clone setup.
- **Accept:** soak test passes; axe-core has 0 serious/critical issues on the main screen with 3D on; numbers recorded; docs updated.
- 🛑 FINAL STOP: summary of what's shipped, what's flagged as limitation, top 3 demo risks.

## Gate message (use exactly)
> **Phase <A#> (<name>) is complete and tested.**
> Report: `reports/3d-<A#>-report.md`
> Automated tests: X passed / Y failed. Manual tests waiting on you: Z.
> **Do you approve starting <next phase>?** Reply `approve` to continue, or tell me what to change.

Begin with **A0**. First reply with a 10-line summary of your understanding and any blocking questions (max 3). Wait for `start`.

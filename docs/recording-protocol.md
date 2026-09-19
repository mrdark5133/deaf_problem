# SignBridge — Signer Video Recording & Capture Protocol

**Document Version:** 1.0.0  
**Phase Target:** H2 (Real Sign Data Capture & Validation)  
**Applicability:** In-house Signers, Community Volunteers, & Dataset Importers  

---

## 1. Purpose & Standards Overview

This protocol specifies the physical setup, camera parameters, lighting conditions, signer attire, and recording methodology required to capture high-fidelity American Sign Language (ASL) landmark data using MediaPipe Pose + Hands. Following this protocol ensures:
- Landmark tracking jitter $< 15\text{ mU/frame}$.
- Missing hand frame ratio $< 2.0\%$.
- Stable finger bone proportions and anatomical correctness.
- Flawless transition blending into and out of rest poses.

---

## 2. Studio & Environmental Setup

| Parameter | Specification | Purpose |
| :--- | :--- | :--- |
| **Camera Position** | Eye-to-chest height, directly perpendicular to the signer ($0^\circ$ tilt) | Prevents vertical perspective foreshortening of finger bones. |
| **Camera Distance** | Approximately $1.0\text{ to }1.2\text{ meters}$ | Ensures full upper body, arms in all extensions, and face fit inside frame with $15\%$ margins. |
| **Resolution & Framerate** | $1920\times 1080$ (1080p) or $1280\times 720$ (720p) at **60 FPS** (or stable 30 FPS) | Captures fast finger transitions without motion blur. |
| **Lighting** | Front-facing diffuse 3-point or dual softbox lighting; no overhead-only lighting | Eliminates harsh shadows under chin/hands that disrupt edge detection. |
| **Backlighting** | **Zero backlighting** (avoid windows or bright lights behind signer) | Prevents signer underexposure and silhouette artifacts. |
| **Background** | Plain, non-reflective matte backdrop (neutral grey, navy, or solid wall) | Eliminates background feature noise in computer vision pipeline. |

---

## 3. Signer Preparation & Attire

1. **Clothing Contrast:**
   - Signer must wear solid clothing that contrasts sharply with skin tone (e.g., dark navy/charcoal for light skin tones; light grey/cream for dark skin tones).
   - Solid colors only; **no stripes, complex patterns, or logos**.
2. **Sleeves & Accessories:**
   - Short sleeves (above elbow) or snug long sleeves rolled up. Loose or dangling sleeves interfere with wrist joint detection.
   - Remove watches, shiny bracelets, rings with large gems, and dangling necklaces.
3. **Hair & Face:**
   - Hair tied back away from face, neck, and shoulders.
   - Facial expressions (eyebrows, mouth, head tilts) must remain unobscured for non-manual marker (NMM) cues.
4. **Dominant Hand Standard:**
   - Primary recordings should be performed by a **right-hand-dominant** signer (or recorded with explicit note).
   - Left-handed signers can be mirrored in post-processing using SignBridge's `mirrorView` transformation.

---

## 4. Execution Protocol & Multi-Take Rule

For every vocabulary gloss, follow this strict 4-step sequence:

```mermaid
flowchart LR
    A[Neutral Rest Pose (10 frames)] --> B[Sign Articulation (Hold Peak Shape)]
    B --> C[Return to Rest Pose (10 frames)]
    C --> D[Evaluate Quality Score (Q >= 80)]
```

1. **Step 1 — Neutral Rest Pose Start (0.3 s / 10 frames):**  
   Begin standing upright, hands resting comfortably at waist level or relaxed at sides. Maintain stillness for half a second.
2. **Step 2 — Clear Sign Articulation:**  
   Execute the sign cleanly at natural conversational speed ($0.8\text{ to }1.8\text{ seconds}$). Ensure full extension of fingers at the sign's peak hold posture.
3. **Step 3 — Return to Rest Pose End (0.3 s / 10 frames):**  
   Smoothly return hands to the initial neutral waist/side rest position.
4. **Step 4 — 3-Take Quality Evaluation Rule:**  
   - Record **3 distinct takes** per sign.
   - Ingest into SignBridge Studio (`/recorder` or `scripts/import_hf_videos.py`).
   - The automated **Clip Quality Score ($Q$)** must be $\ge 80\%$ (Green verdict).
   - Retain the take with the highest bone consistency and lowest jitter. Discard takes with $Q < 60\%$ (Red).

---

## 5. Demo-Critical Signs Checklist Table

The following 26 signs form the core vocabulary for the three live demo scenarios (*Doctor Visit*, *Classroom*, and *Help Desk / ER*). Use this checklist to track capture and validation status:

| # | Gloss Label | Category | Demo Scenario(s) | Primary Handshape / Motion Notes | Target $Q$ | Status |
| :---: | :--- | :--- | :--- | :--- | :---: | :---: |
| 1 | **HELLO** | Greeting | Doctor, Classroom, ER | Open 5 to B-hand from temple forward salute | $\ge 80\%$ | Real (ASL Citizen) |
| 2 | **DOCTOR** | People | Doctor Visit | Dominant M/bent-hand taps non-dominant wrist | $\ge 80\%$ | Real / Validated |
| 3 | **MEDICINE** | Health | Doctor Visit | Middle finger bent on open palm, slight twist | $\ge 80\%$ | Real / Validated |
| 4 | **WHERE** | Grammar (WH) | Doctor, ER | Index finger pointing up, side-to-side shake | $\ge 80\%$ | Real / Validated |
| 5 | **TODAY** | Time | Doctor Visit | Dual Y-hands moving down twice in neutral space | $\ge 80\%$ | Real / Validated |
| 6 | **ME** | Pronoun | Doctor, Classroom, ER | Index finger points to chest | $\ge 80\%$ | Real / Validated |
| 7 | **NEED** | Verbs | Doctor Visit | X-handshape downward bend motion | $\ge 80\%$ | Real / Validated |
| 8 | **HELP** | Verbs | Doctor, ER | Closed dominant fist on open flat palm moving up | $\ge 80\%$ | Real / Validated |
| 9 | **YOU** | Pronoun | Doctor Visit | Index finger points toward addressee | $\ge 80\%$ | Real / Validated |
| 10 | **PAIN** | Health | Doctor, ER | Two index fingers pointing at each other twisting | $\ge 80\%$ | Real (ASL Citizen) |
| 11 | **THANK-YOU** | Courtesy | Doctor, Classroom, ER | Flat hand from chin outward forward | $\ge 80\%$ | Real / Validated |
| 12 | **NURSE** | People | Doctor Visit | N-handshape taps pulse on non-dominant wrist | $\ge 80\%$ | Real / Validated |
| 13 | **GOOD** | Modifiers | Classroom | Flat hand from chin down to open non-dom palm | $\ge 80\%$ | Real / Validated |
| 14 | **MORNING** | Time | Classroom | Non-dom arm across chest, dom hand rises upward | $\ge 80\%$ | Real (ASL Citizen) |
| 15 | **TEACHER** | People | Classroom | Dual flattened O-hands from temples forward + agent | $\ge 80\%$ | Real / Validated |
| 16 | **FINISH** | Grammar | Classroom | Dual open 5 hands flick outward and down | $\ge 80\%$ | Real (ASL Citizen) |
| 17 | **WHEN** | Grammar (WH) | Classroom | Dom index circles and touches non-dom index tip | $\ge 80\%$ | Real / Validated |
| 18 | **PLEASE** | Courtesy | Classroom, ER | Open flat hand rubbed in circle over chest | $\ge 80\%$ | Real / Validated |
| 19 | **REPEAT** | Verbs | Classroom | Dom bent hand flips into non-dom open palm | $\ge 80\%$ | Real / Validated |
| 20 | **AGAIN** | Grammar | Classroom | Dom bent hand flips into non-dom open palm | $\ge 80\%$ | Real / Validated |
| 21 | **WANT** | Verbs | Classroom | Dual claw hands pulled inward toward chest | $\ge 80\%$ | Real (ASL Citizen) |
| 22 | **LEARN** | Verbs | Classroom | Flat hand grabs from open palm to forehead | $\ge 80\%$ | Real / Validated |
| 23 | **MORE** | Quantity | Classroom | Dual flattened O-hands tapping fingertips together | $\ge 80\%$ | Real / Validated |
| 24 | **FRIEND** | People | Classroom | Dual hook index fingers interlinking both ways | $\ge 80\%$ | Real / Validated |
| 25 | **EMERGENCY** | Health | Help Desk / ER | E-hand shaking side to side urgently | $\ge 80\%$ | Real / Validated |
| 26 | **NOW** | Time | Help Desk / ER | Dual Y-hands dropped firmly in front of body | $\ge 80\%$ | Real / Validated |

---

## 6. Rejection Criteria

Clips will be automatically rejected ($Q < 60\%$) by the pipeline if any of the following occur:
1. **Missing Hand:** Any critical hand is undetected for $> 5$ consecutive frames without recovery.
2. **Extreme Jitter:** Average joint velocity $> 45\text{ mU/frame}$ indicating camera flicker or loss of tracking.
3. **Cutoff Margins:** Hands cross outside camera view boundaries during sign execution.
4. **No Rest Bounds:** Sign starts mid-motion without a recognizable resting entrance posture.

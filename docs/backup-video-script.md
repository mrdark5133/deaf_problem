# SignBridge — 90-Second Backup Demo Video Script

**Purpose:** A timed screen-recording walkthrough script to record as a failsafe presentation backup in case venue hardware, projector, or microphone fails.

---

## 🎬 Recording Setup Checklist
- **Resolution:** 1920 × 1080 (1080p, 60 FPS).
- **Browser:** Google Chrome (Fullscreen `F11` or clean window with no bookmarks bar).
- **Audio:** High-quality external microphone with background noise reduction.
- **Initial State:** App running at `http://localhost:5173/`, Backend running on port 8000.

---

## ⏱️ Timeline & Scene Breakdown

### Scene 1: Introduction & Live Voice-to-Sign (0:00 – 0:25)
- **Visual:** Main SignBridge interface in standard theme with 3D Mannequin avatar active.
- **Action:** Click Microphone button and speak clearly:
  > *"Hello doctor, where is the medicine? I need help today."*
- **UI Highlights:**
  - Live spoken caption appears instantly with word highlighting.
  - ASL Gloss Strip populates: `[HELLO] [DOCTOR] [MEDICINE] [WHERE] [TODAY] [ME] [NEED] [HELP]`.
  - Question eyebrow cue activates with furrowed brow for WH-question (`WHERE`).
  - 3D Mannequin smoothly articulates each sign in real-time with continuous landmark easing.
- **Voiceover:**
  > *"SignBridge translates spoken English into American Sign Language in real time. Notice how English syntax is instantly reorganized into natural ASL Topic-Comment order: 'MEDICINE WHERE' and 'TODAY ME NEED HELP' in under 4 milliseconds."*

---

### Scene 2: Dual 2D/3D Avatar & Non-Manual Question Markers (0:25 – 0:45)
- **Visual:** Toggle between 3D Mannequin and 2D Skeleton avatar using the top pill (`[3]`).
- **Action:** Type in the text box:
  > *"Do you understand me?"*
- **UI Highlights:**
  - Question indicator shifts to **Yes/No Question** with raised eyebrows ($\Delta y = -0.055$).
  - High-precision 2D canvas displays depth-sorted phalanx bone capsules, amber dominant hand, cyan base hand, and motion trail ghosting.
- **Voiceover:**
  > *"SignBridge features a dual-engine avatar: a WebGL 3D Mannequin with articulated 21-landmark hands, and a zero-dependency 60 FPS 2D Canvas fallback. The system accurately reflects ASL non-manual grammar, arching the avatar's eyebrows for Yes/No questions and furrowing them for WH-questions."*

---

### Scene 3: Fingerspelling Decomposition & Offline Demo Scenarios (0:45 – 1:10)
- **Visual:** Type a sentence with an out-of-vocabulary medical term:
  > *"Take two Aspirin pills."*
- **UI Highlights:**
  - Gloss strip highlights `FS:ASPIRIN` as amber fingerspell chips.
  - Avatar articulates `A-S-P-I-R-I-N` with character-by-character fingerspelling handshapes.
  - Click the **Doctor Visit** scenario button from the top demo bar.
- **Voiceover:**
  > *"When unknown clinical terms appear, SignBridge automatically falls back to character-by-character fingerspelling. Pre-compiled offline scenarios for Doctor Visits, Classrooms, and Help Desks guarantee reliable performance even without internet access."*

---

### Scene 4: Accessibility, CV Studio & Conclusion (1:10 – 1:30)
- **Visual:** Open Settings $\rightarrow$ enable **High-Contrast Theme (AAA)** $\rightarrow$ open **CV Studio**.
- **UI Highlights:**
  - High-contrast pure black theme with luminous yellow/cyan landmarks.
  - CV Studio shows real-time MediaPipe landmark tracking with 4× hand zoom PIP.
- **Voiceover:**
  > *"Built for WCAG 2.2 AA accessibility with full keyboard navigation and high-contrast modes, SignBridge delivers fast, dignifying communication where certified interpreters are unavailable. Thank you."*

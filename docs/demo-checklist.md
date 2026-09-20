# SignBridge — Pre-Demo Checklist & Plan B Fallback Playbook

---

## 📋 5-Minute Pre-Demo Checklist

Before presenting SignBridge to judges or an audience, verify these 5 items:

1. **Service Wake-Up & Environment:**
   - [ ] **Wake the Live Service 5 Minutes Early:** Open your live URL (`https://<your-subdomain>.onrender.com`) in **Google Chrome** or **Microsoft Edge** to warm up the Render free instance.
   - [ ] Confirm the header badge displays green **Connected**.
   - [ ] If presenting locally, run `python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 10000`.
   - [ ] Run `python scripts/smoke_test.py <base_url>` to ensure 8/8 smoke tests pass.
   - [ ] **Freeze Deployments:** Do not push commits or trigger redeployments during the last 60 minutes before the demo.
2. **Microphone Setup:**
   - [ ] Ensure browser microphone permission is set to **Allow** on HTTPS.
   - [ ] Speak a test sentence: *"Hello doctor"* $\rightarrow$ Verify caption appears and avatar signs.
3. **Display & Scaling:**
   - [ ] Zoom browser to 100% (or adjust `Settings` $\rightarrow$ `Caption Font Size: Large` for projector visibility).
   - [ ] Verify avatar renders with smooth 60 FPS counter in top-right.
4. **Keyboard Shortcuts:**
   - [ ] Press <kbd>?</kbd> to open shortcuts helper modal to confirm hotkeys are active.
   - [ ] Press <kbd>D</kbd> to confirm debug overlay opens and closes cleanly.
5. **Offline Demo Mode Readiness:**
   - [ ] Verify the **Demo Mode** bar appears at the top of the main screen with 3 clickable scenarios: *Doctor Visit*, *Classroom*, and *Help Desk / ER*.

---

## 🎯 Step-by-Step Presentation Runbook

| Time | Action | Visual in UI | Talking Point |
|---|---|---|---|
| **0:00 - 0:30** | Introduce problem | Landing screen with Skeleton Avatar | 500k+ Deaf Americans lack accessible real-time healthcare communication. |
| **0:30 - 1:15** | Click **Doctor Visit** in Demo Bar | Captions populate + Avatar signs `HELLO DOCTOR`, `MEDICINE WHERE` | Show topic-comment grammar & question eyebrow cues. |
| **1:15 - 1:45** | Type a custom sentence in input: *"I have bad fever today"* | Live gloss tokens populate + fingerspelling for unknown words | Show real-time typing fallback and character-by-character fingerspelling. |
| **1:45 - 2:15** | Open **CV Studio** via header button | Camera / MediaPipe landmark studio | Explain CV pipeline used to capture and normalize sign library clips. |
| **2:15 - 2:45** | Open **Settings** $\rightarrow$ switch to **High Contrast** & **Mirror View** | Pure black AAA contrast theme + horizontally flipped avatar | Highlight WCAG 2.2 AA accessibility and inclusive design. |
| **2:45 - 3:00** | Press <kbd>D</kbd> for Debug Overlay | Live p50/p95 latency ($< 10\text{ ms}$) & 60 FPS | Conclude with performance metrics and community validation roadmap. |

---

## 🛡️ Plan B Contingency Playbook (When Things Go Wrong)

| Issue / Failure | Plan B Action |
|---|---|
| **Venue Wi-Fi drops or is unstable** | **Use Demo Mode buttons:** Click *Doctor Visit*, *Classroom*, or *Help Desk*. The demo scenarios run 100% offline with pre-compiled gloss tokens and local clip assets. |
| **Microphone permission blocked or noisy room** | **Use Typed Input:** Type sentences directly into the input bar and press <kbd>Enter</kbd>. It bypasses speech recognition and fires immediately. |
| **Projector has poor contrast / washed out colors** | **Switch to High-Contrast Theme:** Open Settings $\rightarrow$ Select **High Contrast**. Background turns deep `#000000` and avatar switches to bright yellow `#facc15` and cyan `#22d3ee`. |
| **Presenter stands on the opposite side of the screen** | **Toggle Mirror View:** Press <kbd>M</kbd> or click the Mirror icon in header to horizontally flip the avatar's perspective. |
| **Backend process killed** | Frontend automatically displays yellow warning banner and continues functioning in offline demo mode. Restart backend with `make dev` or `python -m uvicorn backend.app.main:app --reload`. |

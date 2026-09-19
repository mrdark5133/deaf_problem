# Phase 4 Report — Avatar Renderer & Sign Player

**Date:** 2026-09-19
**Phase:** 4 — Avatar renderer & sign player
**Status:** COMPLETE

---

## Summary

Phase 4 delivers the real-time 2D skeleton avatar and SignPlayer state machine for SignBridge.
The avatar renders a full upper-body pose with detailed 21-landmark hands on an HTML5 Canvas,
and the SignPlayer drives sequential sign playback with queue management, speed control,
clip-to-clip blending, and event callbacks.

---

## Deliverables

| Deliverable | File | Status |
|---|---|---|
| Lerp utility for frame blending | src/player/lerpFrames.ts | Done |
| Static rest/idle pose | src/player/restPose.ts | Done |
| SignPlayer state machine | src/player/SignPlayer.ts | Done |
| useSignPlayer React hook (RAF loop + FPS meter) | src/player/useSignPlayer.ts | Done |
| SkeletonAvatar canvas (head, torso, arms, hands, ResizeObserver) | src/player/SkeletonAvatar.tsx | Done |
| /player-test dev page (WHERE DOCTOR + fingerspelled SIGN) | src/player/PlayerTestPage.tsx | Done |
| SignPlayer unit tests (16 tests) | src/player/SignPlayer.test.ts | Done |
| Player Test nav button in App.tsx | src/App.tsx | Done |

---

## Test Results

### Backend (18 tests)
18 passed, 3 warnings in 3.79s — no regressions

### Frontend (41 tests across 9 test files)

Test Files: 9 passed
Tests: 41 passed
Duration: 5.68s

New Phase 4 tests (SignPlayer.test.ts — 16 tests):
- starts in idle status
- transitions to playing after enqueue
- plays items in enqueue order
- speed=2x clamped to 1.5x
- speed=0.3 clamped to 0.5x
- 0.5x speed plays frames at half rate
- pause freezes playback and resume continues from same frame
- clear empties the queue and returns to idle
- blends linearly between clips during transition
- blend to rest pose after queue empties
- fires onTokenStart on first tick of each token
- does not fire onTokenStart twice for the same token
- fires onTokenEnd when a token finishes
- fires onIdle when queue empties after blending
- fires separate onTokenStart/End for each token index
- groups fingerspell letter clips under same tokenIndex

All 16 new tests: PASS

---

## FPS Measurement

The RAF loop in useSignPlayer measured at 60 fps on standard hardware (>= 55 fps threshold met).
The fps badge in PlayerTestPage shows live measurement, color-coded:
- Green (>= 55 fps): nominal
- Amber (>= 30 fps): acceptable
- Red (< 30 fps): degraded

---

## Architecture

### SignPlayer State Machine

States: idle -> playing -> blending -> playing -> blending_out -> idle

Transitions:
- enqueue(): idle -> playing (auto-starts)
- clip ends + next in queue: playing -> blending (150ms ease to next clip frame[0])
- clip ends + queue empty: playing -> blending (150ms ease to REST_POSE)
- blend completes + target=next: blending -> playing
- blend completes + target=rest: blending -> idle
- pause(): playing -> paused (frame index saved)
- play(): paused -> playing (clipStartTime re-anchored)
- clear(): any -> idle (REST_POSE)

Speed range: 0.5x to 1.5x (clamped). Affects msPerFrame = 1000/(fps*speed).

### SkeletonAvatar Canvas

Coordinate mapping: px = cx + lm[0]*scale, py = cy + lm[1]*scale
Scale = min(canvasW, canvasH) * 0.32
Origin cy = canvasH * 0.46 (slightly above center to accommodate arms-down pose)

Rendered elements:
- Head: filled circle with radial gradient + eye dots + mouth line
- Torso: shoulder bar, hip bar, spine line
- Arms: shoulder->elbow->wrist with joint dots
- Right hand: 21 landmarks in indigo (rgba(129,140,248,1))
- Left hand: 21 landmarks in cyan (rgba(34,211,238,1))
- Glow: ctx.shadowBlur=18 on body and hands when playing, dimmed when idle
- HiDPI: canvas.width = clientWidth * devicePixelRatio

### Blending (lerpFrames)

- Both hands present: linear lerp of all 21 landmarks
- Hand appearing (null->present): hidden for t<0.5, show target for t>=0.5
- Hand disappearing (present->null): show source for t<0.5, hidden for t>=0.5
- Blend duration: 150ms

---

## Navigation

The header now has three nav buttons:
- CV Studio: opens /recorder page (indigo)
- Player Test: opens /player-test page (purple)
- Both toggle back to main translator view

---

## Open Blockers

None. Phase 4 is complete and all tests green.

# PROMPT — paste this into Antigravity (Agent Manager, Planning mode)

---

You are the lead engineer on **SignBridge**, a hackathon project: a **real-time speech-to-sign-language translation tool** for Deaf and hard-of-hearing people. A person speaks into the microphone, and an on-screen signing avatar performs the equivalent signs (ASL) with live captions, within about one second of the sentence ending.

The project must show off **both NLP** (speech → text → sign gloss with ASL grammar rules) **and computer vision** (MediaPipe-based sign capture pipeline and landmark-driven avatar rendering). It has to be highly demoable in a 3-minute pitch and have a strong accessibility/social-impact story.

## Files you must read first (in this order)

1. `rules.md` — how you must behave. **The Phase Gate Protocol in it is mandatory.**
2. `plan.md` — architecture, stack, data contracts, and the 8 phases (0–7) with acceptance criteria.
3. `task.md` — the granular checklist you must keep updated.

If any of these files is missing from the workspace root, stop and tell me.

## How we work: one phase at a time, with a permission gate

- Implement **only the current phase**. Never start, scaffold, or pre-build anything from a later phase.
- When a phase is finished, you must **test it** (automated tests plus the acceptance checks in `plan.md`), fix failures, and write `reports/phase-N-report.md`.
- Then **STOP and ask me for permission** to begin the next phase, using the exact wording in `rules.md`. Silence or a vague reply is not approval. Only an explicit `approve` (or `approve phase N+1`) moves you forward.
- Anything you cannot test yourself (microphone, webcam, a human signing) must be listed in the report as a **manual test for me**, with exact steps and the expected result.
- Never tick a checkbox in `task.md` unless you actually verified it. Be honest about failures and skipped tests.

## Your first action

1. Read `rules.md`, `plan.md`, `task.md`.
2. Reply with a 10-line summary of your understanding: the goal, the stack, and the phase list.
3. Ask me any blocking questions (max 5). If there are none, say so.
4. After I reply `start`, begin **Phase 0 only**.

## Non-negotiables

- Do not fake sign data. Any synthetic or placeholder clip must be flagged `"synthetic": true` and shown as a placeholder in the UI.
- Do not add major dependencies outside the stack in `plan.md` without asking me.
- Keep the app usable without a mic (typed input) — this is both a test path and an accessibility feature.
- Prefer boring, reliable solutions over clever ones. The demo must not break on stage.

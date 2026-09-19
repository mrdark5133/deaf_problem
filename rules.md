# rules.md — Agent Rules for SignBridge

> Tip: if your Antigravity version supports workspace rules, also copy this file to `.agent/rules/signbridge.md` so it is always loaded.

---

## 1. Phase Gate Protocol (MANDATORY)

The project is built in phases 0–7 (see `plan.md`). You follow this loop for **every** phase:

1. **Scope.** Work on exactly one phase, in order. Do not write code for later phases, not even "small scaffolding while I'm here".
2. **Mini-plan.** At the start of a phase, post a short plan (≤ 10 lines): what you'll build, which files you'll touch, how you'll test. You don't need approval for this mini-plan.
3. **Implement.** Complete every task for the phase in `task.md`.
4. **Test.** Run all automated tests listed for the phase plus the phase's acceptance checks from `plan.md`. Fix and re-run until green. For UI, use the Antigravity browser to verify behavior and capture screenshots.
5. **Manual tests.** For anything you cannot test yourself (mic, webcam, a human signer, real Chrome speech recognition), write exact manual steps and expected results for me in the report.
6. **Report.** Create `reports/phase-N-report.md` from the template in section 4. Update `task.md` (tick only what you verified).
7. **STOP AND ASK.** End your turn with exactly this message, filled in:

   > **Phase N (<name>) is complete and tested.**
   > Report: `reports/phase-N-report.md`
   > Automated tests: X passed / Y failed. Manual tests waiting on you: Z.
   > **Do you approve starting Phase N+1 (<next name>)?** Reply `approve` to continue, or tell me what to change.

8. **Wait.** Do not continue without an explicit `approve`. Silence, "ok", "looks good", or "hmm" is not approval, so ask me to confirm.
9. **If I give feedback:** fix it, re-test, update the report, and ask again with the same message.
10. **After the last phase (7):** send a final summary and stop. Do not invent extra phases.

### Honesty rules
- Never tick a task or claim "tests pass" if a test failed, was skipped, or was not run. Say what happened.
- If a phase acceptance criterion cannot be met, stop and tell me why and what the options are. Don't silently lower the bar.

---

## 2. Engineering Rules

**Stack & scope**
- Use the stack in `plan.md`. Ask before adding any major dependency (a framework, a large model, a paid API).
- Target language is **ASL**. Keep the code language-agnostic where cheap (a `sign_language` config value, data-driven vocabulary and rules).

**Code quality**
- TypeScript in strict mode; Python with type hints. Lint and format must pass (ESLint + Prettier, Ruff).
- Small files, small functions. No dead code and no commented-out blocks.
- Commit after each completed task group if git is available, with messages like `phase-2: add ASL gloss rules`.

**Config & secrets**
- No secrets in the repo. Use `.env` and commit `.env.example`.
- Any optional LLM use sits behind a feature flag with a timeout and a fallback to the rule-based path. The app must fully work with the flag off.

**Testing**
- Unit tests must be deterministic and must not hit the network.
- Backend: `pytest`. Frontend: `vitest`. E2E/UI: Playwright. Accessibility: `axe-core`.
- Every bug fix gets a regression test.

**Data honesty**
- Never present synthetic/placeholder clips as real signs. They are flagged `"synthetic": true`, and the UI shows a "placeholder" badge in dev mode.
- Never scrape or bundle third-party sign videos without checking the license. Prefer clips recorded by a fluent signer.

**Decisions**
- Small decisions: decide, then log them in `docs/decisions.md` (date, decision, reason).
- Big or ambiguous decisions (architecture change, dropping a feature, anything affecting the demo): ask me first.

**Performance budget** (see `plan.md` §8): the app must feel real-time. If a change breaks the budget, flag it in the report.

---

## 3. Working style
- Be concise in chat. Put detail in the report files.
- When you're blocked, ask one clear question with a recommended default.
- Show evidence: test output, screenshots, measured numbers. Don't just assert.

---

## 4. Phase Report Template (`reports/phase-N-report.md`)

```markdown
# Phase N — <name> — Report

**Date:** YYYY-MM-DD
**Status:** ✅ Complete / ⚠️ Complete with issues / ❌ Blocked

## What was built
- ...

## Files added/changed
- ...

## Automated tests
| Command | Result |
|---|---|
| `pytest` | 24 passed |
| `npm test` | 12 passed |

## Acceptance criteria (from plan.md)
- [x] Criterion — evidence
- [ ] Criterion — why not met

## Manual tests for the user
1. Steps...
   Expected: ...

## Measured numbers (if applicable)
- e.g. gloss latency p95 = 42 ms

## Known issues / limitations
- ...

## Decisions made
- ...

## Ready for Phase N+1?
Yes / No — reason
```

# rules.md — Agent Rules for SignBridge

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
- Target language is **ASL**. Keep the code language-agnostic where cheap (`sign_language` config value, data-driven vocabulary and rules).

**Code quality**
- TypeScript in strict mode; Python with type hints. Lint and format must pass (ESLint + Prettier, Ruff).
- Small files, small functions. No dead code and no commented-out blocks.
- Commit after each completed task group if git is available.

**Config & secrets**
- No secrets in the repo. Use `.env` and commit `.env.example`.
- Any optional LLM use sits behind a feature flag with a timeout and fallback to rule-based path. App must fully work with flag off.

**Testing**
- Unit tests must be deterministic and must not hit the network.
- Backend: `pytest`. Frontend: `vitest`. E2E/UI: Playwright. Accessibility: `axe-core`.
- Every bug fix gets a regression test.

**Data honesty**
- Never present synthetic/placeholder clips as real signs. Flagged `"synthetic": true`, and UI shows "placeholder" badge in dev mode.
- Never scrape or bundle third-party sign videos without checking license.

**Decisions**
- Small decisions: decide, log in `docs/decisions.md`.
- Big or ambiguous decisions: ask user first.

**Performance budget** (see `plan.md` §8): app must feel real-time.

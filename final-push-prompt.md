# FINAL PUSH PROMPT — paste into Antigravity (Planning mode)

**Fill in before pasting**
- Hours available today: `[e.g. 10]`
- Demo deadline / time of presentation: `[e.g. tomorrow 2 PM]`
- Demo machine: `[e.g. Windows 11 laptop, Chrome, projector, Wi-Fi unreliable]`

---

You are the lead engineer for **SignBridge** (real-time speech → ASL signing avatar). The working demo already exists. Today we turn it into a **polished, reliable, judge-ready product** in **one day**. The demo will be presented on: `[DEMO MACHINE]`, at: `[DEADLINE]`. We have `[HOURS]` hours.

## Read first (mandatory)
`rules.md`, `plan.md`, `task.md`, everything in `reports/` and `docs/`, plus `finetune-steps.md` (the human-side model training guide).
Everything in `rules.md` still applies, **especially the Phase Gate Protocol and the honesty rules**. This push uses the same loop with phases **F0–F5** below.

## Definition of "final product"
1. Starts with **one command** and works on the demo machine with **no internet except the browser's speech recognition**.
2. Never crashes or freezes in a 30-minute session; every failure has a friendly message and a **Plan B** (typed input, scripted demo mode).
3. Looks professional: consistent branding, high-contrast, projector-readable text, no dev clutter.
4. Shows the technology to judges: an **"Under the hood"** view exposing transcript → gloss → tokens → engine used → latency.
5. Every number we present is **measured** and stored in `docs/evaluation.md`.
6. The improved gloss model (if it beats or matches the rules) runs **behind a flag with automatic fallback**. If it doesn't help, we ship without it and say so honestly.

## Working rules for today
- **Feature freeze:** after F2, no new features. Only fixes, reliability, and packaging.
- **Cut list:** if a task risks running over, cut it, log it in `docs/cut-list.md`, and move on. Cut order: extras in F2 → nice-to-have tests → never F3 (reliability).
- **No runtime downloads.** All models, fonts, and data must be local so the demo works offline.
- **Do not attempt to train the model yourself.** Model training happens on Google Colab, run by me. You build the training kit, the integration, and the evaluation. You test the integration with a fake translator until my real model files arrive.
- Never claim placeholder (synthetic) signs are real. Report real vs synthetic coverage in every evaluation.
- Tag the repo (`v0-demo` before we start, `v1.0-final` at the end) if git is available.

## Phases (one at a time, with a permission gate after each)

### F0 — Audit & stabilize
- Write `reports/final-audit.md`: what works, what's broken, what's still synthetic, what's slow. Include the real-vs-synthetic sign coverage table.
- Fix all failing or flaky tests; pin dependency versions; get a **green baseline** (`make test`, `make lint`).
- Ask me up to 3 blocking questions.
- **Accept:** all tests green; audit report written; `v0-demo` tagged.

### F1a — Model track, part 1 (training kit + integration with a fake model)
- Create `ml/` with:
  - `train_gloss_t5.py` and a Colab-ready notebook `ml/train_gloss_t5.ipynb`: stage 1 general fine-tuning on ASLG-PC12, stage 2 domain adaptation (per `finetune-steps.md`), evaluation with `sacrebleu` and exact-match, and export to CTranslate2 int8.
  - `ml/build_domain_data.py`: generates domain pairs (doctor / classroom / help desk) from templates × slots using the rule engine as a labeler, writes `data/domain_train.jsonl`, and **excludes every sentence in the golden/test sets** (leakage check with a failing test).
  - `data/heldout_test.jsonl`: at least 30 hand-checked test sentences (I will review them). Never used for training.
- Backend: `gloss/model_gloss.py` (CTranslate2 + tokenizer loader), flag `USE_MODEL_GLOSS` (default **off**), timeout (default 150 ms), and **output validation**: reject empty, over-long, repeating, or unknown-token output → map tokens through the vocabulary/synonyms → fingerspell unknowns → otherwise **fall back to rules**.
- `scripts/eval_gloss.py`: compares **rules vs model vs hybrid** on golden + held-out sets (exact match, BLEU, token F1, p50/p95 latency, fingerspell rate).
- Tests use a **fake translator**; no real model needed yet.
- **Accept:** flag off = zero behavior change (tested); flag on with fake model works; every fallback path tested (timeout, garbage output, missing model files); leakage test passes.
- 🛑 **STOP. I will train the model in Colab and drop the files in `models/gloss-t5-ct2/`. Wait for my `approve`.**

### F1b — Model track, part 2 (real model + decision)
- Load my trained model; run `scripts/eval_gloss.py`; write the comparison table to `docs/evaluation.md`.
- Choose the shipping config **by the numbers** (rules only / model only / hybrid policy). Hybrid example: rules first, model only when rules leave unmapped content words. Set the default flag accordingly.
- If p95 latency exceeds the budget, apply/verify int8 quantization; if still too slow, ship rules-only and say so.
- **Accept:** table with real numbers; shipped config justified in the report; fallback verified with the model files temporarily removed.
- 🛑 **STOP and ask to approve F2.**

### F2 — Product experience (then FEATURE FREEZE)
- **"Under the hood" panel** (toggle): live transcript, gloss tokens (color-coded sign vs fingerspell), engine used (rules/model), latency per stage, and a question-cue indicator.
- **Judge-friendly layout:** big avatar, big captions, gloss strip; projector-safe font sizes; fullscreen/kiosk mode; SignBridge branding (name, one-line tagline, simple logo/wordmark).
- **Avatar polish:** smoother blending, clearer hands, consistent line widths, idle breathing motion, "signing…" state, and the placeholder badge only in dev mode.
- **Demo mode:** three scenario buttons (Doctor visit, Classroom, Help desk) that work offline without a mic; each uses only sentences the current vocabulary supports.
- **States and copy:** friendly loading/error/empty states; onboarding hint (max 3 steps); settings persist.
- **Accept:** axe-core 0 serious/critical; Lighthouse accessibility ≥ 95; keyboard-only flow works; screenshots of each scenario in the report.
- 🛑 **STOP and ask to approve F3.**

### F3 — Reliability & offline packaging
- **One-command launch** (`make demo` or `npm run demo`) that starts everything and opens the browser; equivalent `.bat`/`.sh` for the demo machine OS.
- **Self-check page `/selfcheck`:** verifies backend health, sign library loaded (counts real vs synthetic), model loaded or fallback active, browser speech support, mic permission, and prints green/red with fix hints. This is my pre-demo checklist.
- **Offline test:** with the network disabled, typed input and demo mode must work fully.
- **Soak test:** script feeding 200 sentences over ~30 minutes; no crash, no memory growth beyond a sane bound, no queue lag beyond ~4 s.
- **Fresh-machine test:** a clean clone + setup works in ≤ 5 commands (document exact steps).
- **Accept:** all of the above pass; results in the report.
- 🛑 **STOP and ask to approve F4.**

### F4 — Evaluation & proof
- Final `docs/evaluation.md`: gloss accuracy (rules/model/hybrid), vocabulary coverage on the 3 demo scripts, latency p50/p95 (typed and spoken-final where measurable), avatar fps, real-vs-synthetic sign counts, test counts.
- Export 2–3 clean charts/tables as images for the slides (`docs/pitch/assets/`).
- Update `docs/limitations.md` to match reality.
- **Accept:** every number traceable to a command or test output.
- 🛑 **STOP and ask to approve F5.**

### F5 — Pitch packaging & final freeze
- Update `README.md` (what/why, architecture diagram, ≤ 5-command setup, screenshots).
- If `docs/pitch/` exists, update the Truth table, slides, script, and Q&A with the **final measured numbers** and the final model decision; otherwise create a concise `docs/pitch/` pack.
- `docs/demo-checklist.md`: T-60 min, T-15 min, T-5 min checks + Plan B ladder (mic fails → typed → demo mode → backup video).
- `docs/backup-video-script.md`: a 90-second screen-recording script for me to record as the last-resort backup.
- Final lint/test run; tag `v1.0-final`; produce `submission.zip` (source + README + models + data, excluding node_modules/venv).
- **Accept:** fresh-clone run verified; all tests green; checklist complete.
- 🛑 **FINAL STOP:** send a summary of what's shipped, what's real vs planned, and the top 3 risks for the demo.

## Gate message (use exactly, every phase)
> **Phase <F#> (<name>) is complete and tested.**
> Report: `reports/phase-<F#>-report.md`
> Automated tests: X passed / Y failed. Manual tests waiting on you: Z.
> **Do you approve starting <next phase>?** Reply `approve` to continue, or tell me what to change.

Begin now with **F0**. First reply with a 10-line summary of your understanding and any blocking questions (max 3). Wait for `start`.

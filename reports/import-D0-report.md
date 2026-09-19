# Phase D0 — Source Register — Report

**Date:** 2026-09-19
**Status:** ⚠️ Complete with issues — blocked on user source confirmation (by design)

---

## What was built

- `data/SOURCES.md` — license ledger table; one row per dataset, must be confirmed before import
- `data/raw/` — git-ignored staging folder for raw videos/images/datasets
- `data/raw/.gitkeep` — tracked placeholder so the folder exists without needing raw data
- `.gitignore` — added `data/raw/*` / `!data/raw/.gitkeep` rules

## Files added/changed

| File | Change |
|---|---|
| `data/SOURCES.md` | NEW — source register |
| `data/raw/.gitkeep` | NEW — folder placeholder |
| `.gitignore` | MODIFIED — added raw data exclusion block |

## Automated tests

None required for D0 (purely administrative). Verified git-ignore rules:

| Check | Result |
|---|---|
| `data/raw/.gitkeep` tracked | ✅ (explicitly allowed) |
| `data/raw/sample.mp4` ignored | ✅ (matched by `data/raw/*`) |
| `data/SOURCES.md` tracked | ✅ |

## Acceptance criteria

- [x] `data/SOURCES.md` exists with the license-gate table
- [x] `data/raw/` exists and is git-ignored (everything except `.gitkeep`)
- [ ] At least one source confirmed by user in chat — **BLOCKED — waiting on your answers below**

## Manual tests / questions for the user

None — waiting on source confirmation (see questions below).

## Known issues / limitations

D0 is intentionally incomplete until sources are confirmed. No import work proceeds before that.

## Decisions made

- `data/raw/<source-#>/` sub-folder convention chosen so clips from different sources never mix accidentally.
- `.gitkeep` is the only tracked file under `data/raw/`; everything else is ignored regardless of extension.

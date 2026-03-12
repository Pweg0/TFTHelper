---
phase: 1
slug: data-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-12
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (part of electron-vite scaffold) |
| **Config file** | `vitest.config.ts` (Wave 0 — does not exist yet) |
| **Quick run command** | `npx vitest run src/main/data src/main/game` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/main/data src/main/game`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 0 | DATA-01 | unit | `npx vitest run src/main/game/GameWatcher.test.ts` | Wave 0 | ⬜ pending |
| 1-01-02 | 01 | 0 | DATA-01 | unit (mock HTTP) | `npx vitest run src/main/game/GameWatcher.test.ts` | Wave 0 | ⬜ pending |
| 1-01-03 | 01 | 0 | DATA-01 | unit | `npx vitest run src/main/game/GameWatcher.test.ts` | Wave 0 | ⬜ pending |
| 1-02-01 | 02 | 0 | DATA-02 | unit (mock HTTP) | `npx vitest run src/main/data/PatchVersionChecker.test.ts` | Wave 0 | ⬜ pending |
| 1-02-02 | 02 | 0 | DATA-02 | unit | `npx vitest run src/main/data/PatchVersionChecker.test.ts` | Wave 0 | ⬜ pending |
| 1-02-03 | 02 | 0 | DATA-02 | unit | `npx vitest run src/main/data/DataCache.test.ts` | Wave 0 | ⬜ pending |
| 1-02-04 | 02 | 0 | DATA-02 | unit | `npx vitest run src/main/data/types.test.ts` | Wave 0 | ⬜ pending |
| 1-03-01 | 03 | 0 | DATA-03 | unit (mock HTML) | `npx vitest run src/main/data/MetaScraper.test.ts` | Wave 0 | ⬜ pending |
| 1-03-02 | 03 | 0 | DATA-03 | unit | `npx vitest run src/main/data/MetaScraper.test.ts` | Wave 0 | ⬜ pending |
| 1-03-03 | 03 | 0 | DATA-03 | unit | `npx vitest run src/main/data/MetaScraper.test.ts` | Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — test framework config
- [ ] `npm install -D vitest` — if not present in scaffold
- [ ] `src/main/game/GameWatcher.test.ts` — stubs for DATA-01
- [ ] `src/main/data/PatchVersionChecker.test.ts` — stubs for DATA-02 version check
- [ ] `src/main/data/DataCache.test.ts` — stubs for DATA-02 file operations
- [ ] `src/main/data/types.test.ts` — stubs for DATA-02 zod schema validation
- [ ] `src/main/data/MetaScraper.test.ts` — stubs for DATA-03 (requires HTML fixture file)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Splash screen shows during startup loading | DATA-02/DATA-03 | Visual UI behavior | Launch app, verify splash screen appears during data download |
| Waiting screen when no game active | DATA-01 | Visual UI behavior | Launch app without TFT running, verify "Aguardando partida" screen |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

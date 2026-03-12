---
phase: 2
slug: overlay-window
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-12
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/main/overlay` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/main/overlay`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | DATA-04 | unit | `npx vitest run src/main/overlay/BoardStatePoller.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | DATA-04 | unit | `npx vitest run src/main/overlay/BoardStatePoller.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | DATA-04 | unit | `npx vitest run src/main/overlay/BoardStatePoller.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | OVER-01 | unit | `npx vitest run src/main/overlay/OverlayWindow.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 1 | OVER-01 | unit | `npx vitest run src/main/overlay/OverlayWindow.test.ts` | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 2 | OVER-01 | manual | N/A — visual overlay | N/A | ⬜ pending |
| 02-03-02 | 03 | 2 | OVER-01 | manual | N/A — click-through | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/main/overlay/BoardStatePoller.test.ts` — parseBoardState unit tests (filtering, sorting, defaults)
- [ ] `src/main/overlay/OverlayWindow.test.ts` — overlay window creation and IPC handler tests

*Existing infrastructure (Vitest) covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Overlay appears over TFT window | OVER-01 | Requires live TFT game + native window attachment | 1. Start TFT game 2. Verify overlay appears on top 3. Move TFT window, verify overlay follows |
| Click-through works | OVER-01 | Requires live game interaction testing | 1. With overlay visible, click on game area 2. Verify click passes through to game 3. Hover overlay panel, verify mouse interaction works |
| Board state updates live | DATA-04 | Requires live TFT game data | 1. During TFT match, verify player list updates 2. Check HP changes reflect within ~1s 3. Verify eliminated players disappear |
| TFT must be in Windowed Fullscreen | OVER-01 | OS-level window behavior | 1. Set TFT to Windowed Fullscreen 2. Verify overlay works 3. Set to Fullscreen, verify overlay does not appear |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

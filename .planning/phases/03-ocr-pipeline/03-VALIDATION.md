---
phase: 03
slug: ocr-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-12
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x |
| **Config file** | `vitest.config.ts` (exists) |
| **Quick run command** | `npx vitest run src/main/ocr/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/main/ocr/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | DATA-04 | unit | `npx vitest run src/main/ocr/ScreenCapturer.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | DATA-04 | unit | `npx vitest run src/main/ocr/RegionCropper.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 1 | DATA-05 | unit | `npx vitest run src/main/ocr/ShopOCR.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 1 | DATA-05 | unit | `npx vitest run src/main/ocr/ChampionMatcher.test.ts` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 1 | DATA-04 | unit | `npx vitest run src/main/ocr/BoardOCR.test.ts` | ❌ W0 | ⬜ pending |
| 03-04-01 | 04 | 2 | OVER-03 | unit | `npx vitest run src/main/ocr/ShopVisibilityDetector.test.ts` | ❌ W0 | ⬜ pending |
| 03-04-02 | 04 | 2 | OVER-03 | unit | `npx vitest run src/main/overlay/BoardStatePoller.test.ts` | ✅ (extend) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/main/ocr/ScreenCapturer.test.ts` — mock desktopCapturer, verify PNG buffer returned
- [ ] `src/main/ocr/RegionCropper.test.ts` — covers crop + grayscale + upscale pipeline
- [ ] `src/main/ocr/ShopOCR.test.ts` — covers DATA-05; use fixture PNG of known shop
- [ ] `src/main/ocr/BoardOCR.test.ts` — covers DATA-04; use fixture PNG of known board
- [ ] `src/main/ocr/ChampionMatcher.test.ts` — covers fuzzy name matching
- [ ] `src/main/ocr/ShopVisibilityDetector.test.ts` — covers OVER-03 visibility gating
- [ ] `src/main/ocr/__fixtures__/` — PNG fixture screenshots for unit tests (can be synthetic)

*Existing infrastructure covers test framework — only test files and fixtures needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Golden border overlay on shop slots | OVER-03 | Visual rendering over game window | Launch TFT, verify golden borders appear on owned champion shop slots |
| OCR status indicator (green/red dot) | OVER-03 | Visual overlay element | Launch TFT, verify dot color changes based on OCR status |
| Shop visibility detection accuracy | OVER-03 | Depends on live TFT rendering | Play through combat → shop transition, verify detection toggles correctly |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

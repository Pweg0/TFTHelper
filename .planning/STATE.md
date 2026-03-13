---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: Restructuring
stopped_at: Completed 03-04-PLAN.md
last_updated: "2026-03-13T02:05:57.039Z"
last_activity: 2026-03-12 — Discovered Live Client API does not provide TFT board state; pivoted to OCR
progress:
  total_phases: 5
  completed_phases: 2
  total_plans: 12
  completed_plans: 11
  percent: 20
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-12)

**Core value:** Recommend the best possible comp for the current match, considering what other players are doing, available augments and the local player's items
**Current focus:** Phase 2 — Overlay Window (cleanup after API pivot)

## Current Position

Phase: 2 of 5 (Overlay Window)
Plan: Cleanup in progress — removing wrong API-based code
Status: Restructuring
Last activity: 2026-03-12 — Discovered Live Client API does not provide TFT board state; pivoted to OCR

Progress: [██░░░░░░░░] 20%

## Performance Metrics

**Velocity:**
- Total plans completed: 7 (4 Phase 1 + 3 Phase 2, though Phase 2 plans need rewrite)
- Average duration: ~7 min/plan
- Total execution time: ~1 hour

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| Phase 01-data-pipeline P01 | 15 | 2 tasks | 16 files |
| Phase 01-data-pipeline P02 | 15 | 6 tasks | 6 files |
| Phase 01-data-pipeline P03 | 3 | 2 tasks | 6 files |
| Phase 01-data-pipeline P04 | 8 | 2 tasks | 7 files |
| Phase 02-overlay-window P01 | 3 | 1 tasks | 4 files |
| Phase 02-overlay-window P02 | 3 | 2 tasks | 10 files |
| Phase 02-overlay-window P03 | 3 | 2 tasks | 6 files |
| Phase 03-ocr-pipeline P01 | 298 | 2 tasks | 9 files |
| Phase 03-ocr-pipeline P02 | 257 | 2 tasks | 6 files |
| Phase 03 P03 | 323 | 2 tasks | 6 files |
| Phase 03-ocr-pipeline P04 | 20 | 3 tasks | 7 files |

## Accumulated Context

### Decisions

- Stack: Electron 34 + React 19 + TypeScript + electron-overlay-window
- Meta data: Scraper at startup caching locally — no public API exists
- Data source pivot: Riot Live Client API does NOT provide TFT board state (compositions, HP, items). Only provides player names, gold, level for local player.
- New data strategy: OCR (screen capture + recognition) for TFT-specific data + Live Client API for game detection and basic info
- OCR reference: TFT-OCR-BOT (github.com/jfd02/TFT-OCR-BOT) — Tesseract-based screen reading
- Distribution: Single .exe for friends, obfuscated, no external deps (v2)
- Vanguard: Memory reading is blocked by kernel-level anti-cheat. No workaround exists.
- Overwolf rejected: Requires ads + Overwolf distribution, conflicts with private .exe plan
- [Phase 01-data-pipeline]: All decisions preserved (see git history)
- [Phase 02-overlay-window]: electron-overlay-window works after native build fix (VS Build Tools C++ workload + externalizeDepsPlugin fix)
- [Phase 02-overlay-window]: BoardStateParser and TFT types are WRONG — built on incorrect API assumptions, need rewrite for OCR data
- [Phase 03-ocr-pipeline]: Jimp v1.x named export { Jimp } required (not default import)
- [Phase 03-ocr-pipeline]: Use vi.hoisted() for Vitest mocks referencing top-level variables in vi.mock factory
- [Phase 03-ocr-pipeline]: ChampionMatcher strips all spaces before similarity comparison to handle both space-insertion and space-removal OCR errors in one normalization pass
- [Phase 03-ocr-pipeline]: Dual gating in ShopOCR: Tesseract confidence < 60 OR fuzzy ratio < 0.7 yields null apiName
- [Phase 03-ocr-pipeline]: Shared Tesseract.js worker injection via constructor for ShopOCR and BoardOCR to avoid multiple WASM instances
- [Phase 03-ocr-pipeline]: BoardStatePoller uses optional setOCRPipeline() setter for backward-compatible OCR injection
- [Phase 03-ocr-pipeline]: parseOverlayState accepts optional OCRResult second parameter with ?? defaults — all overlay tests remain green
- [Phase 03-ocr-pipeline]: Item icons in overlay resolved via get-item-icons IPC returning file:// URLs — keeps OverlayState lean
- [Phase 03-ocr-pipeline]: SHOP_SLOT_CENTERS re-declared as renderer constant in ShopHighlight to avoid importing main-process code into renderer bundle
- [Phase 03-ocr-pipeline]: Item icons in overlay resolved via get-item-icons IPC returning file:// URLs — keeps OverlayState lean
- [Phase 03-ocr-pipeline]: SHOP_SLOT_CENTERS re-declared as renderer constant in ShopHighlight to avoid importing main-process code into renderer bundle
- [Phase 03-ocr-pipeline]: BoardStatePoller uses optional setOCRPipeline() setter for backward-compatible OCR injection

### Pending Todos

- Clean up Phase 2 code: remove wrong BoardStateParser, fix types for actual API data
- Re-plan Phase 2 overlay UI for available data (gold, level, meta comps)

### Blockers/Concerns

- OCR accuracy for TFT champion recognition needs research (icon matching vs text OCR)
- TFT UI changes between patches may break coordinate-based OCR
- Performance: OCR scan cycle time vs overlay update frequency tradeoff

## Session Continuity

Last session: 2026-03-13T02:01:44.056Z
Stopped at: Completed 03-04-PLAN.md
Resume file: None

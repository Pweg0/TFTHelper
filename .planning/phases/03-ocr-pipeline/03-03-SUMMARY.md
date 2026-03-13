---
phase: 03-ocr-pipeline
plan: "03"
subsystem: ocr
tags: [ocr, board-ocr, item-detection, pixelmatch, tesseract, jimp, ocr-pipeline, integration, stale-data]
dependency_graph:
  requires:
    - phase: 03-01
      provides: OCRChampion/ShopSlot/OCRResult types, OCRCoordinates, ScreenCapturer, RegionCropper
    - phase: 03-02
      provides: ChampionMatcher, ShopOCR, ShopVisibilityDetector
  provides:
    - BoardOCR: text OCR on 9 bench + 28 board name labels with pixelmatch item detection
    - OCRPipeline: single-tick orchestrator (capture -> visibility -> shop OCR -> board OCR -> owned flag)
    - Updated BoardStateParser: parseOverlayState accepts optional OCRResult to merge
    - Updated BoardStatePoller: runs API fetch + OCR tick in parallel via setOCRPipeline()
    - Stale data policy: last valid OCR kept for 10s, then ocrStatus transitions to 'offline'
  affects:
    - Phase 4 (overlay UI): consumes OverlayState.board, bench, shop, shopVisible, ocrStatus
    - Phase 5: full pipeline now wired end-to-end
tech-stack:
  added: []
  patterns:
    - Shared Tesseract.js worker injection via constructor (ShopOCR, BoardOCR share one WASM instance)
    - Stale data TTL pattern: lastValidResult + lastValidAt epoch timestamps, 10s window
    - fs/promises mock via vi.mock('fs/promises') for testable file I/O in loadItemIconCache
    - BoardStateParser OCR merge: optional second parameter merges OCR fields with API defaults
    - setOCRPipeline() setter for optional dependency injection into BoardStatePoller

key-files:
  created:
    - src/main/ocr/BoardOCR.ts
    - src/main/ocr/BoardOCR.test.ts
    - src/main/ocr/OCRPipeline.ts
  modified:
    - src/main/ocr/ShopOCR.ts (optional constructor worker injection)
    - src/main/overlay/BoardStateParser.ts (optional OCRResult parameter)
    - src/main/overlay/BoardStatePoller.ts (OCRPipeline integration via setOCRPipeline)

key-decisions:
  - "Shared Tesseract.js worker: OCRPipeline creates one worker and injects it into both ShopOCR and BoardOCR via constructor — avoids multiple WASM instances in the main process"
  - "ShopOCR backward-compat: constructor accepts optional pre-initialized Worker; terminate() is a no-op for shared workers to prevent double-termination"
  - "BoardStatePoller uses optional setOCRPipeline() setter — existing tests pass without OCR, no breaking change to test API"
  - "fs/promises mocked in BoardOCR.test.ts to avoid disk reads during loadItemIconCache — the dynamic import pattern (readFileAsBuffer) makes this testable"
  - "parseOverlayState: optional OCRResult second parameter with ?? defaults ensures BoardStateParser tests remain green without any OCR-related changes"

patterns-established:
  - "Optional dependency injection via setter (setOCRPipeline) for post-construction wiring without breaking existing tests"
  - "Shared WASM worker injection via constructor parameter instead of factory/DI container"

requirements-completed: [DATA-04, OVER-03]

duration: 5min
completed: "2026-03-13"
---

# Phase 3 Plan 3: Board OCR, Item Detection, and Full Pipeline Integration Summary

**BoardOCR reads 9 bench + 28 board slots via Tesseract text OCR with pixelmatch item detection; OCRPipeline orchestrates the full capture-to-state cycle; BoardStatePoller merges OCR + Live Client API results into a unified OverlayState.**

## Performance

- **Duration:** 5 min (323 seconds)
- **Started:** 2026-03-13T01:42:18Z
- **Completed:** 2026-03-13T01:47:41Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- BoardOCR class: text OCR on name labels below each bench/board slot, fuzzy-matched via ChampionMatcher, with pixelmatch comparing 3 item slot regions per champion against a preloaded 24x24 RGBA icon cache
- OCRPipeline orchestrator: single-tick capture -> shop visibility gate -> ShopOCR -> BoardOCR.readBench + readBoard in parallel -> owned flag computation -> stale data policy (10s TTL)
- BoardStatePoller updated to run API fetch and OCR tick in parallel (Promise.all), merge results via parseOverlayState, with OCRPipeline injected via optional setter (backward-compatible)
- BoardStateParser updated: parseOverlayState accepts optional OCRResult; OCR fields default to empty/offline when not provided — all existing tests remain green

## Task Commits

1. **Task 1: BoardOCR for bench and board champion recognition with item detection** - `dde8e08` (feat, TDD)
2. **Task 2: OCRPipeline orchestrator and BoardStatePoller integration** - `55c388a` (feat)

## Files Created/Modified

- `src/main/ocr/BoardOCR.ts` — Text OCR on bench (9) and board (28) name label bands; pixelmatch item icon detection at 3 positions per champion slot; loadItemIconCache() resizes PNGs to 24x24 RGBA
- `src/main/ocr/BoardOCR.test.ts` — 12 tests: slot count verification, recognized champions, empty slot filtering, item detection, fs/promises and Jimp mocked
- `src/main/ocr/OCRPipeline.ts` — Owns ScreenCapturer/ShopOCR/BoardOCR/ChampionMatcher; single shared Tesseract worker; stale data TTL; owned flag computation via Set membership
- `src/main/ocr/ShopOCR.ts` — Added optional Worker constructor injection; terminate() is no-op for shared workers
- `src/main/overlay/BoardStateParser.ts` — parseOverlayState now accepts optional OCRResult; merges board/bench/shop/shopVisible/ocrStatus with ?? defaults
- `src/main/overlay/BoardStatePoller.ts` — setOCRPipeline() setter; tick() runs fetchGameData and ocrPipeline.tick() in parallel; merges via parseOverlayState

## Decisions Made

- Shared Tesseract.js worker via constructor injection avoids running multiple WASM instances in the Electron main process (each WASM instance uses significant memory)
- ShopOCR backward-compat: constructor accepts optional pre-initialized Worker, terminate() is a no-op when worker is shared — prevents double-termination while keeping existing standalone usage working
- BoardStatePoller uses an optional setter (setOCRPipeline) rather than constructor injection — existing tests don't need to supply an OCRPipeline, and no behavioral change when the setter is not called
- fs/promises is mocked in BoardOCR.test.ts via vi.mock('fs/promises') to enable testing loadItemIconCache without disk I/O (icon paths are fake in tests)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] vi.mock('fs/promises') needed for loadItemIconCache test isolation**
- **Found during:** Task 1 GREEN phase (test failures: ENOENT: no such file or directory)
- **Issue:** BoardOCR.loadItemIconCache uses a private readFileAsBuffer method that calls `readFile` from fs/promises. Tests used fake paths like '/path/to/bfsword.png' causing ENOENT errors. The Jimp.fromBuffer mock was in place but the file read happened before it.
- **Fix:** Added `vi.mock('fs/promises', () => ({ readFile: mockReadFile }))` to the test file and set `mockReadFile.mockResolvedValue(Buffer.alloc(100))` in beforeEach
- **Files modified:** `src/main/ocr/BoardOCR.test.ts`
- **Verification:** All 12 BoardOCR tests pass
- **Committed in:** dde8e08 (Task 1 commit)

**2. [Rule 1 - Bug] makeJimpImage mock missing resize() method**
- **Found during:** Task 1 GREEN phase (same run, same cause)
- **Issue:** The Jimp mock image object returned by mockJimpFromBuffer lacked a resize() method, but loadItemIconCache calls img.resize({ w, h }) after fromBuffer
- **Fix:** Added resize: vi.fn().mockReturnThis() to the makeJimpImage helper
- **Files modified:** `src/main/ocr/BoardOCR.test.ts`
- **Verification:** All 12 BoardOCR tests pass
- **Committed in:** dde8e08 (Task 1 commit, same fix batch)

---

**Total deviations:** 2 auto-fixed (both Rule 1 - bugs in test mock setup)
**Impact on plan:** Both fixes were in test infrastructure only. Implementation code was correct as written.

## Issues Encountered

None in the implementation code. Both deviations were test mock gaps discovered in the same GREEN phase run.

## Next Phase Readiness

- Full OCR pipeline is wired end-to-end: ScreenCapturer -> ShopVisibilityDetector -> ShopOCR -> BoardOCR -> OCRPipeline -> BoardStatePoller -> OverlayState IPC
- OCR data fields (board, bench, shop, shopVisible, ocrStatus) are now flowing into OverlayState
- Phase 4 overlay UI can consume board/bench/shop arrays and ocrStatus from the IPC messages
- Item icon cache loading requires calling `boardOCR.loadItemIconCache(paths)` at startup with Phase 1 cached PNG paths (OCRPipeline.initialize() handles this)

## Self-Check: PASSED

- FOUND: src/main/ocr/BoardOCR.ts
- FOUND: src/main/ocr/BoardOCR.test.ts
- FOUND: src/main/ocr/OCRPipeline.ts
- FOUND: dde8e08 (feat(03-03): BoardOCR)
- FOUND: 55c388a (feat(03-03): OCRPipeline)
- Tests: 152/152 passing
- TypeScript: 0 errors

---
*Phase: 03-ocr-pipeline*
*Completed: 2026-03-13*

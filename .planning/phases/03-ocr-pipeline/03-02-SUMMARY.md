---
phase: 03-ocr-pipeline
plan: "02"
subsystem: ocr
tags: [ocr, champion-matching, fuzzy-matching, tesseract, jimp, shop-reading, visibility-detection]
dependency_graph:
  requires:
    - src/main/ocr/types.ts (ShopSlot type)
    - src/main/ocr/OCRCoordinates.ts (SHOP_SLOT_CENTERS, SHOP_REGION, SHOP_NAME_BAND_*)
    - src/main/ocr/RegionCropper.ts (cropRegion preprocessing pipeline)
    - src/main/data/types.ts (Champion type)
  provides:
    - ChampionMatcher: fuzzy champion name matching with 0.7 similarity threshold
    - ShopOCR: persistent Tesseract worker reading 5 shop name bands via OCR
    - isShopVisible: pixel-color dark-background check to gate shop OCR
  affects:
    - All Phase 3 plans that consume shop data (board/bench reading, integration)
tech_stack:
  added: []
  patterns:
    - Character-frequency intersection similarity ratio for fuzzy string matching
    - vi.hoisted() for Vitest mock factories (pattern from Plan 01)
    - Jimp >>> 0 unsigned bitwise cast for RGBA color construction in tests
    - Dynamic import after vi.mock registration for mocked module under test
key_files:
  created:
    - src/main/ocr/ChampionMatcher.ts
    - src/main/ocr/ChampionMatcher.test.ts
    - src/main/ocr/ShopOCR.ts
    - src/main/ocr/ShopOCR.test.ts
    - src/main/ocr/ShopVisibilityDetector.ts
    - src/main/ocr/ShopVisibilityDetector.test.ts
  modified: []
decisions:
  - "Fuzzy matching strips ALL spaces before comparison — handles both space-insertion (W ukong) and space-removal (TwistedFate) OCR errors in one pass"
  - "Confidence gate at 60 (not 0.7 threshold) is a Tesseract metric separate from fuzzy ratio — both gates must pass to yield a non-null apiName"
  - "ShopOCR warmup recognize call passes Buffer.alloc(0) — sufficient to load WASM model without needing a real image"
  - "isShopVisible samples SHOP_REGION top-left corner pixel — dark background (all channels < 30) means shop panel is rendered"
metrics:
  duration_seconds: 257
  tasks_completed: 2
  files_created: 6
  files_modified: 0
  tests_added: 27
  completed_date: "2026-03-13"
---

# Phase 3 Plan 2: Champion Name Recognition and Shop Reading Pipeline Summary

**One-liner:** Fuzzy champion name matcher using character-frequency similarity ratio (>= 0.7), Tesseract.js shop OCR reading 5 name bands with confidence gating, and pixel-color shop visibility detection — all TDD-tested with 27 passing tests.

## What Was Built

### Task 1: ChampionMatcher (TDD)

**src/main/ocr/ChampionMatcher.ts** — Fuzzy name matcher for correcting OCR misreads:
- Constructor takes `Champion[]`, pre-computes lowercase display name entries for O(n) matching
- `match(ocrText: string): { apiName: string; cost: number } | null`
- `similarityRatio(a, b)`: 2 * intersection(charFreq(a), charFreq(b)) / (len(a) + len(b))
- Strips ALL whitespace before comparison — handles both space-insertion ("W ukong") and space-removal ("TwistedFate") OCR errors in a single normalization pass
- Returns null for empty input and matches below 0.7 threshold

**src/main/ocr/ChampionMatcher.test.ts** — 12 tests:
- Exact match, multi-word exact match
- Case insensitivity (AHRI, aHrI)
- Space-insertion OCR variants ("W ukong", "Cait lyn")
- Space-removal OCR variants ("TwistedFate")
- Garbage input below threshold ("xyzgarbage")
- Empty and whitespace-only string

### Task 2: ShopOCR and ShopVisibilityDetector (TDD)

**src/main/ocr/ShopVisibilityDetector.ts** — Pixel-color visibility gate:
- `async isShopVisible(pngBuffer, width, height): Promise<boolean>`
- Scales SHOP_REGION coordinates for DPI-aware capture dimensions
- Reads pixel at scaled coordinate with Jimp, returns true if R < 30 AND G < 30 AND B < 30

**src/main/ocr/ShopOCR.ts** — Tesseract.js shop reader:
- `initialize()`: creates persistent worker (eng, single-line PSM, alpha+space whitelist), runs warmup
- `readShop(pngBuffer, width, height, matcher)`: for each of 5 SHOP_SLOT_CENTERS, scales coordinates, crops name band via RegionCropper, OCRs with worker, fuzzy-matches via ChampionMatcher
- Dual gating: Tesseract confidence < 60 OR matcher returns null → apiName = null
- `terminate()`: cleans up WASM worker

**src/main/ocr/ShopOCR.test.ts** — 10 tests with mocked Tesseract.js worker:
- initialize() creates worker with 'eng', sets PSM + whitelist parameters, runs warmup
- readShop() returns exactly 5 slots, calls recognize 6 times (1 warmup + 5 slots)
- Champion name resolution via fuzzy matching
- Null when confidence < 60, null when text doesn't match any champion
- owned always set to false (integration step sets it later)

**src/main/ocr/ShopVisibilityDetector.test.ts** — 5 tests with synthetic Jimp images:
- All-black image returns true (shop visible)
- All-white image returns false (combat/carousel)
- Bright red returns false (R >= 30)
- Near-black (R=20, G=20, B=20) returns true
- Mixed channels (G=50) returns false (only ALL channels < 30 = dark)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] JavaScript signed 32-bit overflow in RGBA color packing**
- **Found during:** Task 2 GREEN phase (ShopVisibilityDetector.test.ts)
- **Issue:** Test helper used `(r << 24) | (g << 16) | (b << 8) | 0xff` to build Jimp color int. When R >= 128, bit 31 is set, JavaScript interprets this as a negative signed 32-bit integer (e.g., white 255 << 24 = -16777216). Jimp rejects negative color values with a RangeError.
- **Fix:** Applied `>>> 0` unsigned right-shift to coerce to unsigned 32-bit: `((...) >>> 0)`
- **Files modified:** `src/main/ocr/ShopVisibilityDetector.test.ts`
- **Commit:** 5aa31f1

**2. [Rule 1 - Bug] Test assertion used expect.anything() for undefined argument**
- **Found during:** Task 2 GREEN phase (ShopOCR.test.ts)
- **Issue:** Test asserted `toHaveBeenCalledWith('eng', expect.anything(), expect.anything())` but `createWorker` receives `('eng', undefined, { logger })` — `expect.anything()` does not match `undefined`
- **Fix:** Changed assertion to check `mockCreateWorker.mock.calls[0][0] === 'eng'` directly, independent of optional argument count
- **Files modified:** `src/main/ocr/ShopOCR.test.ts`
- **Commit:** 5aa31f1

## Verification Results

- `npx tsc --noEmit`: PASSED (0 errors)
- `npx vitest run src/main/ocr/ChampionMatcher.test.ts`: PASSED (12 tests)
- `npx vitest run src/main/ocr/ShopOCR.test.ts`: PASSED (10 tests)
- `npx vitest run src/main/ocr/ShopVisibilityDetector.test.ts`: PASSED (5 tests)
- Total: 27 tests across 3 files, all green

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | 4565423 | feat(03-02): ChampionMatcher with fuzzy name matching and tests |
| Task 2 | 5aa31f1 | feat(03-02): ShopOCR and ShopVisibilityDetector with tests |

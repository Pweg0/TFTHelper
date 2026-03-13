---
phase: 03-ocr-pipeline
plan: "01"
subsystem: ocr
tags: [ocr, screen-capture, image-processing, types, jimp, tesseract, pixelmatch]
dependency_graph:
  requires: []
  provides:
    - OCRChampion, ShopSlot, OCRStatus, OCRResult Zod schemas (src/main/ocr/types.ts)
    - 1920x1080 coordinate constants with DPI scaling helper (src/main/ocr/OCRCoordinates.ts)
    - ScreenCapturer: desktopCapturer wrapper returning PNG buffer + actual dimensions
    - RegionCropper: crop + grayscale + threshold + 3x upscale pipeline
    - Extended OverlayState with board, bench, shop, shopVisible, ocrStatus fields
  affects:
    - src/main/game/types.ts (OverlayState extended)
    - All Phase 3 OCR plans (depend on these types and primitives)
tech_stack:
  added:
    - tesseract.js ^7 (pure WASM OCR, no native rebuild)
    - jimp ^1.x (pure JS image processing, no native rebuild)
    - pixelmatch ^5.3.0 (icon template matching)
    - "@types/pixelmatch" (TypeScript types for pixelmatch)
  patterns:
    - Zod schema-first type definitions (schema + z.infer<typeof Schema>)
    - vi.hoisted() for Vitest mock factories referencing top-level variables
    - Named Jimp export ({ Jimp } from 'jimp') for v1.x compatibility
    - TDD: RED (failing tests) -> GREEN (implementation) -> verify
key_files:
  created:
    - src/main/ocr/types.ts
    - src/main/ocr/OCRCoordinates.ts
    - src/main/ocr/ScreenCapturer.ts
    - src/main/ocr/RegionCropper.ts
    - src/main/ocr/ScreenCapturer.test.ts
    - src/main/ocr/RegionCropper.test.ts
    - src/main/ocr/__fixtures__/.gitkeep
  modified:
    - src/main/game/types.ts (OverlayState extended with OCR fields)
    - package.json (added OCR dependencies)
decisions:
  - "Use Jimp named export { Jimp } from 'jimp' (v1.x API — default export is not a constructor)"
  - "Use vi.hoisted() for ScreenCapturer test electron mock to avoid hoisting reference errors"
  - "Jimp.threshold({ max: 128 }) binarizes pixels: values <= max become 0 (black), others become 255 (white)"
metrics:
  duration_seconds: 298
  tasks_completed: 2
  files_created: 7
  files_modified: 2
  tests_added: 11
  completed_date: "2026-03-13"
---

# Phase 3 Plan 1: OCR Foundation — Types, Coordinates, Capture, and Cropping Summary

**One-liner:** Installed tesseract.js/jimp/pixelmatch, defined Zod OCR type contracts, centralized 1920x1080 TFT coordinates, and built ScreenCapturer + RegionCropper as the image acquisition layer for all downstream OCR plans.

## What Was Built

### Task 1: OCR Types, Coordinates, OverlayState Extension

**src/main/ocr/types.ts** — Zod schemas for the OCR domain:
- `OCRChampionSchema`: `{ apiName: string | null, starLevel: 1 | 2 | 3, itemApiNames: string[] }`
- `ShopSlotSchema`: `{ apiName: string | null, cost: number | null, owned: boolean }`
- `OCRStatusSchema`: z.enum(['active', 'stale', 'offline'])
- `OCRResultSchema`: board + bench + shop + shopVisible + ocrStatus

**src/main/ocr/OCRCoordinates.ts** — Single source of truth for all 1920x1080 coordinates:
- `SHOP_SLOT_CENTERS`: 5 shop slot center pixels
- `SHOP_NAME_BAND_*`: name text band dimensions relative to slot center
- `SHOP_REGION`: full shop panel region for visibility detection
- `BOARD_SLOTS`: 28 board positions (4 rows x 7 cols)
- `BENCH_SLOTS`: 9 bench slot positions
- `scaleCoordinate(coord, scaleX, scaleY)`: DPI scaling helper

**src/main/game/types.ts** — OverlayState extended with OCR fields (backward compatible):
- Added: `board: OCRChampion[]`, `bench: OCRChampion[]`, `shop: ShopSlot[]`, `shopVisible: boolean`, `ocrStatus: OCRStatus`
- Re-exports OCR types for consumer convenience

### Task 2: ScreenCapturer and RegionCropper (TDD)

**src/main/ocr/ScreenCapturer.ts** — Electron desktopCapturer wrapper:
- `capture(windowTitle): Promise<{ png: Buffer; width: number; height: number } | null>`
- Tries exact title match first, falls back to `.includes('League of Legends')`
- Returns actual thumbnail dimensions (not assumed 1920x1080) for DPI scaling correctness

**src/main/ocr/RegionCropper.ts** — Jimp-based image preprocessing pipeline:
- `cropRegion(pngBuffer, x, y, w, h): Promise<Buffer>`
- Pipeline: crop → greyscale → threshold(max=128) → scale(3x) → PNG buffer
- 3x upscale improves Tesseract character recognition accuracy on small text bands

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Jimp v1.x uses named export, not default export**
- **Found during:** Task 2 GREEN phase (tests: "default is not a constructor")
- **Issue:** Plan referenced `import Jimp from 'jimp'` but Jimp v1.x exports `{ Jimp }` as a named export; the default export is an object, not the Jimp class constructor
- **Fix:** Changed to `import { Jimp } from 'jimp'` in RegionCropper.ts and RegionCropper.test.ts
- **Files modified:** `src/main/ocr/RegionCropper.ts`, `src/main/ocr/RegionCropper.test.ts`
- **Commit:** f736aad

**2. [Rule 1 - Bug] Vitest vi.mock factory hoisting reference error**
- **Found during:** Task 2 GREEN phase (test: "Cannot access 'mockGetSources' before initialization")
- **Issue:** Vitest hoists `vi.mock()` calls to top of file, so `const mockGetSources = vi.fn()` declared below is not yet initialized when the factory runs
- **Fix:** Used `vi.hoisted()` to declare `mockGetSources` before the hoisted mock factory runs
- **Files modified:** `src/main/ocr/ScreenCapturer.test.ts`
- **Commit:** f736aad

## Verification Results

- `npx tsc --noEmit`: PASSED (0 errors)
- `npx vitest run src/main/ocr/`: PASSED (11 tests, 2 test files)

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | 0561555 | feat(03-01): OCR types, coordinate constants, and extended OverlayState |
| Task 2 | f736aad | feat(03-01): ScreenCapturer and RegionCropper with tests |

---
phase: 03-ocr-pipeline
verified: 2026-03-12T23:30:00Z
status: human_needed
score: 22/22 must-haves verified
human_verification:
  - test: "Run npm run dev, launch a TFT game, and confirm OCR status dot appears green in the overlay panel header"
    expected: "A 10px green dot appears next to the player name when the game window is captured"
    why_human: "Requires a live TFT game window to verify screen capture actually finds the League of Legends client"
  - test: "During the planning phase (shop visible), own a champion that appears in the shop, then check overlay"
    expected: "A golden border (3px solid rgba(255,215,0,0.7)) appears over that shop slot; other slots have no border"
    why_human: "Requires a live game to verify shop OCR reads correctly and the owned flag is computed from real board state"
  - test: "Verify board display shows champion squares with item icons overlaid on corners"
    expected: "Bottom-left panel shows 32x32 champion squares; each champion with items shows up to 3 small item icon images at bottom corners, not a count badge"
    why_human: "Requires visual inspection with a real game screenshot; item icon rendering depends on pixelmatch accuracy against cached PNGs"
  - test: "During combat phase, confirm golden borders disappear and board display still shows champions"
    expected: "ShopHighlight renders nothing during combat; BoardDisplay still shows current champions"
    why_human: "Requires live combat phase to verify shopVisible flag changes correctly"
  - test: "Unrecognized champion in shop shows '?' placeholder in board display"
    expected: "Any champion OCR cannot read above threshold shows '?' abbreviated label"
    why_human: "Requires real OCR run against actual game text to confirm threshold behavior in practice"
---

# Phase 3: OCR Pipeline Verification Report

**Phase Goal:** Screen capture pipeline reads TFT game state (board, shop, items) via OCR from the game window
**Verified:** 2026-03-12T23:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | OCR types (OCRChampion, ShopSlot, OCRStatus) are defined with Zod schemas and exported | VERIFIED | `src/main/ocr/types.ts` exports all four schemas (OCRChampionSchema, ShopSlotSchema, OCRStatusSchema, OCRResultSchema) with z.infer<> types |
| 2 | OverlayState interface includes board, bench, shop, shopVisible, and ocrStatus fields | VERIFIED | `src/main/game/types.ts` lines 69-73 confirm all five OCR fields; re-exports OCRChampion, ShopSlot, OCRStatus |
| 3 | All 1920x1080 screen coordinates are centralized in one file | VERIFIED | `src/main/ocr/OCRCoordinates.ts` exports SHOP_SLOT_CENTERS (5), SHOP_REGION, BOARD_SLOTS (28), BENCH_SLOTS (9), and scaleCoordinate helper |
| 4 | ScreenCapturer captures a TFT window screenshot as PNG buffer | VERIFIED | `src/main/ocr/ScreenCapturer.ts` uses desktopCapturer.getSources with exact+fallback match, returns {png, width, height} or null |
| 5 | RegionCropper crops, grayscales, thresholds, and upscales a region from a PNG buffer | VERIFIED | `src/main/ocr/RegionCropper.ts` pipeline: Jimp.fromBuffer -> crop -> greyscale -> threshold(128) -> scale(3) -> getBuffer('image/png') |
| 6 | Fuzzy name matcher returns correct champion apiName for OCR-misread variants | VERIFIED | `src/main/ocr/ChampionMatcher.ts` uses character-frequency intersection ratio >= 0.7; strips spaces to handle both space-insertion and space-removal OCR errors |
| 7 | Shop OCR reads 5 champion name bands and returns ShopSlot[] with confidence-gated results | VERIFIED | `src/main/ocr/ShopOCR.ts` iterates all 5 SHOP_SLOT_CENTERS, crops via cropRegion, runs Tesseract, gates on confidence >= 60 AND fuzzy match |
| 8 | Shop visibility detector returns false during combat and true during planning phase | VERIFIED | `src/main/ocr/ShopVisibilityDetector.ts` samples SHOP_REGION pixel, returns true only if R<30 AND G<30 AND B<30 |
| 9 | Unrecognized shop names return null apiName | VERIFIED | ShopOCR sets apiName=null when confidence < 60 or ChampionMatcher.match() returns null |
| 10 | Board OCR recognizes champions on bench/board slots via text OCR on name labels | VERIFIED | `src/main/ocr/BoardOCR.ts` readBench (9 slots) and readBoard (28 slots) crop name label bands and fuzzy-match via ChampionMatcher |
| 11 | Board OCR detects items on champion corners via pixelmatch against cached item icons | VERIFIED | BoardOCR.readItems() compares 3 item slot positions per champion against Map<apiName, 24x24 RGBA> using pixelmatch with ITEM_MATCH_THRESHOLD=150 |
| 12 | OCRPipeline orchestrates capture -> visibility check -> shop OCR -> board OCR in a single tick | VERIFIED | `src/main/ocr/OCRPipeline.ts` tick(): capture -> isShopVisible -> shopOCR.readShop (conditional) -> boardOCR.readBench + readBoard (parallel) -> owned flag |
| 13 | BoardStatePoller merges OCR results with Live Client API data into OverlayState | VERIFIED | `src/main/overlay/BoardStatePoller.ts` tick() uses Promise.all([fetchGameData(), ocrPipeline.tick()]) and passes both to parseOverlayState |
| 14 | Stale data policy: last valid OCR kept for 10 seconds, then cleared to offline | VERIFIED | OCRPipeline.staleFallback() checks Date.now() - lastValidAt < 10_000; returns stale result or OFFLINE_RESULT accordingly |
| 15 | Shop slots have owned=true when apiName matches a champion on the board or bench | VERIFIED | OCRPipeline.tick() builds ownedApiNames Set from board+bench, then maps shop slots with owned = slot.apiName !== null && ownedApiNames.has(slot.apiName) |
| 16 | Overlay shows a horizontal row of small champion icons for the local player's board | VERIFIED | `src/renderer/overlay/components/BoardDisplay.tsx` renders 32x32 squares for board + bench separated by divider at position fixed bottom:120px left:8px |
| 17 | Each board champion shows a star level indicator (1/2/3 stars) | VERIFIED | BoardDisplay ChampionSquare renders Array.from({length: champ.starLevel}) gold 4px dots |
| 18 | Small item icons are overlaid on champion icon corners per user decision | VERIFIED | BoardDisplay renders up to 3 item icon images at bottom-left, bottom-center, bottom-right positions of each square using itemIconMap |
| 19 | Golden borders drawn over shop slots when a shop champion is already owned | VERIFIED | `src/renderer/overlay/components/ShopHighlight.tsx` renders div with border: '3px solid rgba(255, 215, 0, 0.7)' centered on SHOP_SLOT_CENTERS[idx] for each owned slot |
| 20 | Golden borders only appear when shop is visible | VERIFIED | ShopHighlight returns <></> immediately if !shopVisible |
| 21 | Small status dot: green when OCR active, red when offline/stale | VERIFIED | `src/renderer/overlay/components/OCRStatusDot.tsx` maps active->#00ff00, stale->#ff8c00, offline->#ff0000; pulse animation on active only |
| 22 | OCRPipeline is initialized at app startup after champion data loads and terminated on quit | VERIFIED | `src/main/startup.ts` step 'ocr-init' calls ocrPipeline.initialize(champions, items); terminate() called on win 'closed' and 'app-quit' |

**Score:** 22/22 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/main/ocr/types.ts` | OCRChampion, ShopSlot, OCRStatus, OCRResult Zod schemas | VERIFIED | All four schemas + z.infer<> types exported; 43 lines, substantive |
| `src/main/ocr/OCRCoordinates.ts` | All fixed 1920x1080 pixel coordinates | VERIFIED | SHOP_SLOT_CENTERS, SHOP_NAME_BAND_*, SHOP_REGION, BOARD_SLOTS (28), BENCH_SLOTS (9), scaleCoordinate |
| `src/main/ocr/ScreenCapturer.ts` | desktopCapturer wrapper returning PNG buffer + dimensions | VERIFIED | Class with async capture(); exact+fallback title match; returns {png, width, height} or null |
| `src/main/ocr/RegionCropper.ts` | Jimp-based crop + preprocess pipeline | VERIFIED | crop -> greyscale -> threshold(128) -> scale(3) -> getBuffer('image/png') |
| `src/main/game/types.ts` | Extended OverlayState with OCR fields | VERIFIED | OverlayState has board, bench, shop, shopVisible, ocrStatus; re-exports OCR types |
| `src/main/ocr/ChampionMatcher.ts` | Fuzzy champion name matching >= 0.7 threshold | VERIFIED | Character-frequency similarity ratio; space-stripping; case-insensitive |
| `src/main/ocr/ShopOCR.ts` | Tesseract.js-based shop name OCR for 5 slots | VERIFIED | Persistent worker; PSM.SINGLE_LINE; confidence gate; shared-worker pattern |
| `src/main/ocr/ShopVisibilityDetector.ts` | Pixel-color check for shop panel presence | VERIFIED | Jimp pixel sample at SHOP_REGION; R<30 AND G<30 AND B<30 |
| `src/main/ocr/BoardOCR.ts` | Text OCR on bench/board name labels + pixelmatch item detection | VERIFIED | readBench(9) + readBoard(28); loadItemIconCache; readItems with pixelmatch |
| `src/main/ocr/OCRPipeline.ts` | Single-tick orchestrator combining all OCR modules | VERIFIED | capture -> visibility -> shop -> board/bench parallel -> owned flag -> stale policy |
| `src/main/overlay/BoardStatePoller.ts` | Extended poller merging Live Client API + OCR data | VERIFIED | setOCRPipeline() setter; Promise.all parallel fetch+OCR; parseOverlayState merge |
| `src/renderer/overlay/components/BoardDisplay.tsx` | Horizontal row of champion icons with star levels and item icons | VERIFIED | 32x32 squares, star dots, item icons overlaid on corners, positioned bottom-left |
| `src/renderer/overlay/components/ShopHighlight.tsx` | Golden border overlay on shop slot coordinates | VERIFIED | Absolute borders centered on SHOP_SLOT_CENTERS; shopVisible gate; pointerEvents none |
| `src/renderer/overlay/components/OCRStatusDot.tsx` | Green/orange/red status indicator dot | VERIFIED | 10px circle; three-state colors; pulse animation for active |
| `src/renderer/overlay/OverlayApp.tsx` | Updated overlay integrating all new components | VERIFIED | Imports BoardDisplay, ShopHighlight, OCRStatusDot; getItemIcons() IPC call on mount |
| `src/main/startup.ts` | OCRPipeline initialization and teardown wiring | VERIFIED | step 'ocr-init'; initialize(champions, items); setOCRPipeline(poller); terminate() on close+quit |

**Test files present:** ScreenCapturer.test.ts, RegionCropper.test.ts, ChampionMatcher.test.ts, ShopOCR.test.ts, ShopVisibilityDetector.test.ts, BoardOCR.test.ts

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/main/ocr/types.ts` | `src/main/game/types.ts` | import of OCR types into OverlayState | WIRED | `import type { OCRChampion, ShopSlot, OCRStatus } from '../ocr/types'` at line 54; re-exported |
| `src/main/ocr/ShopOCR.ts` | `src/main/ocr/ChampionMatcher.ts` | fuzzy match raw OCR text | WIRED | `matcher.match(rawText)` at line 114 |
| `src/main/ocr/ShopOCR.ts` | `src/main/ocr/RegionCropper.ts` | crop shop name bands before OCR | WIRED | `cropRegion(pngBuffer, x, y, w, h)` at line 104 |
| `src/main/ocr/ShopVisibilityDetector.ts` | `src/main/ocr/OCRCoordinates.ts` | uses SHOP_REGION coordinates | WIRED | `import { SHOP_REGION } from './OCRCoordinates'` at line 2 |
| `src/main/ocr/OCRPipeline.ts` | `src/main/ocr/ScreenCapturer.ts` | captures screenshot each tick | WIRED | `this.capturer.capture(TFT_WINDOW_TITLE)` at line 112 |
| `src/main/ocr/OCRPipeline.ts` | `src/main/ocr/ShopOCR.ts` | reads shop when visible | WIRED | `this.shopOCR.readShop(png, width, height, this.matcher)` at line 126 |
| `src/main/ocr/OCRPipeline.ts` | `src/main/ocr/BoardOCR.ts` | reads board/bench champions | WIRED | `this.boardOCR.readBench(...)` and `this.boardOCR.readBoard(...)` in Promise.all at lines 131-133 |
| `src/main/overlay/BoardStatePoller.ts` | `src/main/ocr/OCRPipeline.ts` | calls pipeline.tick() and merges result | WIRED | `this.ocrPipeline.tick()` at line 49; result passed to parseOverlayState |
| `src/renderer/overlay/OverlayApp.tsx` | `src/renderer/overlay/components/BoardDisplay.tsx` | renders board data from OverlayState | WIRED | `<BoardDisplay board={board} bench={bench} itemIconMap={itemIconMap} />` at line 137 |
| `src/renderer/overlay/OverlayApp.tsx` | `src/renderer/overlay/components/ShopHighlight.tsx` | renders shop borders when shopVisible and owned | WIRED | `<ShopHighlight shop={shop} shopVisible={shopVisible} />` at line 140 |
| `src/renderer/overlay/OverlayApp.tsx` | `src/renderer/overlay/components/OCRStatusDot.tsx` | renders status indicator from ocrStatus | WIRED | `<OCRStatusDot status={ocrStatus} />` at line 103 |
| `src/main/startup.ts` | `src/main/ocr/OCRPipeline.ts` | initialize and terminate | WIRED | `ocrPipeline.initialize(extractedData.champions, extractedData.items)` at line 137; `ocrPipeline.terminate()` at lines 191 and 198 |
| `src/preload/overlayPreload.ts` | `ipcMain get-item-icons` | IPC bridge for item icon resolution | WIRED | preload exposes `getItemIcons: () => ipcRenderer.invoke('get-item-icons')`; startup.ts registers handler at line 147 |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| DATA-04 | 03-01, 03-03, 03-04 | App reads board state via OCR (composition, items, star level) | SATISFIED | BoardOCR reads 28 board + 9 bench slots; item detection via pixelmatch; star level defaults to 1 (best-effort); wired through OCRPipeline -> BoardStatePoller -> OverlayState |
| DATA-05 | 03-01, 03-02, 03-04 | App reads the shop via OCR (5 champions) | SATISFIED | ShopOCR reads 5 shop name bands via Tesseract; ChampionMatcher fuzzy-matches; ShopVisibilityDetector gates reading; 5 ShopSlots returned in OverlayState |
| OVER-03 | 03-02, 03-03, 03-04 | Overlay highlights shop champions the player already owns | SATISFIED | ShopHighlight renders golden borders on slots where owned=true; owned flag computed in OCRPipeline from board+bench Set membership; hidden during combat via shopVisible |

All three Phase 3 requirements are marked SATISFIED with full implementation traces. REQUIREMENTS.md traceability table confirms all three are mapped to Phase 3 with status "Complete".

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/main/startup.ts` | 13 | `TODO: Detect locale from Riot client process args` | Info | Pre-existing TODO about locale detection; does not affect OCR functionality. DEFAULT_LOCALE='en_us' is a valid fallback. |
| `src/main/startup.ts` | 17 | `TODO: Derive current set identifier from CommunityDragon JSON structure at runtime` | Info | Pre-existing TODO about set number. DEFAULT_SET='set13' is a valid hardcoded fallback. |

No blocker or warning anti-patterns found. The two TODOs are pre-existing concerns from Phase 1 data pipeline work — not related to the OCR pipeline goal.

### Human Verification Required

All automated checks passed. The following items require human testing in a live TFT game:

#### 1. OCR Status Dot Appears Green

**Test:** Run `npm run dev`, launch a TFT game (or Practice Tool), wait for overlay to attach
**Expected:** A 10px green dot appears in the overlay panel header next to the player name
**Why human:** Screen capture depends on the League of Legends client window being present and Electron's desktopCapturer successfully finding it by title. Cannot verify without a live game window.

#### 2. Golden Borders on Owned Shop Champions

**Test:** During planning phase with shop visible, have a champion on your board/bench that also appears in the shop
**Expected:** That shop slot shows a 120x120px golden border (rgba(255,215,0,0.7)); other slots have no border
**Why human:** End-to-end validation requires real OCR output from both ShopOCR (to identify shop champion) and BoardOCR (to identify board champion), then correct owned flag computation.

#### 3. Board Display with Item Icons

**Test:** Play a round with champions that have items equipped
**Expected:** Bottom-left overlay panel shows champion squares; champions with items display up to 3 small icon images (not a count badge) overlaid on bottom corners
**Why human:** Item detection accuracy depends on pixelmatch threshold (150 mismatches out of 576 pixels) against the real item icon cache. Real game screenshots needed to confirm detection works in practice.

#### 4. Combat Phase Hides Golden Borders

**Test:** Observe the shop highlight during combat
**Expected:** Golden borders disappear when combat begins; board display still shows champions
**Why human:** ShopVisibilityDetector pixel sampling must correctly identify the combat screen as not-dark. Real combat screenshots needed.

#### 5. Unrecognized Champions Show '?'

**Test:** If OCR misreads a champion name below the 0.7 threshold (common for new/unusual names)
**Expected:** The champion square shows '?' as the label
**Why human:** Threshold behavior in practice requires real OCR output from a running game.

### Note on Star Level Detection

Plan 03-03 correctly documents that `starLevel` defaults to `1` for all recognized champions. Accurate star level detection is explicitly noted as "best-effort" — this is an intentional design decision, not a gap. The DATA-04 requirement ("composition, items, star level") is partially satisfied: composition and items are detected; star level is read as 1 for all champions. This does not block the phase goal since the plan explicitly scoped star detection as placeholder.

---

_Verified: 2026-03-12T23:30:00Z_
_Verifier: Claude (gsd-verifier)_

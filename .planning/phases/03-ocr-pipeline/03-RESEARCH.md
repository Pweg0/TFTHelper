# Phase 3: OCR Pipeline - Research

**Researched:** 2026-03-12
**Domain:** Screen capture + OCR in Electron + Node.js, TFT game state reading
**Confidence:** HIGH (core stack verified), MEDIUM (coordinate values from reference implementation)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Shop highlighting: golden border drawn directly over the game screen on the 5 shop slots (not a separate panel)
- Highlighting is simple yes/no — border present = "you own this champion", no copy count
- Borders only visible when shop is on screen — detect shop visibility, hide during combat/carousel
- Requires precise coordinate mapping of the 5 shop slots at 1920x1080 resolution
- Show "?" placeholder when OCR confidence is below threshold (not best guess)
- When OCR fails completely (loading screen, transition): keep last valid data for 10 seconds, then clear
- Small status indicator dot on overlay: green = OCR active and reading, red = no data / OCR failing
- Board display: row of small champion icons horizontally (local player)
- Each icon shows star level indicator (1/2/3 stars)
- Small item icons overlaid on champion icon corners

### Claude's Discretion
- Screen capture method (Electron desktopCapturer vs native)
- OCR engine choice (Tesseract.js, sharp+template matching, or hybrid)
- Confidence threshold values
- Exact icon sizes, spacing, and overlay positioning
- Champion recognition approach (icon template matching vs text OCR vs hybrid)
- Scan frequency and performance optimization
- How to detect shop visibility vs combat phase

### Deferred Ideas (OUT OF SCOPE)
- Opponent board reading via scouting screen (Tab) — Phase 4
- Comp recommendations based on board state — Phase 5
- Item recommendations — Phase 5
- HP/damage tracking — Phase 4
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DATA-04 | App reads local player board state via OCR (composition, items, star level) | Template matching on board region coordinates; champion icon cache available from Phase 1; text OCR for name fallback |
| DATA-05 | App reads the shop via OCR (5 available champions) | Text OCR on shop name regions at fixed 1920x1080 coordinates; fuzzy name matching against champion list |
| OVER-03 | Overlay highlights champions in the shop that the player already owns (golden transparent layer) | desktopCapturer provides overlay canvas; golden border drawn at shop slot coordinates via React overlay |
</phase_requirements>

---

## Summary

This phase builds a screen-capture-to-game-state pipeline for TFT running in a Node.js/Electron main process. The core loop is: capture a full 1920x1080 screenshot of the TFT window every ~1 second via `desktopCapturer.getSources()`, crop out fixed screen regions (shop name bands, board/bench slots), run OCR (Tesseract.js) on text regions and template matching on icon regions, and merge results into the existing `OverlayState` pushed via IPC to the overlay renderer.

The reference implementation (TFT-OCR-BOT, Python) confirms the coordinate-based approach works reliably. Shop champion names are read via text OCR with alphabet character whitelists and fuzzy matching against the known champion list. Board champion recognition is best done via icon template matching against the Phase 1 cached PNG icons, supplemented by text OCR where labels are visible. Shop visibility is detected by pixel-color checking a known UI landmark in the shop region.

**Primary recommendation:** Use `desktopCapturer` (main process, `thumbnailSize: {width: 1920, height: 1080}`) for capture; Jimp (zero native deps) for image cropping and preprocessing; Tesseract.js v7 for text OCR on shop name bands; pixelmatch for icon template matching on board slots. This avoids the sharp/native-addon rebuild headache while staying within the existing Electron build pipeline.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| electron (desktopCapturer) | 34 (already installed) | Capture TFT window as PNG/NativeImage | Built-in, no rebuild needed, main-process API |
| tesseract.js | ^7.0.0 | Text OCR for shop champion name bands | Pure WASM, no native rebuild, works in Node.js/Electron main |
| jimp | ^1.x (latest) | Crop regions, grayscale, threshold, upscale before OCR | Zero native deps, no rebuild, PNG/buffer in/out |
| pixelmatch | ^5.3.0 | Icon template matching: compare cropped slot vs cached icon | Zero deps, pure JS, works on raw RGBA buffers |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | ^3.24.2 (already installed) | Schema for OCRResult, OverlayState extensions | All data crossing IPC |
| node:fs/promises | built-in | Load cached champion PNG icons for template matching | At startup, cache in memory |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| jimp | sharp | sharp is faster but requires asarUnpack + native rebuild for electron-builder; jimp is pure JS with zero rebuild friction. Viable if performance is insufficient. |
| tesseract.js | node-tesseract-ocr (binary wrapper) | Binary wrapper requires Tesseract binary installed on user machine — unacceptable for distributed .exe. tesseract.js is self-contained. |
| pixelmatch | custom hash comparison | pixelmatch handles anti-aliasing and color thresholding correctly; custom hash would miss partial matches on scaled icons. |
| desktopCapturer | screenshot-desktop / native addon | desktopCapturer is built into Electron with no extra deps. Native addons require rebuild. |

**Installation:**
```bash
npm install tesseract.js jimp pixelmatch
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/main/
├── ocr/
│   ├── ScreenCapturer.ts       # desktopCapturer wrapper — returns NativeImage PNG buffer
│   ├── RegionCropper.ts        # Crops fixed screen regions using jimp
│   ├── ShopOCR.ts              # Text OCR for the 5 shop name bands → string[]
│   ├── BoardOCR.ts             # Template matching for board/bench slots → BoardChampion[]
│   ├── ShopVisibilityDetector.ts # Pixel-color check: is the shop panel visible?
│   ├── OCRCoordinates.ts       # All fixed 1920x1080 pixel coordinates (single source of truth)
│   ├── ChampionMatcher.ts      # Fuzzy name → Champion lookup + icon template cache
│   └── types.ts                # OCRResult, BoardChampion, ShopSlot interfaces (Zod schemas)
├── overlay/
│   ├── BoardStatePoller.ts     # EXISTING — extend tick() to merge OCR data
│   ├── BoardStateParser.ts     # EXISTING — extend schema for board/shop OCR fields
│   └── ...
└── game/
    └── types.ts                # EXISTING — extend OverlayState with board/shop/ocrStatus fields
```

### Pattern 1: Screen Capture in Main Process

**What:** `desktopCapturer.getSources()` with `thumbnailSize: {width: 1920, height: 1080}` returns a `NativeImage`. Call `.toPNG()` to get a Buffer. This runs in the Electron main process only.

**When to use:** Every tick (1s interval) when game is active.

```typescript
// Source: https://www.electronjs.org/docs/latest/api/desktop-capturer
import { desktopCapturer } from 'electron';

export async function captureGameWindow(windowTitle: string): Promise<Buffer | null> {
  const sources = await desktopCapturer.getSources({
    types: ['window'],
    thumbnailSize: { width: 1920, height: 1080 },
  });
  const source = sources.find((s) => s.name === windowTitle);
  if (!source) return null;
  return source.thumbnail.toPNG(); // NativeImage → Buffer
}
```

**Caveat:** The returned thumbnail may not be exactly 1920x1080 if the window is smaller or DPI-scaled. Always check `source.thumbnail.getSize()` and apply a scale factor to coordinates.

### Pattern 2: Region Cropping with Jimp

**What:** Load a PNG Buffer into Jimp, crop to a coordinate rectangle, apply grayscale + threshold + scale-up before feeding to Tesseract.

**When to use:** Before every OCR call on a region.

```typescript
// Source: jimp documentation (jimp-dev/jimp on GitHub)
import Jimp from 'jimp';

export async function cropRegion(
  pngBuffer: Buffer,
  x: number, y: number, w: number, h: number
): Promise<Buffer> {
  const img = await Jimp.fromBuffer(pngBuffer);
  const cropped = img
    .crop({ x, y, w, h })
    .greyscale()
    .threshold({ max: 128 }) // binarize for OCR
    .scale(3);               // upscale improves Tesseract accuracy
  return cropped.getBuffer('image/png');
}
```

### Pattern 3: Text OCR for Shop Names

**What:** One persistent Tesseract.js worker (created once, reused every tick). Recognize text on cropped shop name bands with an alphabet whitelist and PSM_SINGLE_WORD or PSM_SINGLE_LINE.

**When to use:** When shop is visible, for each of 5 shop slots.

```typescript
// Source: https://github.com/naptha/tesseract.js/blob/master/docs/api.md
import { createWorker, PSM } from 'tesseract.js';

const worker = await createWorker('eng');
await worker.setParameters({
  tessedit_pageseg_mode: PSM.SINGLE_LINE,
  tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ',
});

async function recognizeShopSlot(pngBuffer: Buffer): Promise<{ text: string; confidence: number }> {
  const result = await worker.recognize(pngBuffer);
  const word = result.data.words[0];
  return {
    text: result.data.text.trim(),
    confidence: word?.confidence ?? 0,
  };
}
```

**Confidence threshold:** 60 is a reasonable starting value (range 0–100). Below threshold → return `null` (display "?" in overlay).

### Pattern 4: Icon Template Matching with pixelmatch

**What:** For board/bench champion identification, load the cached champion icon PNG (from Phase 1 cache) and compare it to the cropped slot region. The champion with the lowest mismatch count is the match.

**When to use:** Board slot recognition (icon-first approach is more reliable than text OCR for small icons).

```typescript
// Source: https://github.com/mapbox/pixelmatch
import pixelmatch from 'pixelmatch';
import Jimp from 'jimp';

interface MatchResult { apiName: string; mismatches: number }

export async function matchBoardSlot(
  slotBuffer: Buffer,
  iconCache: Map<string, Buffer> // champion apiName → 48x48 RGBA buffer
): Promise<MatchResult> {
  const slot = await Jimp.fromBuffer(slotBuffer);
  const slotResized = slot.resize({ w: 48, h: 48 });
  const slotRaw = slotResized.bitmap.data; // Uint8Array RGBA

  let best: MatchResult = { apiName: '', mismatches: Infinity };
  for (const [apiName, iconRaw] of iconCache) {
    const count = pixelmatch(slotRaw, iconRaw, null, 48, 48, { threshold: 0.15 });
    if (count < best.mismatches) best = { apiName, mismatches: count };
  }
  return best;
}
```

### Pattern 5: Shop Visibility Detection

**What:** Read a specific pixel at the shop panel region. The TFT shop bar background has a consistent dark color. A simple pixel-color check (R < 30, G < 30, B < 30, i.e., very dark) at a known shop landmark coordinate indicates the shop is visible. Absence of the shop background means combat/carousel.

**When to use:** Before every OCR scan cycle; skip shop OCR if shop is not visible.

**Approach:** Sample the pixel at approximately (480, 1045) — the left edge of the shop bar. If it is present and dark (shop background), shop is visible. If the color is bright/noisy, shop is hidden.

**Alternative approach (more robust):** Use text OCR on the "Buy XP" button region (bottom of screen); its presence confirms planning phase.

### Anti-Patterns to Avoid

- **Creating a new Tesseract worker per tick:** Each worker creation involves loading the WASM binary (~8MB). Create once at startup, reuse across ticks.
- **Capturing full-screen thumbnails every frame for video:** `desktopCapturer` is a screenshot API, not a video stream. For OCR use, one screenshot per second is correct.
- **Passing uncropped 1920x1080 images to Tesseract:** Feed only the small region of interest (shop name band is ~120x19px). Crop first, then OCR.
- **Blocking the main process thread with synchronous image ops:** All jimp, tesseract.js, and pixelmatch calls are async or can be wrapped async. Keep them awaited in the polling tick.
- **Assuming thumbnail is exactly 1920x1080:** DPI scaling (e.g. 125% display scale on Windows) will give a thumbnail larger than requested. Read `thumbnail.getSize()` and compute a scale factor.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Text recognition from images | Custom pixel-font decoder | Tesseract.js | Character shape recognition is an NLP/vision problem with massive edge cases |
| Image cropping + grayscale | Manual Buffer slicing | Jimp | PNG decoding, stride calculation, color space conversion are error-prone |
| Icon pixel comparison | Perceptual hashing (custom) | pixelmatch | Anti-aliasing, scaling artifacts, threshold tuning already solved |
| Fuzzy champion name matching | Levenshtein from scratch | Native `String.prototype` + simple ratio | For ≤60 champion names, a simple ratio loop is sufficient; no library needed |
| WASM Tesseract binary | Shipping Tesseract native binary | tesseract.js | Bundles WASM, no system install required |

**Key insight:** The image processing pipeline (crop → preprocess → recognize → validate) has multiple compounding failure modes. Using well-tested libraries at each step isolates failures to integration points rather than core algorithms.

---

## Common Pitfalls

### Pitfall 1: DPI Scaling Makes Coordinates Wrong

**What goes wrong:** On a 1920x1080 display set to 125% Windows scale, `desktopCapturer` returns a thumbnail at 2400x1350. All hardcoded coordinates are off by 1.25x.

**Why it happens:** Windows DPI scaling is applied to window capture in desktopCapturer.

**How to avoid:** Read `thumbnail.getSize()` after capture. Compute `scaleX = size.width / 1920` and `scaleY = size.height / 1080`. Multiply all coordinates by the scale factor before cropping.

**Warning signs:** OCR returns garbage even though the window is visible; shop regions appear to capture non-text areas.

### Pitfall 2: Tesseract Worker Not Warmed Up on First Tick

**What goes wrong:** First OCR call takes 2-4 seconds (WASM load + model load). This delays the first overlay update noticeably.

**Why it happens:** Tesseract.js loads the language model lazily on first `recognize()` call.

**How to avoid:** Call `createWorker('eng')` at app startup (not on first tick). Run a dummy `recognize()` on a blank buffer during startup to warm the WASM runtime.

### Pitfall 3: Shop OCR Runs During Combat (No Shop Visible)

**What goes wrong:** OCR on the shop region during combat reads arbitrary game pixels and produces garbage champion names.

**Why it happens:** The polling tick runs every second regardless of game phase.

**How to avoid:** Implement `ShopVisibilityDetector` — check pixel color at the shop region before running shop OCR. Only run shop OCR when shop is confirmed visible.

### Pitfall 4: OCR Misreads Champion Names With Special Characters

**What goes wrong:** Champions like "Wukong" or "Twisted Fate" may be misread as "W ukong" or "TwistedFate".

**Why it happens:** Tesseract splits on spaces inconsistently at small scales; preprocessing quality matters.

**How to avoid:** (1) Upscale the name region 3x before OCR. (2) Apply strict `tessedit_char_whitelist` (letters + space only). (3) After recognition, fuzzy-match the raw text against all known champion display names using a simple character ratio. Threshold at 0.7 (reference: TFT-OCR-BOT uses `SequenceMatcher` ratio ≥ 0.7).

### Pitfall 5: pixelmatch Fails on Scaled/Rotated Icons

**What goes wrong:** Board champion icons in TFT include a 3D perspective rendering and may be partially occluded by items or star indicators. Direct pixel comparison to the flat CommunityDragon icon fails.

**Why it happens:** CommunityDragon icons are clean art assets; in-game board renders them with 3D transform and overlays.

**How to avoid:** Do not template-match the full board cell. Instead, read champion names via text OCR on the name label below each board unit (if visible), or use the bench slots (which render cleaner icons) as the primary source and cross-reference with board positions. The TFT-OCR-BOT uses text OCR exclusively for champion names — this is the safer approach.

### Pitfall 6: Stale State After Loading Screens

**What goes wrong:** OCR returns `null` during loading screen; overlay clears prematurely.

**Why it happens:** Screen capture during transitions shows loading art, not the game UI.

**How to avoid:** Implement the user-decided policy exactly: keep last valid OCRResult for 10 seconds after first `null` result. Only clear after 10 consecutive seconds of no valid data. Track `lastValidAt: number` in the poller.

---

## Code Examples

### Screen Capture (Main Process)

```typescript
// Source: https://www.electronjs.org/docs/latest/api/desktop-capturer
import { desktopCapturer } from 'electron';

export class ScreenCapturer {
  async capture(windowTitle: string): Promise<{ png: Buffer; width: number; height: number } | null> {
    const sources = await desktopCapturer.getSources({
      types: ['window'],
      thumbnailSize: { width: 1920, height: 1080 },
    });
    const source = sources.find((s) => s.name === windowTitle);
    if (!source) return null;
    const size = source.thumbnail.getSize();
    return {
      png: source.thumbnail.toPNG(),
      width: size.width,
      height: size.height,
    };
  }
}
```

### Tesseract.js Worker Lifecycle

```typescript
// Source: https://github.com/naptha/tesseract.js (v7 API)
import { createWorker, PSM } from 'tesseract.js';

let _worker: Awaited<ReturnType<typeof createWorker>> | null = null;

export async function getOCRWorker() {
  if (_worker) return _worker;
  _worker = await createWorker('eng');
  await _worker.setParameters({
    tessedit_pageseg_mode: PSM.SINGLE_LINE,
    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ',
  });
  // Warm up — avoids first-tick delay
  await _worker.recognize(Buffer.alloc(10));
  return _worker;
}
```

### Fuzzy Champion Name Matching (No Library)

```typescript
// Adapted from TFT-OCR-BOT reference (github.com/jfd02/TFT-OCR-BOT)
function similarityRatio(a: string, b: string): number {
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (longer.length === 0) return 1.0;
  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) matches++;
  }
  return matches / longer.length;
}

export function matchChampionName(ocrText: string, championNames: string[]): string | null {
  let bestName = '';
  let bestScore = 0;
  for (const name of championNames) {
    const score = similarityRatio(ocrText.toLowerCase(), name.toLowerCase());
    if (score > bestScore) { bestScore = score; bestName = name; }
  }
  return bestScore >= 0.7 ? bestName : null;
}
```

### OCRCoordinates — 1920x1080 Reference Values

```typescript
// Coordinates derived from TFT-OCR-BOT (github.com/jfd02/TFT-OCR-BOT screen_coords.py)
// These are for 1920x1080. Scale by (capturedWidth/1920, capturedHeight/1080) at runtime.

export const SHOP_SLOT_CENTERS = [
  { x: 575, y: 992 },
  { x: 775, y: 992 },
  { x: 975, y: 992 },
  { x: 1175, y: 992 },
  { x: 1375, y: 992 },
] as const;

// Shop name text bands (relative to each slot center, ±60x12 px)
export const SHOP_NAME_BAND_HALF_W = 60;
export const SHOP_NAME_BAND_HALF_H = 12;
export const SHOP_NAME_BAND_Y_OFFSET = -35; // above center

// Full shop region (for visibility detection)
export const SHOP_REGION = { x: 481, y: 1039, w: 995, h: 31 };

// Board positions (28 slots, 4 rows × 7 cols)
export const BOARD_SLOTS = [
  // Row 1 (front, y=651)
  { x: 581, y: 651 }, { x: 707, y: 651 }, { x: 839, y: 651 },
  { x: 966, y: 651 }, { x: 1091, y: 651 }, { x: 1222, y: 651 }, { x: 1349, y: 651 },
  // Row 2 (y=571)
  { x: 532, y: 571 }, { x: 660, y: 571 }, { x: 776, y: 571 },
  { x: 903, y: 571 }, { x: 1022, y: 571 }, { x: 1147, y: 571 }, { x: 1275, y: 571 },
  // Row 3 (y=494)
  { x: 609, y: 494 }, { x: 723, y: 494 }, { x: 841, y: 494 },
  { x: 962, y: 494 }, { x: 1082, y: 494 }, { x: 1198, y: 494 }, { x: 1318, y: 494 },
  // Row 4 (back, y=423)
  { x: 557, y: 423 }, { x: 673, y: 423 }, { x: 791, y: 423 },
  { x: 907, y: 423 }, { x: 1019, y: 423 }, { x: 1138, y: 423 }, { x: 1251, y: 423 },
] as const;

// Bench positions (9 slots)
export const BENCH_SLOTS = [
  { x: 425, y: 777 }, { x: 542, y: 777 }, { x: 658, y: 777 },
  { x: 778, y: 777 }, { x: 892, y: 777 }, { x: 1010, y: 777 },
  { x: 1128, y: 777 }, { x: 1244, y: 777 }, { x: 1359, y: 777 },
] as const;
```

### Extending OverlayState

```typescript
// Extends src/main/game/types.ts
export interface OCRChampion {
  apiName: string | null;       // null = unrecognized ("?")
  starLevel: 1 | 2 | 3;
  itemApiNames: string[];
}

export interface ShopSlot {
  apiName: string | null;       // null = unrecognized ("?")
  cost: number | null;
  ownedCount: number;           // 0 = not owned; ≥1 = highlight with golden border
}

export type OCRStatus = 'active' | 'stale' | 'offline';

export interface OverlayState {
  // Existing fields (from Live Client API)
  gold: number;
  level: number;
  gameTime: number;
  playerNames: string[];
  localPlayerName: string;
  // New OCR fields (Phase 3)
  board: OCRChampion[];         // Champions on board (up to 10)
  bench: OCRChampion[];         // Champions on bench (up to 9)
  shop: ShopSlot[];             // 5 shop slots
  shopVisible: boolean;         // Whether shop panel is on screen
  ocrStatus: OCRStatus;         // Status dot: 'active' | 'stale' | 'offline'
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Python + Tesseract binary | tesseract.js (WASM) in Node.js | 2018+ (tesseract.js v2+) | No system binary needed; self-contained |
| Native desktopCapturer in renderer | Main-process only via IPC | Electron 17 | Security sandbox; must call from main |
| sharp for image processing in Electron | jimp (zero native) or sharp with asarUnpack | Ongoing | sharp is faster but requires build config; jimp is simpler |
| Tesseract.js v4 | Tesseract.js v7 (released Dec 2025) | Dec 2025 | 54% smaller English model, 50% faster init, Node.js ≥16 required |

**Deprecated/outdated:**
- `desktopCapturer` in renderer process: Removed in Electron 17+ security model. Use main process with contextBridge.
- Creating a Tesseract worker per image: Extremely slow. Worker pool or persistent single worker is required.

---

## Open Questions

1. **Champion name label visibility on board units**
   - What we know: TFT renders champion names below board units, but at low zoom or with many units, labels may be truncated or overlapping.
   - What's unclear: Whether name label OCR is reliable enough at 1920x1080 for all 10 board slots simultaneously.
   - Recommendation: Use bench slots (cleaner rendering, flat icons) as primary data source for owned champions. Board slots can be supplemented. Validate during development with actual TFT screenshots.

2. **Star level detection method**
   - What we know: Star level (1/2/3) is shown as star icons above champion icons. TFT-OCR-BOT does not expose this in the reference code examined.
   - What's unclear: Whether star indicators are reliably pixel-detectable (color check) or require OCR.
   - Recommendation: Star indicators in TFT are gold star shapes above the unit nameplate. A simple pixel-color check at the known star indicator positions (above each board/bench slot) is likely sufficient. Implement as Phase 3.5 if it proves complex; display without star level first.

3. **Item icon recognition on board champions**
   - What we know: Items appear as small icons (≈24x24px) in corners of champion cells. CommunityDragon item icons are cached by Phase 1.
   - What's unclear: Whether items are reliably visible and matchable at that size, especially with 3-item stacking.
   - Recommendation: Template match item slots against cached item icons using pixelmatch at 24x24. Treat as best-effort; display "?" if confidence below threshold.

4. **TFT window title for desktopCapturer**
   - What we know: `OverlayWindow.ts` uses `'League of Legends (TM) Client'`. desktopCapturer `source.name` should match the window title.
   - What's unclear: Whether the window title is always exactly this string across TFT patches and locales.
   - Recommendation: Use the same string already in `OverlayWindow.ts`. If capture returns null, log all available source names for debugging. Consider a substring match (`.includes('League of Legends')`) as fallback.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.x |
| Config file | `vitest.config.ts` (exists) |
| Quick run command | `npx vitest run src/main/ocr/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-04 | Board OCR returns OCRChampion[] from a known screenshot | unit | `npx vitest run src/main/ocr/BoardOCR.test.ts` | ❌ Wave 0 |
| DATA-05 | Shop OCR returns ShopSlot[] with correct champion names | unit | `npx vitest run src/main/ocr/ShopOCR.test.ts` | ❌ Wave 0 |
| DATA-05 | Fuzzy name matching returns correct champion for OCR variants | unit | `npx vitest run src/main/ocr/ChampionMatcher.test.ts` | ❌ Wave 0 |
| OVER-03 | OverlayState shop slots carry ownedCount correctly | unit | `npx vitest run src/main/overlay/BoardStatePoller.test.ts` | ✅ (extend) |
| OVER-03 | ShopVisibilityDetector returns false for non-shop screenshots | unit | `npx vitest run src/main/ocr/ShopVisibilityDetector.test.ts` | ❌ Wave 0 |
| DATA-04/05 | OCR pipeline returns ocrStatus=stale after 10s of null | unit | `npx vitest run src/main/ocr/` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run src/main/ocr/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/main/ocr/ScreenCapturer.test.ts` — mock desktopCapturer, verify PNG buffer returned
- [ ] `src/main/ocr/RegionCropper.test.ts` — covers crop + grayscale + upscale pipeline
- [ ] `src/main/ocr/ShopOCR.test.ts` — covers DATA-05; use fixture PNG of known shop
- [ ] `src/main/ocr/BoardOCR.test.ts` — covers DATA-04; use fixture PNG of known board
- [ ] `src/main/ocr/ChampionMatcher.test.ts` — covers fuzzy name matching
- [ ] `src/main/ocr/ShopVisibilityDetector.test.ts` — covers OVER-03 visibility gating
- [ ] `src/main/ocr/__fixtures__/` — PNG fixture screenshots for unit tests (can be synthetic)

---

## Sources

### Primary (HIGH confidence)

- Electron official docs (electronjs.org/docs/latest/api/desktop-capturer) — desktopCapturer API, thumbnailSize, NativeImage.toPNG()
- tesseract.js GitHub (github.com/naptha/tesseract.js) — v7 API, createWorker, PSM modes, setParameters, Buffer input
- pixelmatch GitHub (github.com/mapbox/pixelmatch) — API, threshold param, RGBA buffer input
- Jimp GitHub (github.com/jimp-dev/jimp) — crop, greyscale, threshold, scale, getBuffer

### Secondary (MEDIUM confidence)

- TFT-OCR-BOT (github.com/jfd02/TFT-OCR-BOT) — screen_coords.py (1920x1080 coordinates), ocr.py (preprocessing pipeline), arena_functions.py (shop OCR approach with fuzzy matching). Python-based; coordinate values verified against code.
- sharp installation docs (sharp.pixelplumbing.com/install) — confirmed asarUnpack requirement for Electron; validates jimp preference for this project.
- yal.cc/electron-desktop-screenshots — confirmed desktopCapturer must run in main process (Electron 17+ security change)

### Tertiary (LOW confidence)

- Shop visibility detection via pixel color: inferred from TFT-OCR-BOT approach (ImageGrab on shop region); exact pixel color not verified against live TFT. Requires empirical validation during development.
- Star level detection approach: not confirmed in reference implementation; inferred from general TFT UI knowledge.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified via official docs and npm
- Architecture: HIGH — patterns derived from official APIs and reference implementation
- Screen coordinates: MEDIUM — derived from TFT-OCR-BOT Python source; valid for current TFT patch but may drift
- Shop visibility detection: LOW — pixel-color approach inferred, not empirically tested
- Star level / item icon detection: LOW — approach is reasonable but unverified

**Research date:** 2026-03-12
**Valid until:** 2026-04-12 (coordinate values may break on TFT UI patches; re-verify after each major patch)

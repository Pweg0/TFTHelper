# Phase 3: OCR Pipeline - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Screen capture pipeline that reads TFT game state from the game window via OCR. Covers local player board (champions, star levels, items), shop (5 champion slots), and owned-champion highlighting. Does NOT cover opponent boards (Phase 4) or recommendations (Phase 5).

</domain>

<decisions>
## Implementation Decisions

### Shop Highlighting (OVER-03)
- Golden border drawn directly over the game screen on shop champion slots (not in a separate panel)
- Simple yes/no indicator — border present means "you own this champion", no copy count
- Only visible when shop is on screen — detect shop visibility and hide borders during combat/carousel
- Requires precise coordinate mapping of the 5 shop slots at 1920x1080 resolution

### OCR Uncertainty Handling
- Show "?" placeholder when confidence is below threshold (don't show best guess)
- When OCR fails completely (loading screen, transition), keep last valid data for 10 seconds, then clear
- Small status indicator dot on overlay: green = OCR active and reading, red = no data / OCR failing

### Board Display (Local Player)
- Row of small champion icons displayed horizontally
- Each icon shows star level indicator (1/2/3 stars)
- Small item icons overlaid on champion icon corners
- Position: Claude's discretion based on TFT layout (avoid overlapping game HUD)

### Claude's Discretion
- Screen capture method (Electron desktopCapturer vs native)
- OCR engine choice (Tesseract.js, sharp+template matching, or hybrid)
- Confidence threshold values
- Exact icon sizes, spacing, and overlay positioning
- Champion recognition approach (icon template matching vs text OCR vs hybrid)
- Scan frequency and performance optimization
- How to detect shop visibility vs combat phase

</decisions>

<specifics>
## Specific Ideas

- Reference implementation: TFT-OCR-BOT (github.com/jfd02/TFT-OCR-BOT) uses Tesseract + coordinate-based region detection
- Champion icons already cached locally by CommunityDragon fetcher (Phase 1) — can be used as templates
- Fixed resolution 1920x1080 windowed fullscreen assumed
- BoardStatePoller (Phase 2) already has 1s polling loop + IPC push pattern — OCR data should integrate into same flow

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/main/overlay/BoardStatePoller.ts` — 1s interval polling loop, IPC push to overlay. Extend to include OCR data.
- `src/main/overlay/BoardStateParser.ts` — Zod validation + parsing. Extend schema for OCR fields.
- `src/main/game/types.ts` — OverlayState interface. Add board/shop/items fields.
- `src/main/data/ImageCacheFetcher.ts` — Downloads champion/item icons to AppData cache. Icons available for template matching.
- `src/main/data/types.ts` — Champion, Item, Augment types with icon paths.
- `src/main/overlay/OverlayWindow.ts` — Overlay window attached to TFT via electron-overlay-window.
- `src/renderer/overlay/OverlayApp.tsx` — Overlay React UI with text shadow styling and click-through toggle.

### Established Patterns
- Zod schemas for data validation
- IPC via `overlay-state-update` channel (main → overlay renderer)
- Click-through toggle on hover (pointerEvents + setIgnoreMouseEvents)
- electron-overlay-window for attachment to TFT window

### Integration Points
- BoardStatePoller.tick() — merge OCR results with Live Client API data into single OverlayState
- OverlayApp.tsx — add board icons, shop highlights, and status indicator to existing overlay
- OverlayState interface — extend with board/shop/item arrays
- overlayPreload.ts — no changes needed (same IPC channel)

</code_context>

<deferred>
## Deferred Ideas

- Opponent board reading via scouting screen (Tab) — Phase 4
- Comp recommendations based on board state — Phase 5
- Item recommendations — Phase 5
- HP/damage tracking — Phase 4

</deferred>

---

*Phase: 03-ocr-pipeline*
*Context gathered: 2026-03-12*

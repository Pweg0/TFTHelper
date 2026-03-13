# Roadmap: TFT Helper

## Overview

Five phases building from infrastructure outward: static data and game detection first, then the overlay window attached to TFT, then OCR pipeline for reading game state from screen, then scouting display combining OCR data with the overlay, then recommendation engine. OCR replaces the Live Client API for TFT-specific data (board state, shop, items) since the Riot API does not expose this information.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Data Pipeline** - Static game data and meta builds cached locally before any UI exists (completed 2026-03-12)
- [ ] **Phase 2: Overlay Window** - Transparent overlay attached to TFT window with basic local player data (gold, level)
- [ ] **Phase 3: OCR Pipeline** - Screen capture and text/icon recognition to read board state, shop, and items from TFT
- [ ] **Phase 4: Scouting & Display** - All player boards visible in overlay using OCR data from scouting screen
- [ ] **Phase 5: Recommendation Engine** - Comp and item recommendations driven by OCR board state, augments and meta winrates

## Phase Details

### Phase 1: Data Pipeline
**Goal**: Static game data and meta build data are available locally and ready to power the overlay
**Depends on**: Nothing (first phase)
**Requirements**: DATA-01, DATA-02, DATA-03
**Success Criteria** (what must be TRUE):
  1. App detects when a TFT game is active by polling the Riot Live Client API on port 2999
  2. Champion, trait, item and augment data from CommunityDragon is downloaded and cached on first run
  3. Meta comp and winrate data is scraped from MetaTFT/tactics.tools at app startup and stored in a local cache file
  4. Cached data survives app restarts without re-downloading (cache invalidation on new patch)
**Plans:** 4/4 plans complete

Plans:
- [x] 01-01-PLAN.md — Electron scaffold, TypeScript types/Zod schemas, DataCache utility, Vitest config
- [x] 01-02-PLAN.md — CommunityDragon static data fetcher and patch version checker
- [x] 01-03-PLAN.md — Game detection polling (Live Client API) and meta build scraper (tactics.tools)
- [x] 01-04-PLAN.md — Startup orchestration, IPC handlers, splash screen, and waiting screen

### Phase 2: Overlay Window
**Goal**: A transparent, always-on-top overlay is attached to the TFT game window with basic local player info
**Depends on**: Phase 1
**Requirements**: OVER-01, DATA-07
**Success Criteria** (what must be TRUE):
  1. Overlay window appears over TFT when a game starts and disappears when the game ends
  2. Overlay does not steal focus or interfere with game input (mouse/keyboard pass-through works)
  3. Overlay shows local player gold and level from Live Client API
  4. Overlay shows basic meta comp tier list from cached data
**Plans:** 3/4 plans executed (needs cleanup — BoardStateParser built on incorrect API assumptions)

Plans:
- [x] 02-01-PLAN.md — TFT board state types and parseBoardState function (NEEDS REWRITE — wrong API schema)
- [x] 02-02-PLAN.md — Overlay window infrastructure (electron-overlay-window, preload, renderer entry)
- [x] 02-03-PLAN.md — BoardStatePoller, startup wiring, and overlay React UI components (NEEDS REWRITE)
- [ ] 02-04-PLAN.md — Live TFT game verification checkpoint (discovered API limitations)

### Phase 3: OCR Pipeline
**Goal**: Screen capture pipeline reads TFT game state (board, shop, items) via OCR from the game window
**Depends on**: Phase 2
**Requirements**: DATA-04, DATA-05, OVER-03
**Success Criteria** (what must be TRUE):
  1. App captures screenshots of the TFT window at regular intervals
  2. OCR recognizes champion icons/names on the local player's board
  3. OCR reads the shop (5 champion slots with names and costs)
  4. OCR reads item components and completed items on board champions
  5. Champions in the shop that the player already owns are highlighted in the overlay
**Plans:** 4 plans

Plans:
- [ ] 03-01-PLAN.md — OCR types, coordinates, screen capturer, and region cropper foundation
- [ ] 03-02-PLAN.md — Champion name matcher, shop OCR, and shop visibility detector
- [ ] 03-03-PLAN.md — Board OCR, pipeline orchestrator, and BoardStatePoller integration
- [ ] 03-04-PLAN.md — Overlay UI components (board display, shop highlighting, status dot) and visual verification

### Phase 4: Scouting & Display
**Goal**: All player boards, items, levels and HP visible in the overlay using OCR from the scouting screen
**Depends on**: Phase 3
**Requirements**: DATA-06, OVER-02, SCOU-01, SCOU-02, SCOU-03
**Success Criteria** (what must be TRUE):
  1. When player presses Tab (scouting screen), OCR reads all opponent boards
  2. Overlay panel shows every player's composition with champion icons
  3. Each player's level and HP is displayed
  4. Items on each player's champions are visible
  5. All scouting information is visible simultaneously without scrolling
**Plans**: TBD

### Phase 5: Recommendation Engine
**Goal**: The overlay recommends the best comp and items based on OCR board state, augments and meta winrates
**Depends on**: Phase 4
**Requirements**: RECO-01, RECO-02, RECO-03, RECO-04
**Success Criteria** (what must be TRUE):
  1. Overlay displays a recommended comp based on current board state crossed with meta build winrates
  2. Ideal item combinations for each champion in the recommended comp are shown
  3. Augment synergy recommendations appear on the augment selection screen
  4. Augment winrates from meta data are displayed during augment selection
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Data Pipeline | 4/4 | Complete | 2026-03-12 |
| 2. Overlay Window | 2/4 | In Progress (cleanup needed) | |
| 3. OCR Pipeline | 0/4 | Planned | - |
| 4. Scouting & Display | 0/TBD | Not started | - |
| 5. Recommendation Engine | 0/TBD | Not started | - |

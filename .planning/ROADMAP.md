# Roadmap: TFT Helper

## Overview

Four phases that build from the inside out: static data and live API first, then the overlay window attached to TFT, then the scouting panel that shows all players, then the recommendation engine that crosses board state against meta builds. Each phase delivers something runnable and verifiable before the next begins.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Data Pipeline** - Static game data and meta builds cached locally before any UI exists (completed 2026-03-12)
- [ ] **Phase 2: Overlay Window** - Transparent overlay attached to TFT window with live game data flowing in
- [ ] **Phase 3: Scouting Panel** - Full board, items, level and HP of all players visible in the overlay
- [ ] **Phase 4: Recommendation Engine** - Comp and item recommendations driven by augments, board state and meta winrates

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
- [ ] 01-01-PLAN.md — Electron scaffold, TypeScript types/Zod schemas, DataCache utility, Vitest config
- [ ] 01-02-PLAN.md — CommunityDragon static data fetcher and patch version checker
- [ ] 01-03-PLAN.md — Game detection polling (Live Client API) and meta build scraper (tactics.tools)
- [ ] 01-04-PLAN.md — Startup orchestration, IPC handlers, splash screen, and waiting screen

### Phase 2: Overlay Window
**Goal**: A transparent, always-on-top overlay is attached to the TFT game window and receives live board state
**Depends on**: Phase 1
**Requirements**: OVER-01, DATA-04
**Success Criteria** (what must be TRUE):
  1. Overlay window appears over TFT when a game starts and disappears when the game ends
  2. Overlay does not steal focus or interfere with game input (mouse/keyboard pass-through works)
  3. App reads board state for all players in the match (comps, items, level, HP) from the Live Client API
  4. Board state updates automatically as the game progresses without manual refresh
**Plans**: TBD

### Phase 3: Scouting Panel
**Goal**: All player boards, items, levels and HP are visible in the overlay simultaneously in a usable layout
**Depends on**: Phase 2
**Requirements**: OVER-02, OVER-03, SCOU-01, SCOU-02, SCOU-03
**Success Criteria** (what must be TRUE):
  1. Overlay panel shows every player's current board composition with champion icons
  2. Each player's level and current HP is displayed alongside their board
  3. Items held by each player's champions are visible in the panel
  4. Champions in the shop that the local player already owns are visually highlighted with a gold overlay
  5. All scouting information is visible on screen simultaneously without scrolling
**Plans**: TBD

### Phase 4: Recommendation Engine
**Goal**: The overlay recommends the best comp and items for the local player based on board state, augments and meta winrates
**Depends on**: Phase 3
**Requirements**: RECO-01, RECO-02, RECO-03, RECO-04
**Success Criteria** (what must be TRUE):
  1. Overlay displays a recommended comp based on current board state crossed with meta build winrates
  2. Ideal item combinations for each champion in the recommended comp are shown
  3. Augment synergy recommendations appear on the augment selection screen based on the player's chosen augments
  4. Augment winrates from meta data are displayed during augment selection
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Data Pipeline | 4/4 | Complete   | 2026-03-12 |
| 2. Overlay Window | 0/TBD | Not started | - |
| 3. Scouting Panel | 0/TBD | Not started | - |
| 4. Recommendation Engine | 0/TBD | Not started | - |

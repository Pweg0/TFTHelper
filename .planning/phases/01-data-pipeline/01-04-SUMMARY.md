---
phase: 01-data-pipeline
plan: "04"
subsystem: ui
tags: [electron, react, ipc, electron-store, startup-orchestration, splash-screen]

# Dependency graph
requires:
  - phase: 01-data-pipeline/01-01
    provides: DataCache, types (AppConfig, Champion, Trait, Item, Augment, MetaComp schemas)
  - phase: 01-data-pipeline/01-02
    provides: PatchVersionChecker, CommunityDragonFetcher, ImageCacheFetcher
  - phase: 01-data-pipeline/01-03
    provides: GameWatcher, MetaScraper (refreshMetaIfStale)

provides:
  - startup.ts: sequential startup orchestration wiring all Phase 1 subsystems
  - ipc/handlers.ts: get-static-data, get-meta-data, get-config, get-icon-path IPC handlers
  - preload.ts: contextBridge window.api bridge with startup/game event listeners
  - SplashScreen.tsx: dark TFT-themed loading screen with CSS spinner and status message
  - App.tsx: three-state (loading/waiting/in-game) app shell driven by IPC events
  - electron.d.ts: TypeScript declarations for window.api

affects:
  - 02-live-client (uses App.tsx in-game state; extends IPC bridge for overlay data)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "did-finish-load startup: runStartupSequence called on mainWindow.webContents did-finish-load event, not app.whenReady — ensures renderer is ready to receive IPC messages"
    - "Store created once in index.ts, passed to registerIpcHandlers to avoid duplicate instances"
    - "Non-fatal startup steps: icon download and meta scrape wrapped in try/catch — app always reaches ready state"
    - "Window-closed cleanup: GameWatcher.stop() called on win.closed event to prevent lingering timers"

key-files:
  created:
    - src/main/startup.ts
    - src/main/ipc/handlers.ts
    - src/renderer/src/SplashScreen.tsx
    - src/renderer/src/electron.d.ts
  modified:
    - src/preload/preload.ts
    - src/main/index.ts
    - src/renderer/src/App.tsx

key-decisions:
  - "Startup triggered on did-finish-load (not app.whenReady) so renderer is listening before first IPC message arrives"
  - "Store initialized in index.ts and shared with registerIpcHandlers — single source of truth for app config"
  - "Icon download and meta scrape are non-fatal — app proceeds to waiting screen even if either fails"

patterns-established:
  - "IPC-driven UI state: renderer state machine reacts to IPC events (startup-status, game-started, game-ended)"
  - "Startup status steps: patch-check -> download-data -> load-data -> download-icons -> meta-scrape -> ready"

requirements-completed:
  - DATA-01
  - DATA-02
  - DATA-03

# Metrics
duration: 8min
completed: 2026-03-12
---

# Phase 1 Plan 4: Integration and UI Summary

**Electron startup orchestrator integrating PatchVersionChecker + CommunityDragonFetcher + ImageCacheFetcher + MetaScraper + GameWatcher, with IPC bridge and TFT-themed splash/waiting screens**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-12T19:28:00Z
- **Completed:** 2026-03-12T19:36:00Z
- **Tasks:** 2 (Task 3 is human-verify checkpoint)
- **Files modified:** 7

## Accomplishments

- Startup sequence wires all Phase 1 subsystems: patch check -> data download (if stale) -> icon download (lazy) -> meta scrape (if stale) -> GameWatcher polling
- IPC handlers expose static data, meta data, config, and icon paths to renderer
- Preload contextBridge API forwards startup-status, game-started, game-ended events to renderer
- SplashScreen shows dark TFT-themed loading UI with animated CSS spinner and live status messages
- App.tsx state machine transitions loading -> waiting -> in-game -> waiting driven by IPC events
- Waiting screen shows "Aguardando partida de TFT..." with patch version from store
- All 79 tests pass after integration

## Task Commits

Each task was committed atomically:

1. **Task 1: Startup orchestration, IPC handlers, and preload bridge** - `b50ae29` (feat)
2. **Task 2: Splash screen and waiting screen UI** - `114a192` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `src/main/startup.ts` - Sequential startup orchestration: patch -> data -> icons -> meta -> GameWatcher
- `src/main/ipc/handlers.ts` - IPC handlers: get-static-data, get-meta-data, get-config, get-icon-path
- `src/preload/preload.ts` - contextBridge window.api with IPC invoke wrappers and event listeners
- `src/main/index.ts` - Wires Store, registerIpcHandlers, and runStartupSequence on did-finish-load
- `src/renderer/src/SplashScreen.tsx` - Dark TFT-themed splash with CSS spinner and statusMessage prop
- `src/renderer/src/App.tsx` - loading/waiting/in-game state machine driven by IPC startup/game events
- `src/renderer/src/electron.d.ts` - TypeScript window.api declarations for renderer

## Decisions Made

- Startup triggered on `did-finish-load` rather than immediately in `app.whenReady` — ensures the renderer is listening for IPC before the first `startup-status` message is sent.
- Single `Store` instance created in `index.ts` and passed to `registerIpcHandlers` to avoid duplicate electron-store instances writing to the same file.
- Icon download and meta scrape are wrapped in try/catch and non-fatal — startup always reaches the ready state and transitions the UI to the waiting screen.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — all modules integrated cleanly. Build succeeded on first attempt, all 79 tests continue to pass.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 1 data pipeline complete pending human verification (Task 3 checkpoint)
- App launches with splash screen, shows status messages during startup, transitions to waiting screen
- On first launch: downloads ~21MB CDragon JSON + icon images to AppData; subsequent launches use cache
- GameWatcher polls every 3s — transitions to in-game screen when TFT detected at localhost:2999
- Phase 2 (overlay) should extend App.tsx in-game state with the actual overlay component

## Self-Check: PASSED

- `src/main/startup.ts` — found on disk
- `src/main/ipc/handlers.ts` — found on disk
- `src/preload/preload.ts` — found on disk
- `src/main/index.ts` — found on disk
- `src/renderer/src/SplashScreen.tsx` — found on disk
- `src/renderer/src/App.tsx` — found on disk
- `src/renderer/src/electron.d.ts` — found on disk
- Task 1 commit: b50ae29 — verified
- Task 2 commit: 114a192 — verified
- Build: `npx electron-vite build` — PASSED (all 3 bundles)
- Tests: `npx vitest run` — 79/79 PASSED

---
*Phase: 01-data-pipeline*
*Completed: 2026-03-12*

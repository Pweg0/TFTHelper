---
phase: 02-overlay-window
plan: 02
subsystem: ui
tags: [electron, electron-overlay-window, react, overlay, click-through, ipc, vite]

# Dependency graph
requires:
  - phase: 01-data-pipeline
    provides: Electron app scaffold, IPC pattern (preload/main), electron-vite multi-entry build system knowledge
provides:
  - Transparent always-on-top overlay window attached to TFT window via electron-overlay-window
  - createOverlayWindow function with attach/detach/moveresize lifecycle management
  - overlayPreload.ts exposing overlayApi for board-state IPC and click-through toggle
  - Overlay React renderer entry (OverlayApp.tsx) with panel hover click-through toggle
  - Multi-entry electron-vite config for both main and overlay renderer/preload
affects:
  - 02-overlay-window plan 03 (live data wiring into overlay components)
  - any phase touching renderer build config

# Tech tracking
tech-stack:
  added: [electron-overlay-window]
  patterns:
    - Separate preload per window to avoid IPC channel collision
    - OVERLAY_WINDOW_OPTS spread + webPreferences merge for transparent window creation
    - attachByTitle called once inside createOverlayWindow (process-lifetime constraint)
    - ipcMain.on registered inside createOverlayWindow for testability with vi.clearAllMocks
    - Rollup multi-entry input for both renderer and preload electron-vite build

key-files:
  created:
    - src/main/overlay/OverlayWindow.ts
    - src/main/overlay/OverlayWindow.test.ts
    - src/preload/overlayPreload.ts
    - src/renderer/overlay/index.html
    - src/renderer/overlay/main.tsx
    - src/renderer/overlay/OverlayApp.tsx
    - src/renderer/overlay/electron.d.ts
  modified:
    - electron.vite.config.ts
    - package.json
    - package-lock.json

key-decisions:
  - "IPC handler set-ignore-mouse-events registered inside createOverlayWindow (not at module level) for vi.clearAllMocks compatibility in tests"
  - "overlayApi exposed separately from main window api to prevent IPC channel collision"
  - "electron-overlay-window added to externalizeDepsPlugin exclude list — native addon must not be bundled"
  - "Overlay renderer script src uses /overlay/main.tsx path matching vite multi-entry output directory structure"

patterns-established:
  - "Multi-window preload: each window gets its own preload file to isolate IPC channels"
  - "vi.hoisted() for mock references used in vi.mock() factories (vitest hoisting constraint)"
  - "Overlay lifecycle: never destroy, only show/hide on attach/detach events"

requirements-completed: [OVER-01]

# Metrics
duration: 3min
completed: 2026-03-12
---

# Phase 02 Plan 02: Overlay Window Infrastructure Summary

**Transparent click-through overlay window with electron-overlay-window, separate overlayApi preload, and dual-entry electron-vite build producing both main and overlay renderer bundles**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-12T23:41:19Z
- **Completed:** 2026-03-12T23:44:30Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- electron-overlay-window installed and integrated; createOverlayWindow attaches overlay to TFT window with transparent click-through behavior
- overlayPreload.ts exposes a separate overlayApi (board-state + toggleClickThrough) isolated from main window IPC channels
- electron-vite config updated to multi-entry for both renderer (main + overlay) and preload (preload + overlayPreload); build produces both HTML bundles

## Task Commits

1. **Task 1: Install electron-overlay-window and create OverlayWindow module** - `33137dd` (feat)
2. **Task 2: Create overlay preload, renderer entry, and electron-vite config** - `0c69e5b` (feat)

## Files Created/Modified

- `src/main/overlay/OverlayWindow.ts` - createOverlayWindow with OVERLAY_WINDOW_OPTS, attach/detach/moveresize lifecycle, and set-ignore-mouse-events IPC handler
- `src/main/overlay/OverlayWindow.test.ts` - 10 unit tests mocking electron and electron-overlay-window via vi.hoisted
- `src/preload/overlayPreload.ts` - Overlay-specific contextBridge exposing overlayApi with onBoardStateUpdate and toggleClickThrough
- `src/renderer/overlay/electron.d.ts` - Window.overlayApi TypeScript ambient declarations
- `src/renderer/overlay/index.html` - Overlay renderer HTML with transparent body and overlay-root div
- `src/renderer/overlay/main.tsx` - ReactDOM.createRoot into overlay-root
- `src/renderer/overlay/OverlayApp.tsx` - Root overlay component with panel hover click-through toggle and placeholder text
- `electron.vite.config.ts` - Multi-entry rollupOptions for renderer and preload; electron-overlay-window externalized

## Decisions Made

- ipcMain.on for set-ignore-mouse-events registered inside createOverlayWindow rather than at module level — enables vi.clearAllMocks() to reset call counts correctly in tests
- overlayApi exposed as a separate contextBridge world key from the main window's api to prevent IPC channel collision (plan pitfall 5)
- electron-overlay-window added to externalizeDepsPlugin exclude list so the native addon is not bundled by Vite but still resolved at runtime
- Overlay renderer script src path is /overlay/main.tsx to match Vite's multi-entry output directory structure

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Moved ipcMain.on inside createOverlayWindow for test isolation**

- **Found during:** Task 1 (test execution)
- **Issue:** ipcMain.on registered at module level was called during import, before beforeEach vi.clearAllMocks(), making it invisible to test assertions
- **Fix:** Moved ipcMain.on('set-ignore-mouse-events', ...) inside createOverlayWindow function body
- **Files modified:** src/main/overlay/OverlayWindow.ts
- **Verification:** All 10 tests pass including the IPC handler tests
- **Committed in:** 33137dd (Task 1 commit)

**2. [Rule 1 - Bug] Removed invalid import of .d.ts file in OverlayApp.tsx**

- **Found during:** Task 2 (verifying build)
- **Issue:** `import './electron.d.ts'` is not valid — ambient .d.ts files are loaded by TypeScript automatically via tsconfig, not via ES module import
- **Fix:** Removed the import statement; electron.d.ts remains as ambient global type declaration
- **Files modified:** src/renderer/overlay/OverlayApp.tsx
- **Verification:** electron-vite build succeeds, TypeScript types still resolve
- **Committed in:** 0c69e5b (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 bug fixes)
**Impact on plan:** Both fixes required for correct test behavior and valid TypeScript/build output. No scope creep.

## Issues Encountered

- Vitest hoisting constraint: vi.mock() factories are hoisted to file top, so top-level variables cannot be referenced inside them. Fixed by using vi.hoisted() to pre-declare mock functions before the factory runs.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Overlay window infrastructure complete; Plan 03 can wire live board state data from GameWatcher into OverlayApp components
- OverlayController.attachByTitle has been called — Plan 03 must NOT call it again (one-call-per-process constraint)
- overlayApi is wired and ready for board-state-update IPC messages from the main process

---
*Phase: 02-overlay-window*
*Completed: 2026-03-12*

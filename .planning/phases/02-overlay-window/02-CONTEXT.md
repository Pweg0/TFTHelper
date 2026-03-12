# Phase 2: Overlay Window - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

A transparent, always-on-top overlay is attached to the TFT game window and receives live board state from all players. The overlay appears automatically when a game starts and persists until the next game. Board state includes compositions, items, levels, and HP for all 8 players. Layout is a narrow right-side panel with minimalist floating text/icons.

</domain>

<decisions>
## Implementation Decisions

### Overlay Behavior
- **Visibility:** Automatic — overlay appears when GameWatcher detects game start, disappears only when a new game starts (data persists between games)
- **Position:** Fullscreen match — overlay window occupies the same area as the TFT window (transparent everywhere except the info panel)
- **Transparency:** Fully transparent background — only info panels and their content are visible, rest is invisible click-through
- **Input:** Click-through by default — all mouse/keyboard input passes through to the game. Clicking directly on overlay panel elements allows interaction with the overlay
- **End of game:** Data from the last match stays visible until a new game starts (allows post-game review)

### Live Board State Data
- **Scope:** Complete board state for all 8 players — compositions (champion icons), items, levels, HP
- **Polling frequency:** 1 second during active game
- **Local player extras:** Show gold and level for the active player (data only available for local player via activePlayer endpoint)
- **Eliminated players:** Removed from the overlay entirely (HP = 0) to save space
- **Player ordering:** Sorted by HP descending (highest HP at top)
- **Missing data:** Show a subtle "?" indicator for fields where data is unavailable
- **GameWatcher integration:** Existing GameWatcher (3s poll) detects game start → switches to 1s board state polling → GameWatcher detects game end → stop polling but keep last data

### Layout & Visual Design
- **Panel position:** Right side of screen, vertical layout
- **Panel width:** Narrow (~200px)
- **Info per player:** Name, HP, level, and small champion icons (comp summary)
- **Visual style:** Minimalista sem fundo — text and icons float directly over the game with drop shadow/outline for legibility. No background panel or card.
- **Color scheme:** Light text (white) with dark drop shadow for contrast against any game background

### Claude's Discretion
- Electron overlay window configuration (transparent, always-on-top, click-through flags)
- How to attach overlay to TFT window position/size
- LiveClientResponse TypeScript types (full typing of the API response)
- React component structure for the overlay UI
- How to implement click-through with exception zones
- Shadow/outline technique for floating text legibility
- Icon sizing and spacing within 200px width constraint

</decisions>

<specifics>
## Specific Ideas

- GameWatcher already exists with onGameStart/onGameEnd callbacks — overlay lifecycle hooks into these
- LiveClientAPI.ts already fetches from localhost:2999 — needs faster polling and full response typing
- Overlay window is a second BrowserWindow in Electron (separate from the main/waiting window)
- IPC channels needed: board state updates pushed from main to overlay renderer

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/main/game/GameWatcher.ts` — polling loop with onGameStart/onGameEnd callbacks, 3s default interval
- `src/main/game/LiveClientAPI.ts` — fetchGameData() already hits localhost:2999 with self-signed cert handling
- `src/main/game/types.ts` — LiveClientResponse interface (needs expansion), GameState interface
- `src/main/ipc/handlers.ts` — IPC handler registration pattern
- `src/preload/preload.ts` — IPC bridge with onGameStarted/onGameEnded channels
- `src/renderer/src/App.tsx` — state machine (loading/waiting/in-game) ready for overlay transition
- Champion/trait icon cache in AppData — icons already downloaded by Phase 1

### Established Patterns
- electron-store for persistent config (AppConfig)
- Zod schemas for data validation (types.ts)
- axios for HTTP requests with timeout
- IPC via contextBridge with typed window.api
- Vitest for unit tests

### Integration Points
- GameWatcher.onGameStart → create overlay window + start 1s polling
- GameWatcher.onGameEnd → stop polling (keep data displayed)
- Main process → overlay renderer: IPC push of board state every 1s
- Icon cache paths: getIconPath() returns local file paths for champion sprites
- Main window shows "waiting" state; overlay is a separate window

</code_context>

<deferred>
## Deferred Ideas

- Distribution as single .exe — post-v1 (noted in project memory)
- Detailed scouting info (items per champion, traits breakdown) — Phase 3
- Champion shop highlighting — Phase 3
- Recommendation engine — Phase 4

</deferred>

---

*Phase: 02-overlay-window*
*Context gathered: 2026-03-12*

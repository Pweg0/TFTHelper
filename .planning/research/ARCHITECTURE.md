# Architecture Research

**Domain:** Game overlay desktop application (TFT / Riot Games)
**Researched:** 2026-03-12
**Confidence:** MEDIUM — Core patterns verified via official docs and real-world TFT overlay examples. Some Riot API specifics (rate limits, live data TFT support) confirmed as dynamic/version-dependent and must be validated at runtime.

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         UI LAYER (Renderer Process)                  │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │  PlayerPanel │  │  RecoPanel   │  │  ItemPanel   │               │
│  │ (all 8 comps)│  │ (best build) │  │ (item combos)│               │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘               │
│         └─────────────────┴─────────────────┘                        │
│                           │ Zustand store subscription               │
├───────────────────────────┼─────────────────────────────────────────┤
│                      IPC BRIDGE (Preload / contextBridge)            │
│                           │ ipcRenderer.invoke / on                  │
├───────────────────────────┼─────────────────────────────────────────┤
│                    MAIN PROCESS (Node.js)                            │
│                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │  GameWatcher     │  │ RecommendEngine  │  │  MetaCache       │   │
│  │  (polling loop)  │  │ (scoring logic)  │  │  (in-memory +    │   │
│  │  port 2999 +     │  │                  │  │   disk cache)    │   │
│  │  process detect  │  └──────────────────┘  └──────────────────┘   │
│  └──────────────────┘                                                │
│                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐                          │
│  │  RiotAPIClient   │  │  MetaBuildFetcher │                         │
│  │  (match history, │  │  (Mobalytics /   │                          │
│  │   live data)     │  │   MetaTFT scrape)│                          │
│  └──────────────────┘  └──────────────────┘                          │
├─────────────────────────────────────────────────────────────────────┤
│                    OVERLAY WINDOW LAYER                              │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  BrowserWindow  { transparent: true, alwaysOnTop: true,     │    │
│  │                   frame: false, skipTaskbar: true }          │    │
│  │  Attached to "League of Legends" window title via            │    │
│  │  electron-overlay-window (position/size sync)               │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| `GameWatcher` | Detects active TFT game; polls `127.0.0.1:2999` every 3-5 seconds; fires lifecycle events (game_start, game_end, state_update) | Main process, Node `setInterval` + `fetch` |
| `RiotAPIClient` | Calls Riot REST API for match history and live client data; handles rate limit headers dynamically; retries on 429 | Main process, `axios` or native `fetch`, respects `X-App-Rate-Limit` headers |
| `MetaBuildFetcher` | Fetches meta comp/augment/item data from external source (Mobalytics or MetaTFT) on app startup and on patch change | Main process, runs before game; never during game session |
| `MetaCache` | Stores meta build data between fetches; persists to disk across restarts; TTL-based invalidation per patch | In-memory object + `node:fs` JSON serialization (or SQLite for larger datasets) |
| `RecommendEngine` | Scores available compositions against current game state (board, bench, augments, items, opponents); returns ranked recommendations | Pure function module, main process; synchronous computation, no I/O |
| `IPC Bridge` | Exposes safe channel API from main to renderer; no raw Node access in renderer (contextBridge pattern) | `preload.ts` with `contextBridge.exposeInMainWorld` |
| `PlayerPanel` | Renders all 8 players' comps, HP, level, and traits in overlay | React component, subscribes to Zustand game state |
| `RecoPanel` | Renders top 3 recommended compositions with champion list and tier | React component, subscribes to Zustand reco state |
| `ItemPanel` | Renders ideal item combinations for recommended carry champions | React component, subscribes to Zustand meta state |
| `OverlayWindow` | The Electron `BrowserWindow` that renders the UI; transparent and always-on-top; position/size locked to game window | `electron-overlay-window` library for sync |

---

## Recommended Project Structure

```
tftbot/
├── src/
│   ├── main/                        # Main process (Node.js)
│   │   ├── index.ts                 # Entry point, creates windows
│   │   ├── overlay.ts               # BrowserWindow setup (transparent, alwaysOnTop)
│   │   ├── ipc/
│   │   │   └── handlers.ts          # All ipcMain.handle() registrations
│   │   ├── game/
│   │   │   ├── GameWatcher.ts       # Polling loop, game state detection
│   │   │   ├── LiveClientAPI.ts     # Wraps 127.0.0.1:2999 requests
│   │   │   └── types.ts             # GameState, Player, Champion types
│   │   ├── riot/
│   │   │   ├── RiotAPIClient.ts     # Riot REST API calls, rate limiting
│   │   │   └── types.ts             # Riot API response types
│   │   ├── meta/
│   │   │   ├── MetaBuildFetcher.ts  # Fetches from Mobalytics / MetaTFT
│   │   │   ├── MetaCache.ts         # TTL cache, disk persistence
│   │   │   └── types.ts             # Comp, Champion, Augment, Item types
│   │   └── engine/
│   │       ├── RecommendEngine.ts   # Scoring and ranking logic
│   │       └── scoring.ts           # Pure scoring functions (unit testable)
│   ├── preload/
│   │   └── preload.ts               # contextBridge API exposure
│   └── renderer/                    # Renderer process (React)
│       ├── index.tsx                # React entry point
│       ├── store/
│       │   ├── gameStore.ts         # Zustand slice: live game state
│       │   ├── metaStore.ts         # Zustand slice: meta build data
│       │   └── recoStore.ts         # Zustand slice: recommendations
│       ├── components/
│       │   ├── PlayerPanel/
│       │   ├── RecoPanel/
│       │   ├── ItemPanel/
│       │   └── Overlay/             # Root overlay layout, drag/resize
│       └── hooks/
│           └── useIPCListener.ts    # Listens to IPC events, updates store
├── electron.vite.config.ts          # electron-vite build config
└── package.json
```

### Structure Rationale

- **`main/game/`**: Isolated from Riot API code. The live client data (port 2999) and the Riot REST API are different sources with different lifetimes. Keeping them separate allows independent evolution.
- **`main/engine/`**: The recommendation engine is pure logic. Isolating it makes unit testing trivial without needing a running Electron instance.
- **`main/meta/`**: Meta data has a completely different lifecycle (fetched pre-game, cached for hours/days). Separating it from live game polling prevents coupling.
- **`renderer/store/`**: Three Zustand slices map to three distinct data domains. Game state updates at 3-5 second intervals; meta state updates at patch boundaries; reco state updates whenever game state changes.

---

## Architectural Patterns

### Pattern 1: Main-Process-Owned Data, Renderer-Subscribed

**What:** All I/O, polling, and computation live in the main process. The renderer only receives processed state via IPC and renders it. The renderer never calls external APIs directly.

**When to use:** Always, for this app. Required by Electron security model and critical for performance — game I/O must not block the render thread.

**Trade-offs:** Slight IPC overhead on every state update; worth it for security, stability, and performance isolation.

**Example:**
```typescript
// main/ipc/handlers.ts
ipcMain.handle('get-recommendations', async () => {
  return recommendEngine.getLatest();
});

// main/game/GameWatcher.ts — pushes updates to renderer
function onStateUpdate(state: GameState) {
  mainWindow.webContents.send('game-state-update', state);
}

// preload/preload.ts
contextBridge.exposeInMainWorld('api', {
  onGameStateUpdate: (cb: (state: GameState) => void) =>
    ipcRenderer.on('game-state-update', (_, state) => cb(state)),
  getRecommendations: () => ipcRenderer.invoke('get-recommendations'),
});
```

### Pattern 2: Event-Driven State Updates (Polling With Diffing)

**What:** `GameWatcher` polls `127.0.0.1:2999` on a fixed interval (3-5 seconds). Before sending to the engine or renderer, it diffs the new state against the previous state. IPC messages are only emitted when something actually changed.

**When to use:** Always. Emitting on every poll regardless of change wastes IPC bandwidth and causes unnecessary React re-renders during a game.

**Trade-offs:** Requires a shallow equality check on each poll cycle. Negligible cost.

**Example:**
```typescript
// main/game/GameWatcher.ts
let lastState: GameState | null = null;

setInterval(async () => {
  const newState = await fetchLiveClientData();
  if (!isEqual(newState, lastState)) {
    lastState = newState;
    const reco = recommendEngine.compute(newState, metaCache.get());
    mainWindow.webContents.send('game-state-update', newState);
    mainWindow.webContents.send('recommendations-update', reco);
  }
}, 3000);
```

### Pattern 3: Offline-First Meta Data with TTL Cache

**What:** Meta build data (comp tiers, item combos, augment synergies) is fetched from external sources once at startup and once per patch. It is cached to disk (JSON file). During gameplay, all meta lookups hit the in-memory cache — zero external HTTP requests during a game session.

**When to use:** Always for meta data. External fetch latency during a game would degrade the recommendation freshness and potentially hang the UI.

**Trade-offs:** Meta data may be up to 24 hours stale between refreshes. Acceptable for patch-level changes.

**Example:**
```typescript
// main/meta/MetaCache.ts
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

async function getMetaData(): Promise<MetaData> {
  const cached = loadFromDisk();
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }
  const fresh = await MetaBuildFetcher.fetch();
  saveToDisk({ data: fresh, fetchedAt: Date.now() });
  return fresh;
}
```

---

## Data Flow

### Game Detection Flow

```
App Startup
    │
    ▼
GameWatcher starts polling 127.0.0.1:2999/liveclientdata/allgamedata
    │
    ├── Response: connection refused → game not running → overlay hidden
    │
    └── Response: 200 OK + gameMode == "tft" → TFT game active
            │
            ▼
        overlay shown, polling continues at 3-5s interval
```

### Live Game Data Flow

```
[127.0.0.1:2999 poll] (every 3-5s)
    │
    ▼
LiveClientAPI.fetchAllGameData()
    │
    ▼
GameWatcher.diffState(prev, next)
    │
    ├── No change → discard
    │
    └── Changed →
            │
            ▼
        RecommendEngine.compute(gameState, metaData)
            │
            ▼
        ipcMain → mainWindow.webContents.send('game-state-update')
        ipcMain → mainWindow.webContents.send('recommendations-update')
            │
            ▼
        [Renderer] preload listener fires
            │
            ▼
        Zustand store.setState(newState)
            │
            ▼
        React components re-render
```

### Meta Data Flow

```
App Startup
    │
    ▼
MetaCache.get() → disk hit? → return cached data
    │                              │
    │ cache miss / expired         └── [in-memory available]
    ▼
MetaBuildFetcher.fetch() → Mobalytics / MetaTFT API
    │
    ▼
Parse + normalize → MetaData schema
    │
    ▼
MetaCache.save() → disk + in-memory
    │
    ▼
RecommendEngine gets updated meta reference
```

### State Management

```
[Main Process Events]
    │
    ▼ IPC push
[Preload listeners]
    │
    ▼ callback
[Zustand store.setState]
    │
    ▼ subscription
[React components] ← auto re-render on subscribed slice change
```

### Key Data Flows

1. **Game state to recommendation:** `LiveClientAPI → GameWatcher → RecommendEngine → IPC → Zustand → RecoPanel`. Target latency: under 500ms from poll to rendered update.
2. **Meta data to recommendation:** `MetaBuildFetcher → MetaCache → RecommendEngine`. This is synchronous during compute; meta is always pre-loaded before game starts.
3. **Overlay positioning:** `electron-overlay-window` monitors the "League of Legends" process window. On move/resize it emits events that Electron uses to reposition/resize the `BrowserWindow`. This runs independently of data flows.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Riot Live Client Data API (`127.0.0.1:2999`) | HTTP polling every 3-5s during game | Self-signed cert; must use `rejectUnauthorized: false` in Node fetch. Limited TFT-specific data — returns LoL-style JSON. Game mode field confirms TFT. |
| Riot REST API (api.riotgames.com) | REST calls with API key header; dynamic rate limit from response headers | Development key: 20 req/s, 100 req/2min. Read `X-App-Rate-Limit` headers. Never hard-code limits. Only needed for match history / summoner lookup — not required during live game. |
| Mobalytics / MetaTFT (meta data source) | HTTP fetch on startup; result cached to disk | No official public API. Approach: (a) unofficial JSON endpoints these sites expose for their own frontend, or (b) periodic scrape. Must be researched per site before implementation. Risk: endpoints can change without notice. |
| Data Dragon (Riot static assets) | CDN download; version locked per patch | Champions, items, traits, augments assets and IDs. URL pattern: `https://ddragon.leagueoflegends.com/cdn/{version}/data/en_US/tft-champion.json`. Version must be updated per patch. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Main process ↔ Renderer | IPC via `ipcMain` / `ipcRenderer` through preload | Use `invoke` (async, request/response) for queries; `send` (one-way push) for state updates. Never expose `ipcRenderer` directly — use `contextBridge`. |
| `GameWatcher` ↔ `RecommendEngine` | Direct function call (same process) | Engine is synchronous. Called inside the poll callback after diff confirms a change. |
| `RecommendEngine` ↔ `MetaCache` | Direct function call (same process) | Engine receives meta snapshot at compute time. Cache invalidation is independent. |
| `MetaBuildFetcher` ↔ `MetaCache` | Direct function call on startup | Fetcher writes to cache; engine reads from cache. They never touch simultaneously during gameplay. |
| Overlay window position ↔ game window | `electron-overlay-window` library | Finds window by title ("League of Legends"), syncs BrowserWindow bounds. Emits `attach`, `detach`, `fullscreen` events for overlay lifecycle. |

---

## Overlay Rendering Approach

The overlay must be:
- **Transparent background** — `transparent: true` in BrowserWindow options
- **Always on top** — `alwaysOnTop: true` with level `'screen-saver'` on Windows (required to stay above fullscreen games)
- **Click-through for non-interactive areas** — `setIgnoreMouseEvents(true, { forward: true })` with interactive panels toggling this off on hover
- **Attached to game window** — `electron-overlay-window` library syncs position and size automatically

**Critical performance note:** A full-screen transparent Electron window causes GPU compositing overhead. Mitigate by:
1. Keeping the overlay window as small as possible (panel-sized, not full-screen if avoidable)
2. Using `app.disableHardwareAcceleration()` only as a last resort — it eliminates the lag but removes GPU compositing
3. Positioning the UI panels at fixed screen edges rather than rendering a full-screen transparent canvas

**Game detection for overlay visibility:**
```typescript
// Show overlay only when TFT is actively running
overlayWindow.on('attach', () => overlayBrowserWindow.show());
overlayWindow.on('detach', () => overlayBrowserWindow.hide());
```

---

## Build Order (Component Dependencies)

Build in this order. Each step unblocks the next.

| Step | Component | Unblocks | Rationale |
|------|-----------|----------|-----------|
| 1 | `types.ts` (GameState, MetaData, Comp schemas) | Everything | Define data contracts before any logic |
| 2 | `LiveClientAPI.ts` | GameWatcher | Verify Riot port 2999 connectivity and TFT data shape |
| 3 | `GameWatcher.ts` (polling + game detection) | Overlay lifecycle, engine trigger | Core heartbeat of the app |
| 4 | Overlay window setup (transparent BrowserWindow + `electron-overlay-window`) | UI rendering | Must confirm overlay attaches correctly to game window before building UI on top of it |
| 5 | `MetaBuildFetcher.ts` + `MetaCache.ts` | Engine has data to work with | Can run with mock meta data initially; replace with real fetch |
| 6 | `RecommendEngine.ts` (scoring logic, unit-tested) | Recommendations in UI | Pure functions — build and test independently before wiring to IPC |
| 7 | IPC handlers + preload bridge | Renderer receives real data | Wire all main-process outputs to IPC channels |
| 8 | Zustand stores (gameStore, metaStore, recoStore) | React components have state | Skeleton stores before building components |
| 9 | `PlayerPanel` React component | MVP visible output | Renders all 8 players — highest-value visible feature |
| 10 | `RecoPanel` React component | Recommendations visible | Consumes engine output; key differentiating feature |
| 11 | `ItemPanel` React component | Complete MVP | Item combination display |
| 12 | `RiotAPIClient.ts` (match history, summoner) | Enhanced features | Not required for live overlay; adds context features post-MVP |

---

## Scaling Considerations

This is a single-user desktop app. "Scaling" here means handling multiple games per session and patch updates without requiring reinstalls.

| Concern | Approach |
|---------|----------|
| Patch updates (new set, new champions) | Data Dragon version check on startup; MetaCache TTL triggers re-fetch; no code changes needed for new champions |
| Multiple game sessions per day | `GameWatcher` handles game_start / game_end lifecycle cleanly; state resets on each new game |
| Rate limit exhaustion (dev key) | Only live client data (local) is used during gameplay; Riot REST API called sparingly (summoner lookup once, match history on demand) |
| Meta data source going down | Serve from disk cache; show warning in UI; app still functions with stale meta |

---

## Anti-Patterns

### Anti-Pattern 1: Calling External APIs During Gameplay

**What people do:** Fetch fresh meta data or call Riot REST API endpoints on every game state update during a live match.

**Why it's wrong:** Network latency introduces unpredictable delays in the recommendation pipeline. If the external service is slow or down, the overlay stalls. It also risks hitting rate limits during the most critical moments.

**Do this instead:** Fetch all external data before the game starts. Serve everything from the in-memory cache during gameplay. Schedule background re-fetches for after the game ends.

### Anti-Pattern 2: Full-Screen Transparent Overlay Window

**What people do:** Create a single `BrowserWindow` the size of the entire screen with `transparent: true` to allow flexible UI positioning anywhere.

**Why it's wrong:** Electron's full-screen transparent window causes significant GPU compositing overhead. At 1080p/120fps games, this is reported to drop effective FPS to ~20fps from the overlay's compositor fighting the game's renderer.

**Do this instead:** Use the smallest possible overlay window that fits the actual UI panels. Position it at a screen edge (e.g., right side panel) and resize it to only cover the area containing UI. Use `electron-overlay-window` to track game window position relative offsets.

### Anti-Pattern 3: Direct Node.js Access in Renderer

**What people do:** Enable `nodeIntegration: true` and `contextIsolation: false` in BrowserWindow to avoid writing IPC boilerplate.

**Why it's wrong:** The renderer runs web content. Any XSS or compromised dependency can access the file system, execute arbitrary Node.js code, and interact with the OS. Also blocks Electron security audits.

**Do this instead:** Keep `contextIsolation: true` (default). Expose only what the renderer needs via `contextBridge.exposeInMainWorld` in the preload script. Write the IPC channels explicitly.

### Anti-Pattern 4: Polling Without Diffing

**What people do:** Send the full game state to the renderer on every poll tick (every 3 seconds), regardless of whether anything changed.

**Why it's wrong:** TFT games have long stretches (planning/shopping phase) where state is identical between polls. Sending unchanged state triggers unnecessary React re-renders and wastes IPC serialization time.

**Do this instead:** Diff state in the main process before sending. Only emit IPC events when state has actually changed. Use shallow equality on the game state object's key fields.

---

## Sources

- [electron-overlay-window GitHub — SnosMe](https://github.com/SnosMe/electron-overlay-window) — MEDIUM confidence; actively maintained as of March 2026 (v4.0.2)
- [Electron Process Model — Official Docs](https://www.electronjs.org/docs/latest/tutorial/process-model) — HIGH confidence
- [Electron IPC — Official Docs](https://www.electronjs.org/docs/latest/tutorial/ipc) — HIGH confidence
- [Overwolf TFT Game Events Reference](https://dev.overwolf.com/ow-native/live-game-data-gep/supported-games/teamfight-tactics/) — HIGH confidence; shows available TFT game event categories
- [Building a Smart TFT Overlay — inusha.dev](https://inusha.dev/blog/tft_tactical_overlay) — MEDIUM confidence; real implementation example showing event-driven architecture and offline-first approach
- [Riot Developer Portal — TFT](https://developer.riotgames.com/docs/tft) — HIGH confidence for policy constraints; MEDIUM for API specifics (dynamic)
- [Riot API Rate Limiting — hextechdocs.dev](https://hextechdocs.dev/rate-limiting/) — MEDIUM confidence; confirms dynamic rate limit via headers approach
- [Electron Performance — Official Docs](https://www.electronjs.org/docs/latest/tutorial/performance) — HIGH confidence
- [Full-screen transparent overlay lag — Electron issue #28439](https://github.com/electron/electron/issues/28439) — MEDIUM confidence; community-confirmed performance issue

---

*Architecture research for: TFT Helper overlay desktop app*
*Researched: 2026-03-12*

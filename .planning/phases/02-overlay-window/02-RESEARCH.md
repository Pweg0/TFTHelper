# Phase 2: Overlay Window - Research

**Researched:** 2026-03-12
**Domain:** Electron transparent overlay windows + Riot Live Client Data API (TFT)
**Confidence:** MEDIUM (overlay mechanics HIGH; TFT board state fields LOW — require in-game testing)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Visibility:** Automatic — overlay appears when GameWatcher detects game start, disappears only when a new game starts (data persists between games)
- **Position:** Fullscreen match — overlay window occupies the same area as the TFT window (transparent everywhere except the info panel)
- **Transparency:** Fully transparent background — only info panels and their content are visible, rest is invisible click-through
- **Input:** Click-through by default — all mouse/keyboard input passes through to the game. Clicking directly on overlay panel elements allows interaction with the overlay
- **End of game:** Data from the last match stays visible until a new game starts (allows post-game review)
- **Scope:** Complete board state for all 8 players — compositions (champion icons), items, levels, HP
- **Polling frequency:** 1 second during active game
- **Local player extras:** Show gold and level for the active player (data only available for local player via activePlayer endpoint)
- **Eliminated players:** Removed from the overlay entirely (HP = 0) to save space
- **Player ordering:** Sorted by HP descending (highest HP at top)
- **Missing data:** Show a subtle "?" indicator for fields where data is unavailable
- **GameWatcher integration:** Existing GameWatcher (3s poll) detects game start → switches to 1s board state polling → GameWatcher detects game end → stop polling but keep last data
- **Panel position:** Right side of screen, vertical layout
- **Panel width:** Narrow (~200px)
- **Info per player:** Name, HP, level, and small champion icons (comp summary)
- **Visual style:** Minimalista sem fundo — text and icons float directly over the game with drop shadow/outline for legibility. No background panel or card
- **Color scheme:** Light text (white) with dark drop shadow for contrast against any game background

### Claude's Discretion

- Electron overlay window configuration (transparent, always-on-top, click-through flags)
- How to attach overlay to TFT window position/size
- LiveClientResponse TypeScript types (full typing of the API response)
- React component structure for the overlay UI
- How to implement click-through with exception zones
- Shadow/outline technique for floating text legibility
- Icon sizing and spacing within 200px width constraint

### Deferred Ideas (OUT OF SCOPE)

- Distribution as single .exe — post-v1
- Detailed scouting info (items per champion, traits breakdown) — Phase 3
- Champion shop highlighting — Phase 3
- Recommendation engine — Phase 4
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| OVER-01 | App exibe overlay transparente always-on-top sobre a janela do TFT | electron-overlay-window `attachByTitle()` + OVERLAY_WINDOW_OPTS preset handles window attachment, always-on-top, and size sync |
| DATA-04 | App lê board state de todos os jogadores da partida (comps, itens, level, HP) | Live Client Data API `/allgamedata` endpoint at localhost:2999; TFT fields confirmed in `allPlayers` but exact schema requires in-game validation |
</phase_requirements>

---

## Summary

Phase 2 creates a transparent Electron overlay window that sits over the TFT game client and receives live board state for all 8 players, pushed via IPC every second. Two distinct technical problems must be solved: (1) making an Electron window behave as a transparent overlay that tracks the game window position, and (2) fetching and modeling TFT board state from the Riot Live Client Data API.

For the overlay mechanics, `electron-overlay-window` (npm: `electron-overlay-window`, v4.0.2) is the right choice. It provides native window tracking via `attachByTitle()`, emits lifecycle events when the target window moves or changes focus, and exports `OVERLAY_WINDOW_OPTS` — a `BrowserWindowConstructorOptions` preset that configures the window correctly. The library is built on a compiled native addon (node-gyp), which means it requires a prebuilt binary compatible with the Electron version in use (34.x). The selective click-through pattern — global click-through with IPC-toggled exception zones for interactive panels — is fully supported via `setIgnoreMouseEvents(true, { forward: true })`.

For the data layer, the Live Client Data API at `https://127.0.0.1:2999/liveclientdata/allgamedata` is confirmed to work for TFT matches. However, the exact shape of the `allPlayers` array in a TFT game is **not well-documented by Riot**. Based on cross-referencing the Overwolf GEP docs and community reports, `allPlayers` contains at minimum: `summonerName`, `championName` (TFT unit name), `level`, `items`, and `isDead`. Per-player HP is likely found in `championStats.currentHealth` / `maxHealth` within each player object. The `activePlayer` endpoint additionally provides `currentGold`. All of this must be validated via a live test in an actual TFT match — the Swagger API at `https://127.0.0.1:2999/swagger/v3/openapi.json` (available only when game is running) is the definitive source.

**Primary recommendation:** Use `electron-overlay-window` for attachment + `setIgnoreMouseEvents(true, { forward: true })` for click-through. Treat the `LiveClientResponse` types as provisional until validated in-game. Build the data layer with Zod for safe runtime validation and fallback to `"?"` for missing fields.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `electron-overlay-window` | 4.0.2 | Native window tracking, sync overlay position/size to game window | Only maintained Electron-native overlay library; does not require Overwolf; STATE.md already lists it as the confirmed choice |
| Electron `BrowserWindow` | 34.x (project) | The overlay window itself | Already in project stack |
| Electron `ipcMain` / `ipcRenderer` | 34.x | Push board state from main to overlay renderer | Established project pattern |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | 3.x (project) | Runtime validation of Live Client API response | Already used in project; critical for unknown TFT fields |
| `axios` | 1.7.x (project) | HTTP polling of `localhost:2999` | Already used in `LiveClientAPI.ts` |
| React 19 | 19.x (project) | Overlay UI rendering | Already the project renderer stack |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `electron-overlay-window` | Manual `BrowserWindow` + polling game window position | `electron-overlay-window` handles fullscreen/windowed transitions natively; manual polling is error-prone and flickers |
| `electron-overlay-window` | Overwolf platform | No Overwolf dependency; confirmed decision in STATE.md |
| `setIgnoreMouseEvents` pattern | No click-through at all | Click-through is a locked decision |

**Installation:**
```bash
npm install electron-overlay-window
```

Note: `electron-overlay-window` includes a prebuilt native addon. If it fails for Electron 34, rebuild with:
```bash
./node_modules/.bin/electron-rebuild -f -w electron-overlay-window
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── main/
│   ├── overlay/
│   │   ├── OverlayWindow.ts      # createOverlayWindow(), lifecycle management
│   │   └── BoardStatePoller.ts   # 1s polling loop, pushes via IPC
│   ├── game/
│   │   ├── GameWatcher.ts        # existing — onGameStart fires overlay creation
│   │   ├── LiveClientAPI.ts      # existing — fetchGameData() reused
│   │   └── types.ts              # expand LiveClientResponse with TFT fields
│   ├── ipc/
│   │   └── handlers.ts           # existing — add board-state-update channel
│   └── startup.ts                # existing — wire GameWatcher → OverlayWindow
├── preload/
│   └── preload.ts                # existing — add onBoardStateUpdate, toggleClickThrough
└── renderer/
    └── overlay/                  # NEW: separate renderer entry for overlay window
        ├── index.html            # overlay entry HTML
        ├── overlay.tsx           # React root for overlay
        └── components/
            ├── PlayerPanel.tsx   # per-player row: name, HP, level, champion icons
            └── ChampionIcon.tsx  # small champion icon with star level
```

### Pattern 1: Overlay Window Creation with electron-overlay-window

**What:** Create a second `BrowserWindow` using `OVERLAY_WINDOW_OPTS`, then call `OverlayController.attachByTitle()` to bind it to the TFT window.

**When to use:** On `GameWatcher.onGameStart` callback.

**Example:**
```typescript
// Source: https://github.com/SnosMe/electron-overlay-window src/index.ts
import { OverlayController, OVERLAY_WINDOW_OPTS } from 'electron-overlay-window';
import { BrowserWindow } from 'electron';
import { join } from 'path';

export function createOverlayWindow(): BrowserWindow {
  const overlayWin = new BrowserWindow({
    ...OVERLAY_WINDOW_OPTS,
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      sandbox: false,
    },
  });

  // OVERLAY_WINDOW_OPTS provides:
  // { fullscreenable: true, skipTaskbar: true, frame: false,
  //   show: false, transparent: true, resizable: true,
  //   hasShadow: false, alwaysOnTop: false (Windows) }

  overlayWin.loadFile(join(__dirname, '../renderer/overlay/index.html'));

  // Attach once — library limitation: only one attachment, window must never be destroyed
  OverlayController.attachByTitle(overlayWin, 'League of Legends (TM) Client');

  OverlayController.events.on('attach', () => {
    overlayWin.show();
  });

  OverlayController.events.on('detach', () => {
    overlayWin.hide();
  });

  OverlayController.events.on('moveresize', ({ x, y, width, height }) => {
    overlayWin.setBounds({ x, y, width, height });
  });

  return overlayWin;
}
```

**Critical constraint:** `attachByTitle` can only be called once in the process lifetime. The overlay `BrowserWindow` must never be closed/recreated — hide it instead.

### Pattern 2: Selective Click-Through with Exception Zones

**What:** Global click-through (`setIgnoreMouseEvents(true, { forward: true })`), toggled to interactive when mouse enters a UI panel element. Uses IPC from preload to main process.

**When to use:** On overlay window creation; always active.

**Example:**
```typescript
// Main process: ipc/handlers.ts addition
// Source: https://www.electronjs.org/docs/latest/tutorial/custom-window-interactions
ipcMain.on('set-ignore-mouse-events', (event, ignore: boolean) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.setIgnoreMouseEvents(ignore, { forward: true });
  }
});
```

```typescript
// Preload: add to contextBridge
toggleClickThrough: (ignore: boolean) =>
  ipcRenderer.send('set-ignore-mouse-events', ignore),
```

```tsx
// React overlay component: PlayerPanel.tsx
function PlayerPanel({ player }: { player: TFTPlayer }) {
  return (
    <div
      onMouseEnter={() => window.api.toggleClickThrough(false)}
      onMouseLeave={() => window.api.toggleClickThrough(true)}
      style={panelStyle}
    >
      {/* content */}
    </div>
  );
}
```

**Known bug (LOW confidence):** Mouse event forwarding may stop after page reload in some Electron versions. If the overlay renderer reloads during development, call `setIgnoreMouseEvents(true, { forward: true })` again on `did-finish-load`.

### Pattern 3: Board State IPC Push (Main → Overlay Renderer)

**What:** `setInterval` in main process polls `fetchGameData()` every 1s during a game; pushes result to overlay window via `overlayWin.webContents.send()`.

**When to use:** Between `onGameStart` and `onGameEnd`.

**Example:**
```typescript
// Source: Established project pattern (startup.ts uses win.webContents.send)
export class BoardStatePoller {
  private intervalId: ReturnType<typeof setInterval> | null = null;

  start(overlayWin: BrowserWindow): void {
    this.intervalId = setInterval(async () => {
      const data = await fetchGameData();
      if (data && !overlayWin.isDestroyed()) {
        const board = parseBoardState(data);
        overlayWin.webContents.send('board-state-update', board);
      }
    }, 1000);
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
```

**On `onGameEnd`:** Call `poller.stop()` but do NOT clear the last board state from the overlay — it stays visible for post-game review (locked decision).

### Pattern 4: Second Renderer Entry Point

**What:** The overlay window needs its own HTML entry point and React root — separate from the main window's `index.html`.

**When to use:** Because the overlay is a different `BrowserWindow` with different content, it cannot reuse the main window's `index.html`.

**electron-vite configuration addition:**
```typescript
// electron.vite.config.ts — add overlay renderer entry
renderer: {
  // existing main renderer config...
  input: {
    main: resolve('src/renderer/index.html'),
    overlay: resolve('src/renderer/overlay/index.html'),
  }
}
```

### Anti-Patterns to Avoid

- **Destroying and recreating the overlay BrowserWindow:** `electron-overlay-window` only allows one `attachByTitle` call. Hide/show instead of close/create.
- **Sending IPC board state to the main window instead of overlay window:** The main window shows the waiting screen; the overlay window shows board data. They are separate windows with separate preloads.
- **Polling at 1s in GameWatcher:** GameWatcher keeps its 3s lifecycle polling. A separate `BoardStatePoller` handles 1s board data polling — they are independent loops.
- **Setting `alwaysOnTop` manually on Windows:** `electron-overlay-window` manages this via the native addon. Do not call `win.setAlwaysOnTop(true)` directly as it may conflict.
- **Using `transparent: true` without `frame: false`:** Without `frame: false`, transparency may not work correctly on Windows.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tracking game window position/size as it moves | Custom window polling loop using `screen` API | `electron-overlay-window` `moveresize` event | Native hooks are more reliable; handles fullscreen transitions, DPI scaling, window minimize |
| Selective click-through regions | CSS `pointer-events: none` on the window | `setIgnoreMouseEvents(true, { forward: true })` + IPC toggle | CSS `pointer-events` only affects Chromium hit testing; the OS-level window still captures clicks. Must use the Electron API |
| Overlay window prebuilt options | Custom `BrowserWindowConstructorOptions` | `OVERLAY_WINDOW_OPTS` from `electron-overlay-window` | The preset includes the exact combination of flags (`hasShadow: false`, `frame: false`, `transparent: true`, `fullscreenable: true`) needed for a correct overlay |

**Key insight:** OS-level click-through is fundamentally different from CSS-level pointer events. You must use Electron's `setIgnoreMouseEvents()` for true OS-level pass-through.

---

## Common Pitfalls

### Pitfall 1: electron-overlay-window Native Addon Compatibility

**What goes wrong:** `Error: The module was compiled against a different Node.js version` or similar when loading the native addon.

**Why it happens:** `electron-overlay-window` ships a prebuilt binary for specific Electron versions. If the prebuilt doesn't match Electron 34.x, it fails silently or throws on import.

**How to avoid:** After `npm install`, run `./node_modules/.bin/electron-rebuild -f -w electron-overlay-window`. Check that `electron-rebuild` is installed as a devDependency.

**Warning signs:** `NODE_MODULE_VERSION` mismatch error in main process logs at startup.

### Pitfall 2: TFT Window Title Mismatch

**What goes wrong:** `attachByTitle()` never fires the `attach` event; overlay stays hidden.

**Why it happens:** The exact window title string for TFT must match what Windows reports. The string is typically `"League of Legends (TM) Client"` but may vary.

**How to avoid:** Log `OverlayController.events.on('attach', ...)` to verify attachment during testing. Confirm the title by checking Windows Task Manager > Details tab > Description while TFT is running.

**Warning signs:** `attach` event never fires; overlay never shows.

### Pitfall 3: Live Client API TFT Field Uncertainty

**What goes wrong:** Board state parser crashes or returns empty data because `allPlayers` in a TFT match has different fields than documented LoL examples.

**Why it happens:** Riot does not document TFT-specific fields in the Live Client Data API. The actual field names for HP, items, and unit info in TFT mode are only known from community testing.

**How to avoid:** Use Zod's `.passthrough()` or `.optional()` for all TFT-specific fields during Phase 2. Log the raw API response in the first few polling ticks during development to capture the actual schema. Access the Swagger spec at `https://127.0.0.1:2999/swagger/v3/openapi.json` (only available while a game is running) to get the canonical schema.

**Warning signs:** `board.players` is empty; "?" indicators for all players.

### Pitfall 4: Overlay Window Appears Behind Game Fullscreen

**What goes wrong:** The overlay is created but invisible because TFT is in fullscreen mode and the overlay appears behind it.

**Why it happens:** On Windows, standard `alwaysOnTop` doesn't penetrate exclusive fullscreen. `electron-overlay-window` uses native Windows APIs that handle this correctly, but only if TFT runs in **Windowed Fullscreen** (borderless window), not **Exclusive Fullscreen**.

**How to avoid:** Document in user-facing notes that TFT must be set to Windowed Fullscreen mode. This is the standard requirement for all non-Overwolf TFT overlays.

**Warning signs:** App shows "game detected" but overlay is not visible.

### Pitfall 5: IPC Channel Name Collision

**What goes wrong:** Board state updates intended for the overlay renderer are received by the main window renderer, or vice versa.

**Why it happens:** `win.webContents.send()` sends to a specific window, but if the preload is shared across both windows and both listen on the same channel, the wrong window reacts.

**How to avoid:** Either use separate preload scripts for each window, or add a window-type discriminator. The simplest approach: only register `onBoardStateUpdate` in the overlay preload, and only register `onStartupStatus`, `onGameStarted`, `onGameEnded` in the main window preload.

**Warning signs:** Main waiting screen updates with board data, or overlay never receives updates.

### Pitfall 6: `setIgnoreMouseEvents` Forwarding Lost After Renderer Reload

**What goes wrong:** After a hot reload in dev mode, click-through forwarding stops working and panels no longer receive hover events.

**Why it happens:** The `forward: true` state is set on the window, but after renderer reload the window defaults back to `setIgnoreMouseEvents(false)` or the overlay loses the `mouseleave` event that would re-enable click-through.

**How to avoid:** In the overlay renderer's React root, call `window.api.toggleClickThrough(true)` inside a `useEffect` that runs once on mount to set the initial click-through state.

---

## Code Examples

### Expanding LiveClientResponse for TFT (provisional)

```typescript
// Source: Inferred from Overwolf GEP docs + LoL Live Client sample
// IMPORTANT: These field names are provisional — validate against live game Swagger

export interface TFTPlayer {
  summonerName: string;
  championName: string;       // TFT unit name e.g. "TFT_Tristana" (may vary)
  level: number;              // champion star level (1/2/3)
  isDead: boolean;
  items: TFTItem[];
  championStats?: {
    currentHealth: number;
    maxHealth: number;
    [key: string]: unknown;
  };
  scores?: {
    kills: number;            // in TFT: placement round wins?
    [key: string]: unknown;
  };
  [key: string]: unknown;     // passthrough for unknown TFT fields
}

export interface TFTItem {
  displayName: string;
  itemID: number;
  rawDescriptionKey?: string;
  rawDisplayNameKey?: string;
  [key: string]: unknown;
}

export interface LiveClientResponse {
  gameData: {
    gameMode: string;         // "TFT" for TFT games
    gameTime: number;
    [key: string]: unknown;
  };
  allPlayers: TFTPlayer[];
  activePlayer: {
    summonerName?: string;
    currentGold?: number;
    level?: number;
    championStats?: {
      currentHealth: number;
      maxHealth: number;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
}
```

### Zod Schema for Safe Parsing

```typescript
// Source: Project pattern from types.ts + Zod 3.x docs
import { z } from 'zod';

const TFTItemSchema = z.object({
  displayName: z.string(),
  itemID: z.number(),
}).passthrough();

const TFTPlayerSchema = z.object({
  summonerName: z.string(),
  championName: z.string().default(''),
  level: z.number().default(1),
  isDead: z.boolean().default(false),
  items: z.array(TFTItemSchema).default([]),
  championStats: z.object({
    currentHealth: z.number(),
    maxHealth: z.number(),
  }).passthrough().optional(),
}).passthrough();

const LiveClientResponseSchema = z.object({
  gameData: z.object({
    gameMode: z.string(),
    gameTime: z.number(),
  }).passthrough(),
  allPlayers: z.array(TFTPlayerSchema).default([]),
  activePlayer: z.object({
    currentGold: z.number().optional(),
    level: z.number().optional(),
    championStats: z.object({
      currentHealth: z.number(),
      maxHealth: z.number(),
    }).passthrough().optional(),
  }).passthrough(),
});
```

### CSS Drop Shadow for Floating Text

```typescript
// Floating text legibility without background panel
const floatingTextStyle: React.CSSProperties = {
  color: '#ffffff',
  textShadow: '0px 1px 3px rgba(0,0,0,0.9), 0px 0px 6px rgba(0,0,0,0.7)',
  fontFamily: '"Segoe UI", Arial, sans-serif',
  fontSize: '12px',
  fontWeight: 600,
  letterSpacing: '0.02em',
};

const championIconStyle: React.CSSProperties = {
  width: '22px',
  height: '22px',
  filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.8))',
  borderRadius: '3px',
};
```

### Board State Parsing for Overlay

```typescript
// Transforms raw LiveClientResponse into display model
export interface DisplayPlayer {
  summonerName: string;
  hp: number;
  maxHp: number;
  level: number;
  champions: string[];    // champion names for icon display
  isEliminated: boolean;
}

export function parseBoardState(data: LiveClientResponse): DisplayPlayer[] {
  const players = data.allPlayers
    .map((p) => ({
      summonerName: p.summonerName,
      hp: p.championStats?.currentHealth ?? 0,
      maxHp: p.championStats?.maxHealth ?? 100,
      level: p.level ?? 1,
      champions: p.items.map((i) => i.displayName), // items as proxy if no separate unit list
      isEliminated: p.isDead || (p.championStats?.currentHealth ?? 1) <= 0,
    }))
    .filter((p) => !p.isEliminated)
    .sort((a, b) => b.hp - a.hp);

  return players;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Polling game window position manually | `electron-overlay-window` lifecycle events | ~2020 | No flicker on window move; handles fullscreen transitions |
| Global `setIgnoreMouseEvents(true)` (all-or-nothing) | `setIgnoreMouseEvents(true, { forward: true })` + IPC toggle per region | Electron 3+ | Selective interaction zones within click-through overlay |
| Separate preload per window | Shared preload with window-type check | Electron 20+ | Simpler build; but collision risk if not careful |

**Deprecated/outdated:**
- `gelectron`/`goverlay`: DirectX injection approach — unmaintained, risky, no longer needed with `electron-overlay-window`
- `setAlwaysOnTop('screen-saver')`: Aggressive always-on-top level that caused issues with system UI; normal level works for game overlays

---

## Open Questions

1. **Exact TFT allPlayers field names**
   - What we know: `summonerName`, `isDead`, `items` (array of item objects), `level` are confirmed in LoL; `championStats.currentHealth/maxHealth` available in activePlayer; TFT community reports similar fields exist
   - What's unclear: Whether `championStats` is present per-player in TFT's `allPlayers` array (it may only be in `activePlayer`); whether champion unit names in `allPlayers.championName` use `TFT_` prefix format; whether HP per opponent is available at all
   - Recommendation: Build the parser with `.optional()` and `"?"` fallbacks everywhere. Log the raw response in the first real-game test. Access `https://127.0.0.1:2999/swagger/v3/openapi.json` during a live game to get the canonical schema.

2. **TFT window title for attachByTitle**
   - What we know: The function requires an exact match of the OS window title
   - What's unclear: The exact string Windows reports for the TFT client — it may differ between borderless and windowed modes
   - Recommendation: Add a dev-mode helper that enumerates open windows and logs their titles on startup, to confirm the correct string before hardcoding it.

3. **electron-overlay-window prebuilt for Electron 34**
   - What we know: The package was last published ~19 days before research date (v4.0.2); Electron 34 is current project version
   - What's unclear: Whether a prebuilt binary for Electron 34 is available in the package or requires local rebuild
   - Recommendation: After `npm install`, immediately test that the native addon loads. Add `electron-rebuild` as a devDependency and run it as a post-install step if needed.

4. **Overlay renderer as separate entry vs shared renderer**
   - What we know: electron-vite supports multiple renderer entries via `input` object in config
   - What's unclear: Whether the overlay should share the same React bundle (different route) or be a completely separate HTML/JS entry point
   - Recommendation: Separate entry (`overlay/index.html`) is cleaner because it avoids loading the main app state machine in the overlay context. Shared preload is fine as long as channel names are scoped.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.x |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npx vitest run src/main/overlay` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-04 | `parseBoardState()` maps allPlayers to DisplayPlayer[] sorted by HP | unit | `npx vitest run src/main/overlay/BoardStatePoller.test.ts` | Wave 0 |
| DATA-04 | Eliminated players (HP = 0 or isDead) are filtered out | unit | `npx vitest run src/main/overlay/BoardStatePoller.test.ts` | Wave 0 |
| DATA-04 | Players sorted by HP descending | unit | `npx vitest run src/main/overlay/BoardStatePoller.test.ts` | Wave 0 |
| DATA-04 | Missing championStats fields fall back to "?" / safe defaults | unit | `npx vitest run src/main/overlay/BoardStatePoller.test.ts` | Wave 0 |
| OVER-01 | `createOverlayWindow()` creates BrowserWindow with transparent, frame:false, fullscreenable | unit | `npx vitest run src/main/overlay/OverlayWindow.test.ts` | Wave 0 |
| OVER-01 | IPC `set-ignore-mouse-events` handler registers and calls setIgnoreMouseEvents | unit | `npx vitest run src/main/overlay/OverlayWindow.test.ts` | Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run src/main/overlay`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/main/overlay/BoardStatePoller.test.ts` — covers DATA-04 parsing and filtering
- [ ] `src/main/overlay/OverlayWindow.test.ts` — covers OVER-01 window creation and IPC handler
- [ ] `src/renderer/overlay/index.html` — overlay entry HTML (not a test, but required for electron-vite)

---

## Sources

### Primary (HIGH confidence)
- `electron-overlay-window` GitHub source (`SnosMe/electron-overlay-window`) — API methods (`attachByTitle`, `OverlayController`, `OVERLAY_WINDOW_OPTS`), events (`attach`, `detach`, `moveresize`, `focus`, `blur`, `fullscreen`), native module dependency
- [Electron docs — Custom Window Interactions](https://www.electronjs.org/docs/latest/tutorial/custom-window-interactions) — `setIgnoreMouseEvents(ignore, { forward: true })` selective click-through pattern with IPC toggle; official code example
- [Electron docs — BrowserWindow API](https://www.electronjs.org/docs/latest/api/browser-window) — `transparent`, `frame`, `alwaysOnTop`, `hasShadow`, `setFocusable`, `setContentProtection` options
- Existing project source code (`GameWatcher.ts`, `LiveClientAPI.ts`, `types.ts`, `startup.ts`) — confirmed patterns for IPC push, polling loop, axios fetch

### Secondary (MEDIUM confidence)
- [Overwolf GEP TFT docs](https://dev.overwolf.com/ow-native/reference/live-game-data-gep/supported-games/teamfight-tactics/) — TFT data model: `all_players` contains `summonerName`, `championName`, `items`; `roster` provides player health/rank for all 8 players; `board_pieces` is local-player-only. Field names differ from Riot's own Live Client API but confirm data structure.
- [Riot developer-relations issue #373](https://github.com/RiotGames/developer-relations/issues/373) — Confirms Live Client Data API for TFT provides "recycled LoL JSON" with limited TFT fields; request open since 2020

### Tertiary (LOW confidence — requires in-game validation)
- Community reports and Overwolf docs suggest `allPlayers[n].championStats.currentHealth` is available in TFT matches — NOT confirmed by official Riot documentation
- TFT window title string `"League of Legends (TM) Client"` — commonly reported but not officially documented; needs hands-on confirmation

---

## Metadata

**Confidence breakdown:**
- Standard stack (electron-overlay-window, IPC patterns): HIGH — confirmed in source code, official Electron docs
- Architecture patterns (overlay creation, click-through, IPC push): HIGH — based on official Electron docs and library source
- Live Client API TFT field schema: LOW — not officially documented; provisional types based on LoL sample + Overwolf GEP cross-reference
- Common pitfalls (window title, native addon, fullscreen): MEDIUM — community-confirmed but not all independently verified

**Research date:** 2026-03-12
**Valid until:** 2026-04-12 (stable Electron API; `electron-overlay-window` actively maintained)

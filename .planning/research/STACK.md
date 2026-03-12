# Stack Research

**Domain:** TFT (Teamfight Tactics) desktop overlay app
**Researched:** 2026-03-12
**Confidence:** MEDIUM — Overwolf GEP data confirmed HIGH, Riot policy nuances MEDIUM (official pages 403'd), meta build API access LOW (no public APIs found)

## CRITICAL: Riot Policy Constraint

Before reviewing the stack, understand this hard constraint discovered during research:

**Riot Games policy explicitly prohibits showing other players' board data during a live game.**

> "Apps and overlays during gameplay may not track your opponent's champions/plays or predict their next plays. This includes aggregate stats for both individual players and the lobby."

The PROJECT.md requirement "Mostrar comps, level e HP de todos os jogadores" (show all players' comps, level, HP) **violates Riot's Third Party Application Policy**. Showing scouting data (opponent boards/units) is explicitly listed as banned. Violating this risks account bans for users and API key revocation.

**What IS allowed during a live game:**
- Your own board, bench, items, gold, XP, HP
- Static meta data loaded before the game starts (item cheat sheets, comp guides)
- Aggregate stats not tied to specific players
- Post-game analysis

**Implication for roadmap:** The "show all players' comps" feature must be redesigned to show only the local player's board + static meta recommendations. The architecture pivots from scouting tool to personal decision-support tool.

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Electron | 34.x (LTS-stable) | Desktop app shell | Stable, widely used, large ecosystem; latest is 41.x but 34.x is more battle-tested for overlays. Use `electron-vite` scaffold. |
| React | 19.x | UI rendering | Component model fits overlay panels; large ecosystem; all TFT overlay devs (MetaTFT, OP.GG) use web tech stack |
| TypeScript | 5.x | Type safety | Catches API shape mismatches early — critical when working with Riot API JSON responses |
| electron-vite | 2.x | Build tooling | Purpose-built Electron + Vite integration, replaces CRA/webpack; fast HMR during dev |
| Tailwind CSS | 4.x | Styling | Utility-first makes overlay layouts fast to build; no runtime overhead |

### Overlay Windowing

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| electron-overlay-window | 4.0.2 | Attach overlay to game window | Purpose-built for attaching Electron windows to a target game window by title; handles show/hide and position sync automatically. Actively maintained (last update 19 days ago as of research date). |

**Configuration for overlay window:**
```typescript
// Main process — create window that follows the TFT client
import { OverlayWindow } from 'electron-overlay-window';
const win = new BrowserWindow({
  transparent: true,
  frame: false,
  alwaysOnTop: true,
  skipTaskbar: true,
  webPreferences: { nodeIntegration: false, contextIsolation: true }
});
OverlayWindow.attachTo(win, 'Teamfight Tactics'); // window title
```

**Warning:** Pure Electron `alwaysOnTop` does NOT work reliably over OpenGL/Vulkan/DirectX fullscreen windows. `electron-overlay-window` solves this by hooking the target window. Do NOT use raw `alwaysOnTop` alone.

### Riot API Integration

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Riot Live Client Data API | — | Real-time in-game data (your board) | Local HTTP endpoint `https://127.0.0.1:2999/liveclientdata/allgamedata` — no API key needed, runs on player's machine, zero rate limit concerns |
| Riot Games REST API | v4 | Match history, summoner data, ranked info | Requires API key; needed for pre-game context (player's rank, recent comps played) |
| axios | 1.x | HTTP client for Riot API calls | Standard, interceptor support for rate limiting |
| bottleneck | 2.x | Rate limiter/queue | Riot dev keys: 20 req/sec, 100 req/2min. Bottleneck wraps calls with configurable leaky bucket — prevents 429s |

**Live Client Data API — TFT available fields (via `https://127.0.0.1:2999/liveclientdata/allgamedata`):**
- Active player: summoner name, HP, XP, gold, rank in lobby
- All players list: names, HP, XP, rank, gold (basic scoreboard only)
- Events: round start/end, game mode

**Critical gap:** The Live Client Data API provides very limited TFT data. It does NOT expose opponent boards, bench units, items equipped, or augments via this endpoint. The Overwolf GEP (Game Events Provider) exposes richer data (board, bench, store, carousel, augments) but requires the Overwolf platform.

### Static Game Data

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| CommunityDragon CDN | latest | TFT champions, traits, items, augments JSON | More complete than Data Dragon for TFT. Available at `https://raw.communitydragon.org/latest/cdragon/tft/en_us.json` — 20+ MB comprehensive JSON, updated every patch. No API key needed. |
| Data Dragon (Riot CDN) | via version endpoint | Item/champion images and localized names | `https://ddragon.leagueoflegends.com/cdn/{version}/data/en_US/tft-champion.json` — official but less complete than CommunityDragon for TFT-specific data |

**Meta build data — No public APIs available.** Mobalytics, MetaTFT, tactics.tools, and TFTactics do NOT offer public APIs. Options:
1. Build a lightweight scraper that runs on a schedule (weekly or per-patch) — store results locally. The inusha.dev developer confirmed this "offline-first" pattern is the correct approach.
2. Use Riot's own match history API to compute winrates from challenger/grandmaster match data yourself (data-intensive but 100% legitimate).
3. Pull community-curated JSON from projects like `github.com/ngocleek/tft-assets` (updated daily).

**Recommended:** Scheduled scraper (Node.js + cheerio or playwright headless) that fetches meta comp data from MetaTFT/tactics.tools at app startup if data is stale (> 24 hours old). Cache locally in user's app data directory.

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| cheerio | 1.x | HTML scraper for meta build sites | Parsing MetaTFT/tactics.tools HTML to extract comp tier data |
| node-cron | 3.x | Schedule data refresh | Trigger meta data re-fetch on timer or patch version change |
| zustand | 5.x | Client-side state management | Simple, no boilerplate; manages live game state (current board, recommendations) without Redux complexity |
| electron-store | 10.x | Persistent settings and cached data | Saves scraped meta data, user preferences, API key — persists across app restarts |
| react-query (TanStack Query) | 5.x | API data fetching/caching in renderer | Manages Riot API calls from renderer; handles stale data, refetch intervals for live game polling |
| zod | 3.x | Runtime type validation | Validate Riot API responses and scraped data shapes — Riot API can return unexpected shapes between sets |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| electron-vite | Build and dev server | `npm create @quick-start/electron` scaffolds React+TS+electron-vite |
| electron-builder | Package and distribute | Produces Windows installer (.exe / NSIS); configure `nsis.oneClick: false` for user choice of install dir |
| Vitest | Unit testing | Runs in same Vite pipeline; use for testing recommendation logic, rate limiter behavior |
| Playwright | E2E testing | Can drive Electron apps; use for smoke-testing overlay window behavior |

---

## Installation

```bash
# Scaffold project
npm create @quick-start/electron tft-helper -- --template react-ts

# Overlay window management
npm install electron-overlay-window

# HTTP and rate limiting
npm install axios bottleneck

# State management
npm install zustand @tanstack/react-query

# Data persistence and validation
npm install electron-store zod

# Scraping (for meta data)
npm install cheerio node-cron

# Styling
npm install tailwindcss @tailwindcss/vite

# Dev dependencies
npm install -D vitest @playwright/test electron-builder
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Pure Electron + `electron-overlay-window` | Overwolf Native platform | If you want Riot-approved GEP events (board data, augments, shop) with guaranteed anti-cheat safety and built-in overlay infrastructure. Requires distributing through Overwolf's store. Overwolf Electron is a middle path — Electron DX + Overwolf GEP events. |
| Overwolf Native | Overwolf Electron | Only if you want the lightest possible distribution size and don't need Node.js modules. CEF-based. |
| CommunityDragon for static data | Data Dragon only | Data Dragon is more official but less complete for TFT. Use both: Data Dragon for images (stable CDN), CommunityDragon for data files (more complete). |
| bottleneck for rate limiting | axios-rate-limit | `axios-rate-limit` is simpler but only supports fixed-window. `bottleneck` supports leaky bucket (better for Riot's sliding window limits). |
| zustand | Redux Toolkit | Redux adds significant boilerplate for an overlay app. Zustand achieves same result in < 5% of the code. |
| React | Vue 3 / Svelte | Vue/Svelte are fine alternatives. React is chosen because MetaTFT, Blitz, and other TFT tools all use React — more community examples for this specific use case. |
| cheerio scraper | playwright headless | playwright catches JS-rendered content but is heavier (Chromium dependency). Start with cheerio; switch to playwright if MetaTFT renders client-side. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Raw Electron `alwaysOnTop: true` alone | Does NOT stay on top of OpenGL/DirectX/Vulkan fullscreen windows — known unresolved Electron bug (issues #8530, #28439). Game runs in DirectX. | `electron-overlay-window` which uses platform hooks to attach to target window |
| Memory reading / process injection | Triggers Vanguard (Riot's anti-cheat). Will cause bans. Some GitHub repos demonstrate this (TFT-Best-Overlay-2025) — these are bannable. | Riot Live Client API + Overwolf GEP for legitimate data access |
| `app.disableHardwareAcceleration()` for click-through transparency | Broken in recent Electron versions (nightly 2025 regression, issue #48064). Fragile approach. | `setIgnoreMouseEvents(true, { forward: true })` on specific overlay regions |
| Scraping augment winrates for in-game display | Riot policy explicitly bans showing augment win rates during gameplay ("Augment Win rates" listed as prohibited). | Show augment descriptions (static data only) during game; show stats in post-game analysis |
| Showing opponent board compositions during live game | Explicit Riot policy violation. Classified as "scouting." Causes user bans and API key revocation. | Show only the local player's board + static comp guides |
| riotwatcher (Python) | This project should be TypeScript/Node.js for the Electron main process. Python wrapper is only relevant if building a separate backend service. | Direct axios calls or a TypeScript Riot API library |

---

## Stack Patterns by Variant

**If going pure Electron (no Overwolf):**
- Live data limited to: Riot Live Client Data API (basic scoreboard) + polling match data
- Overlay attachment via `electron-overlay-window`
- Data richness: LOW (no board contents, no shop, no augment events)
- Approval needed: No (personal use)
- Anti-cheat risk: Low if not reading process memory

**If going Overwolf Electron (recommended for richer data):**
- Live data: Full GEP events (board, bench, store, carousel, round events)
- Overlay: Overwolf handles overlay injection natively
- Data richness: HIGH (all in-game state)
- Approval needed: YES — must apply to Overwolf + get Riot approval for distribution
- Anti-cheat risk: None (Overwolf is explicitly whitelisted)
- Constraint: Cannot show augment winrates, cannot show opponent boards (same Riot policy)

**If MVP personal-use tool only:**
- Use pure Electron + Live Client Data API
- Skip Overwolf entirely (faster to ship, no approval process)
- Accept data limitations: scoreboard HP/XP visible, board contents NOT available
- Supplement with static meta data loaded from CommunityDragon

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| electron@34.x | electron-vite@2.x | Stable pairing. Latest Electron is 41.x but changes are rapid; 34 is safer for overlay tooling |
| electron-overlay-window@4.0.2 | Electron 30+ | Confirmed working; check native module rebuild requirement (`electron-rebuild`) |
| @tanstack/react-query@5.x | React 19.x | TanStack Query v5 supports React 19 concurrent features |
| tailwindcss@4.x | Vite 6.x | Tailwind 4 uses a Vite plugin, not postcss config — different from v3 setup |
| zustand@5.x | React 19.x | Zustand 5 is React 18+ compatible; no Redux-like provider needed |
| electron-store@10.x | Electron 30+ | Uses ES modules. Requires `"type": "module"` or dynamic import in CJS main process |

---

## Data Architecture Summary

```
Game Running
    │
    ├─► Riot Live Client API (localhost:2999)
    │   └─ Poll every 2-5s for: HP, XP, gold, round, basic scoreboard
    │
    ├─► CommunityDragon (en_us.json, loaded once at startup)
    │   └─ Champions, traits, items, augments — static for current patch
    │
    └─► Meta scraper (cheerio, run at startup if cache > 24h old)
        └─ Tier list data from MetaTFT/tactics.tools, stored in electron-store

All data → Zustand store → React overlay components
```

---

## Sources

- [Overwolf TFT Game Events](https://dev.overwolf.com/ow-native/live-game-data-gep/supported-games/teamfight-tactics/) — GEP events list (HIGH confidence)
- [Riot TFT Developer Portal](https://developer.riotgames.com/docs/tft) — API endpoints and policy (HIGH confidence)
- [Riot Compliance Guide via Overwolf](https://dev.overwolf.com/ow-native/guides/game-compliance/riot-games/) — What's banned (MEDIUM confidence, page partially loaded)
- [electron-overlay-window on npm](https://www.npmjs.com/package/electron-overlay-window) — version 4.0.2, actively maintained (HIGH confidence)
- [CommunityDragon CDN](https://raw.communitydragon.org/latest/cdragon/tft/) — 27 locale JSON files, updated 2026-03-11 (HIGH confidence)
- [Overwolf Framework Comparison](https://dev.overwolf.com/ow-native/getting-started/onboarding-resources/framework-overview/) — Native vs Electron (MEDIUM confidence)
- [inusha.dev TFT Overlay blog](https://inusha.dev/blog/tft_tactical_overlay) — Real-world build experience, offline-first data pattern (MEDIUM confidence)
- [Electron Releases](https://releases.electronjs.org/release) — Latest stable: 41.0.1 as of 2026-03-12 (HIGH confidence)
- [Riot API Rate Limits](https://hextechdocs.dev/rate-limiting/) — Dev key: 20 req/sec, 100 req/2min (MEDIUM confidence)
- Electron GitHub Issues #8530, #28439, #48064 — Overlay transparency/alwaysOnTop bugs (HIGH confidence for bugs)

---
*Stack research for: TFT Helper desktop overlay app*
*Researched: 2026-03-12*

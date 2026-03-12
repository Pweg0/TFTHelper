# Phase 1: Data Pipeline - Research

**Researched:** 2026-03-12
**Domain:** Electron main process data layer — Riot Live Client API polling, CommunityDragon static data, meta build scraping, patch-versioned JSON caching
**Confidence:** HIGH for CommunityDragon and Live Client API; MEDIUM for tactics.tools scraping (site structure confirmed, but Cloudflare/rate-limit risk); LOW for MetaTFT (pure SPA, requires Playwright)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Claude chooses the best site to scrape (MetaTFT, tactics.tools, or other) based on scraping feasibility
- Extract ALL available data: comps, winrates, pickrates, augment tiers, item priorities, positioning
- Scrape runs once at app startup, not during gameplay
- Re-scrape when a new patch is detected (compare patch version)
- Splash screen simple during startup loading (no detailed progress bar)
- Auto-detect player's server region from Riot API
- Auto-detect client language and fetch CommunityDragon data in matching locale
- Store cached data as JSON files
- Cache location: AppData do usuário (Electron default: AppData/Roaming/tft-helper)
- Cache invalidation: compare patch version from CommunityDragon on startup; if version changed, re-download everything
- No manual cache clearing — cache is self-managed
- Keep historical set data (don't delete when set changes)
- User opens the app manually (no auto-start with Windows)
- When no game is active: show waiting screen ("Aguardando partida de TFT...")
- Detect ALL TFT game modes (Normal, Ranked, Hyper Roll, Double Up)
- Poll Live Client API (localhost:2999) to detect game start/end
- Strong TypeScript typing from day one: interfaces for Champion, Item, Trait, Augment, MetaComp
- Download and cache champion/item/trait sprites and icons from CommunityDragon (not just text data)
- Store only current set data actively, but preserve historical set data in separate folders

### Claude's Discretion
- Which meta build site to scrape (based on feasibility research)
- Scraper fallback strategy when site layout changes
- Polling interval for Live Client API
- Internal data model structure and relationships
- Exact splash screen design

### Deferred Ideas (OUT OF SCOPE)
- Compilação como .exe — Phase 5 (distribution), but electron-builder tooling should be configured early
- Settings screen for manual cache clear — not needed per user decision
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DATA-01 | App connects with Riot Live Client API to detect an active TFT game | Live Client API on port 2999 confirmed; gameMode="TFT" detection strategy documented; poll interval and error handling patterns included |
| DATA-02 | App downloads and caches static champion, trait, item and augment data via CommunityDragon | CommunityDragon locale JSON structure confirmed; 27 locales available; patch version check via DDragon versions endpoint documented; plain fs cache (not electron-store) required at 21MB |
| DATA-03 | App collects and caches meta builds (comps, winrates) from sites like MetaTFT/Mobalytics at startup | tactics.tools confirmed as SSR Next.js with JSON pre-rendered in HTML — cheerio can extract __PROPS__ JSON without JavaScript; MetaTFT confirmed as pure SPA (not suitable for cheerio); recommendation: tactics.tools as primary, Playwright fallback |
</phase_requirements>

---

## Summary

Phase 1 establishes the entire data foundation the overlay will run on. There are three distinct subsystems to build: (1) a polling loop that detects whether a TFT game is active on `localhost:2999`, (2) a CommunityDragon downloader that fetches the locale-matched 21MB static data JSON once per patch, and (3) a meta build scraper that extracts comp and winrate data from a third-party site at startup.

The most important discovery for this phase: **electron-store is not suitable for the CommunityDragon data**. At 21MB, electron-store reads and writes the entire JSON file on every change — it is documented as "best suited for small data like user settings." Static game data should be written to plain JSON files on disk via `node:fs`, organized in the AppData folder. electron-store is appropriate only for small config values: current patch version string, user region, user locale, and meta cache timestamps.

The meta build scraper research reveals that **tactics.tools is the correct target, not MetaTFT**. MetaTFT is a pure client-side SPA that returns an empty HTML shell requiring JavaScript execution — cheerio cannot extract data from it. tactics.tools uses Next.js with server-side rendering, embedding a full `__PROPS__` JSON payload in the raw HTML at page load. cheerio can parse this without a browser. This is the decisive factor.

**Primary recommendation:** Use `node:fs` for all large JSON caches. Use tactics.tools + cheerio for meta scraping. Poll `https://127.0.0.1:2999/liveclientdata/allgamedata` every 3 seconds and check `gameData.gameMode === "TFT"` for game detection.

---

## Standard Stack

### Core (Phase 1 Only)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| node:fs (built-in) | Node 20+ | Write/read large JSON cache files to disk | electron-store explicitly unsuitable for 21MB files; plain fs gives full control over file location and structure |
| axios | 1.x | HTTP client for CommunityDragon downloads and scraping | Handles redirects, streaming, timeouts; `rejectUnauthorized: false` needed for Live Client API self-signed cert |
| cheerio | 1.x | Parse tactics.tools HTML and extract `__PROPS__` JSON | Server-side HTML parsing, no JavaScript execution required; tactics.tools pre-renders data in HTML |
| zod | 3.x | Runtime validation of all external data shapes | CommunityDragon JSON and scraped meta data can change shape between sets/patches; catch at boundary |
| electron-store | 10.x | Config-only: patch version, user locale, region, scrape timestamps | Appropriate for small config; NOT for game data JSON; ESM-only in v10 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| electron-vite | 2.x | Build tooling — already required for project scaffold | Used from day one of project setup |
| node:path + node:os | built-in | Construct AppData paths cross-platform | `app.getPath('userData')` in Electron gives the correct AppData/Roaming path |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| tactics.tools + cheerio | MetaTFT + Playwright | MetaTFT is a pure SPA — Playwright adds ~170MB Chromium dependency and longer startup time; tactics.tools SSR makes cheerio sufficient |
| node:fs for large JSON | electron-store for everything | electron-store reads/writes the full file on every change — completely unacceptable at 21MB |
| axios | node:fetch (built-in) | axios provides cleaner interceptor patterns and timeout handling; either works, axios is more ergonomic |
| CommunityDragon only | Data Dragon (Riot official) | Data Dragon TFT coverage is incomplete; CommunityDragon has richer TFT-specific fields and all 27 locales in a single file |

**Installation (Phase 1 dependencies only):**
```bash
npm install axios cheerio zod electron-store
# node:fs, node:path, node:os are Node.js built-ins — no install needed
```

---

## Architecture Patterns

### Recommended Project Structure (Phase 1 scope)
```
src/
├── main/
│   ├── index.ts                  # Electron entry — app startup orchestration
│   ├── game/
│   │   ├── GameWatcher.ts        # Polling loop, game detection, lifecycle events
│   │   ├── LiveClientAPI.ts      # Wraps https://127.0.0.1:2999 requests
│   │   └── types.ts              # GameState, LiveClientResponse interfaces
│   ├── data/
│   │   ├── CommunityDragonFetcher.ts  # Downloads locale JSON from CDN
│   │   ├── MetaScraper.ts             # tactics.tools cheerio scraper
│   │   ├── DataCache.ts               # Reads/writes JSON files in AppData
│   │   ├── PatchVersionChecker.ts     # Compares DDragon version vs cached version
│   │   └── types.ts                   # Champion, Trait, Item, Augment, MetaComp interfaces
│   └── ipc/
│       └── handlers.ts           # ipcMain.handle registrations for Phase 1 data
├── preload/
│   └── preload.ts                # contextBridge for renderer access to Phase 1 data
└── renderer/
    └── SplashScreen.tsx          # Simple loading screen shown during startup
```

AppData folder structure (managed by Phase 1):
```
AppData/Roaming/tft-helper/
├── config.json                   # electron-store: patch version, locale, region
├── static/
│   ├── set16/
│   │   └── en_us.json            # CommunityDragon full locale data (~21MB)
│   ├── set15/                    # Historical set preserved (not deleted)
│   └── images/                   # Cached champion/item/trait icons
└── meta/
    └── meta_cache.json           # Scraped tactics.tools data with fetchedAt timestamp
```

### Pattern 1: Startup Sequence with Patch Version Gate

**What:** On every app startup, check current DDragon patch version before doing anything else. If the cached version differs from live, invalidate and re-download all static data and meta cache. Then start the game polling loop.

**When to use:** Always — this is the root of cache invalidation for the entire app.

**Example:**
```typescript
// src/main/data/PatchVersionChecker.ts
// Source: https://ddragon.leagueoflegends.com/api/versions.json

export async function getCurrentPatchVersion(): Promise<string> {
  const response = await axios.get<string[]>(
    'https://ddragon.leagueoflegends.com/api/versions.json'
  );
  return response.data[0]; // e.g. "16.5.1"
}

export async function isCacheStale(store: Store): Promise<boolean> {
  const cachedVersion = store.get('patchVersion') as string | undefined;
  if (!cachedVersion) return true;
  const liveVersion = await getCurrentPatchVersion();
  return liveVersion !== cachedVersion;
}
```

### Pattern 2: CommunityDragon Locale-Matched Download

**What:** Map the Riot client language code to the CommunityDragon locale file name. Download the single large JSON file for that locale. Write to AppData with `node:fs`. Load into memory for the duration of the session.

**When to use:** On startup when cache is stale (patch changed) or missing.

**Key insight — locale mapping:**
CommunityDragon file names use lowercase underscore format matching Riot's client locale codes:
- Riot client: `pt_BR` → CommunityDragon: `pt_br.json`
- Riot client: `en_US` → CommunityDragon: `en_us.json`
- Riot client: `ko_KR` → CommunityDragon: `ko_kr.json`

The CDN URL pattern is:
```
https://raw.communitydragon.org/latest/cdragon/tft/{locale}.json
```
Where `{locale}` is the lowercase Riot client locale code (e.g., `pt_br`, `en_us`).

**Example:**
```typescript
// src/main/data/CommunityDragonFetcher.ts
import fs from 'node:fs/promises';
import path from 'node:path';

export async function downloadStaticData(
  locale: string,  // e.g. "pt_br"
  destDir: string  // app.getPath('userData') + /static/{setFolder}/
): Promise<void> {
  const url = `https://raw.communitydragon.org/latest/cdragon/tft/${locale.toLowerCase()}.json`;
  const response = await axios.get(url, { responseType: 'json' });
  const destPath = path.join(destDir, `${locale}.json`);
  await fs.mkdir(path.dirname(destPath), { recursive: true });
  await fs.writeFile(destPath, JSON.stringify(response.data), 'utf-8');
}
```

**CommunityDragon JSON top-level structure** (MEDIUM confidence — derived from community docs and search results):
The locale JSON file is one large object. Confirmed top-level keys include:
- `setData` — array of set objects, each containing `champions`, `traits`, `augments`
- `items` — array of item objects with `id`, `name`, `desc`, `icon`, `composition`
- `sets` — mapping of set numbers to set metadata

Each champion object has: `apiName`, `name`, `cost`, `traits`, `ability`, `icon` (path to CDN asset).
Each trait object has: `apiName`, `name`, `desc`, `effects` (array with minUnits and style), `icon`.
Each item object has: `id`, `name`, `desc`, `icon`, `from` (component item IDs).
Each augment object has: `apiName`, `name`, `desc`, `icon`, `tier` (1, 2, or 3).

**Asset image URL pattern:**
CommunityDragon stores icons at paths relative to CDN root. Icon field values are paths like:
`/lol-game-data/assets/ASSETS/Characters/TFT_Ahri/HUD/TFT_Ahri_Square.TFT_Set10.png`

Full URL: `https://raw.communitydragon.org/latest` + the icon path (lowercase).

### Pattern 3: tactics.tools Meta Scraper via `__PROPS__` Extraction

**What:** tactics.tools uses Next.js with server-side rendering. The full meta data JSON is embedded in the page HTML as a JavaScript variable `__NEXT_DATA__` (Next.js standard) or within a `<script id="__PROPS__">` block. Fetch the page HTML, use cheerio to locate the script tag, parse the JSON.

**When to use:** At startup when meta cache is stale (patch changed or > 24 hours old).

**Key finding:** Confirmed by direct page fetch — tactics.tools pre-renders comp data server-side. Example data present in raw HTML includes `"place":3.95669792319366,"top4":34028,"win":7003` with unit arrays and trait distributions. This is parseable without JavaScript execution.

**Target URL:** `https://tactics.tools/team-compositions`

**Example:**
```typescript
// src/main/data/MetaScraper.ts
import axios from 'axios';
import * as cheerio from 'cheerio';

export async function scrapeMetaComps(): Promise<RawMetaData> {
  const { data: html } = await axios.get(
    'https://tactics.tools/team-compositions',
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 15000,
    }
  );
  const $ = cheerio.load(html);

  // Next.js embeds SSR data in <script id="__NEXT_DATA__"> tag
  const nextDataScript = $('#__NEXT_DATA__').html();
  if (!nextDataScript) {
    throw new Error('tactics.tools page structure changed — __NEXT_DATA__ not found');
  }

  const nextData = JSON.parse(nextDataScript);
  // Navigate the props tree to find comp data — exact path requires validation at implementation time
  // Likely: nextData.props.pageProps.compositions or similar
  return extractComps(nextData);
}
```

**Fallback strategy when site changes:** If `__NEXT_DATA__` is not found or the props path changes:
1. Log the error and fall back to the last cached meta data (stale but functional)
2. Emit a warning via IPC to the renderer splash screen: "Meta data unavailable — using cached data from patch X.Y"
3. App continues — static data (CommunityDragon) is always available even without meta data

### Pattern 4: Game Detection Polling Loop

**What:** Poll `https://127.0.0.1:2999/liveclientdata/allgamedata` on a fixed interval. Connection refused = no game. HTTP 200 + `gameMode === "TFT"` = TFT game active. Any other gameMode (e.g., "CLASSIC" for LoL) = non-TFT game, stay in waiting state.

**Key confirmed fact:** The Live Client API `gameMode` field returns `"TFT"` for all TFT game modes (Normal, Ranked, Hyper Roll, Double Up). There is no sub-mode field to filter on — all are `"TFT"`.

**Polling interval recommendation:** 3 seconds. This is the documented community standard. 1 second is too aggressive for a continuously running background loop. 5 seconds may miss short-lived connection windows at game start.

**Self-signed certificate:** The Live Client API at `127.0.0.1:2999` uses a self-signed certificate. Node.js `https` module (and axios) will reject it by default. Must pass `httpsAgent: new https.Agent({ rejectUnauthorized: false })`.

**Example:**
```typescript
// src/main/game/LiveClientAPI.ts
import axios from 'axios';
import https from 'node:https';

const agent = new https.Agent({ rejectUnauthorized: false });
const BASE = 'https://127.0.0.1:2999';

export async function fetchGameData(): Promise<LiveClientResponse | null> {
  try {
    const { data } = await axios.get(`${BASE}/liveclientdata/allgamedata`, {
      httpsAgent: agent,
      timeout: 2000,
    });
    return data;
  } catch {
    // ECONNREFUSED = game not running. Any error = treat as no game.
    return null;
  }
}

// src/main/game/GameWatcher.ts
export function startPolling(onGameStart: () => void, onGameEnd: () => void): void {
  let isGameActive = false;

  setInterval(async () => {
    const data = await fetchGameData();
    const tftActive = data?.gameData?.gameMode === 'TFT';

    if (tftActive && !isGameActive) {
      isGameActive = true;
      onGameStart();
    } else if (!tftActive && isGameActive) {
      isGameActive = false;
      onGameEnd();
    }
  }, 3000);
}
```

### Pattern 5: electron-store for Config Only (Small Data)

**What:** Use electron-store exclusively for small config values. Never store game data JSON in electron-store.

**What to store in electron-store:**
- `patchVersion` (string): e.g. `"16.5.1"` — for cache invalidation
- `userLocale` (string): e.g. `"pt_br"` — detected from Riot client
- `userRegion` (string): e.g. `"BR1"` — detected from Riot client
- `metaScrapedAt` (number): Unix timestamp of last successful scrape
- `metaScrapedPatch` (string): patch version at time of last scrape

**ESM import requirement (electron-store v10):**
```typescript
// electron-store v10 is ESM-only. In electron-vite with ESM main process:
import Store from 'electron-store';
const store = new Store<AppConfig>({
  schema: {
    patchVersion: { type: 'string', default: '' },
    userLocale: { type: 'string', default: 'en_us' },
    userRegion: { type: 'string', default: 'NA1' },
    metaScrapedAt: { type: 'number', default: 0 },
    metaScrapedPatch: { type: 'string', default: '' },
  }
});
```

### Anti-Patterns to Avoid
- **Storing 21MB CommunityDragon JSON in electron-store:** electron-store reads and writes the entire file on every change. At 21MB this is disqualifyingly slow. Use `node:fs.writeFile` / `fs.readFile` directly.
- **Fetching CommunityDragon at `en_us.json` regardless of locale:** The user decision explicitly requires locale-matched data. Map the Riot client locale to the CommunityDragon file name.
- **Using `latest` path permanently without version check:** The `latest` path always resolves to the current patch. But for cache invalidation, compare the DDragon versions endpoint string, not the CDN path.
- **Scraping MetaTFT with cheerio:** MetaTFT is a pure SPA — cheerio will get an empty HTML shell. Only tactics.tools has SSR.
- **Treating ECONNREFUSED as an app error:** Connection refused on port 2999 is the normal state when no game is running. Catch it silently.
- **Omitting `rejectUnauthorized: false` on Live Client API calls:** All calls to `https://127.0.0.1:2999` will fail with a certificate error without this flag.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTML parsing of scraped pages | Custom regex for finding JSON in script tags | `cheerio` with `$('#__NEXT_DATA__').html()` | Regex on HTML is brittle; cheerio handles encoding edge cases, malformed HTML, CDATA sections |
| Runtime type validation of external JSON | Manual `if (data.champions && Array.isArray(...))` checks | `zod` schema `.safeParse()` | External APIs return unexpected shapes between set releases; zod gives structured error messages for debugging |
| Persistent small config across restarts | `fs.readFile/writeFile` for a tiny config object | `electron-store` | electron-store handles atomic writes, schema validation, migration — important for config correctness |
| HTTP requests to external APIs | Raw `https.request` | `axios` | Self-signed cert handling, timeout, redirect, interceptors — all required for this project |

**Key insight:** The data pipeline has three entirely different storage tiers. Mixing them causes either performance problems (using electron-store for large data) or correctness problems (using raw fs for small config). Keep each tier separate from day one.

---

## Common Pitfalls

### Pitfall 1: electron-store Performance Collapse on Large JSON

**What goes wrong:** Developer uses `store.set('staticData', communityDragonObject)` thinking it's a simple key-value store. On every subsequent `store.set()` call (including setting the patch version), electron-store reads and re-serializes the entire 21MB object to disk. Startup slows to 5-10 seconds.

**Why it happens:** electron-store is documented as a convenience wrapper — its "reads and writes the entire JSON file on every change" behavior is not obvious from the API.

**How to avoid:** Write CommunityDragon data to `{userData}/static/{set}/{locale}.json` using `node:fs.writeFile`. Read it once on startup with `node:fs.readFile` into a module-level variable. Never touch electron-store for this data.

**Warning signs:** Startup time increasing as more data is cached; `store.set` calls taking > 100ms.

### Pitfall 2: MetaTFT Returning Empty HTML to cheerio

**What goes wrong:** Developer follows the STACK.md recommendation to use cheerio on MetaTFT, fetches the HTML, finds nothing. cheerio sees only `<div id="root"></div>` and one `<script>` tag.

**Why it happens:** MetaTFT is a pure React SPA — the page content is rendered client-side after JavaScript runs. cheerio never executes JavaScript.

**How to avoid:** Use tactics.tools, not MetaTFT. Confirmed by direct page fetch that tactics.tools embeds data server-side in `__NEXT_DATA__`. If tactics.tools also fails in the future, fall back to cached data and log an error.

**Warning signs:** Cheerio `$('#__NEXT_DATA__').html()` returns null; extracted comp array is empty.

### Pitfall 3: Locale Mismatch for CommunityDragon

**What goes wrong:** App always downloads `en_us.json` regardless of user locale. Brazilian player gets English champion names and descriptions.

**Why it happens:** Locale auto-detection is deferred or forgotten. The CDN URL is hardcoded with `en_us`.

**How to avoid:** Detect Riot client locale from LCU API at startup. Map it to CommunityDragon format (lowercase, underscore). Store detected locale in electron-store. Use it for all CommunityDragon downloads.

**Locale detection approach:** Query the League Client Update (LCU) API at `https://127.0.0.1:{lcu_port}/lol-settings/v2/client` or read the LeagueClient process arguments which include `--locale=pt_BR`. The latter is simpler for a desktop app.

**Warning signs:** All champion and item names appear in English for non-English users.

### Pitfall 4: Missing Self-Signed Certificate Bypass

**What goes wrong:** All calls to `https://127.0.0.1:2999` throw `Error: unable to verify the first certificate`. The game detection loop crashes on its first tick.

**Why it happens:** Node.js rejects self-signed certs by default. The Live Client API uses a Riot-signed cert that Node does not trust.

**How to avoid:** Create a persistent `https.Agent({ rejectUnauthorized: false })` and pass it to every axios call to `127.0.0.1:2999`. Do NOT set `NODE_TLS_REJECT_UNAUTHORIZED=0` globally — that disables verification for all HTTPS calls, including external ones.

**Warning signs:** First test of game detection fails with certificate error even though TFT is running.

### Pitfall 5: Cache Not Surviving App Restarts

**What goes wrong:** Developer stores CommunityDragon data in a module-level variable (in-memory only). On app restart, data is gone and must re-download 21MB every launch.

**Why it happens:** Testing in dev mode where restart is frequent — the 21MB download seems acceptable. In production, users expect near-instant startup after first run.

**How to avoid:** Always write fetched data to disk with `node:fs`. On startup, check if the file exists and the patch version matches before downloading. Only re-download when the patch version has changed.

**Warning signs:** App takes 10+ seconds to start every time regardless of previous launches.

### Pitfall 6: No Fallback When Meta Scrape Fails

**What goes wrong:** tactics.tools is unreachable (user offline, site down, Cloudflare challenge). App throws uncaught exception and fails to start.

**Why it happens:** Scraper is awaited without error handling. Startup sequence is linear with no fallback branch.

**How to avoid:** Wrap the scraper call in try/catch. If it fails, log the error and proceed with stale cache. If no cache exists at all, start app with meta data empty — static CommunityDragon data is always available.

```typescript
// Resilient startup sequence
try {
  await refreshMetaIfStale();
} catch (err) {
  console.error('Meta scrape failed, using cached data:', err);
  // App continues — static data still available
}
```

---

## Code Examples

### Version Check and Cache Invalidation
```typescript
// src/main/data/PatchVersionChecker.ts
// Source: https://ddragon.leagueoflegends.com/api/versions.json (confirmed working 2026-03-12, returns "16.5.1" as first element)

import axios from 'axios';

export async function getLatestPatchVersion(): Promise<string> {
  const { data } = await axios.get<string[]>(
    'https://ddragon.leagueoflegends.com/api/versions.json',
    { timeout: 5000 }
  );
  return data[0]; // Always first element: most recent patch
}
```

### AppData Path Construction
```typescript
// src/main/data/DataCache.ts
import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';

export function getStaticDataPath(set: string, locale: string): string {
  return path.join(app.getPath('userData'), 'static', set, `${locale}.json`);
}

export function getMetaCachePath(): string {
  return path.join(app.getPath('userData'), 'meta', 'meta_cache.json');
}

export async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return null; // File does not exist yet
  }
}
```

### Zod Schema for CommunityDragon Data
```typescript
// src/main/data/types.ts
import { z } from 'zod';

export const ChampionSchema = z.object({
  apiName: z.string(),
  name: z.string(),
  cost: z.number(),
  traits: z.array(z.string()),
  icon: z.string(),
  ability: z.object({
    name: z.string(),
    desc: z.string(),
    icon: z.string(),
  }).optional(),
});

export const TraitSchema = z.object({
  apiName: z.string(),
  name: z.string(),
  desc: z.string(),
  icon: z.string(),
  effects: z.array(z.object({
    minUnits: z.number(),
    style: z.number(),
  })),
});

export const ItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  desc: z.string(),
  icon: z.string(),
  from: z.array(z.number()).optional(),
});

export const AugmentSchema = z.object({
  apiName: z.string(),
  name: z.string(),
  desc: z.string(),
  icon: z.string(),
  tier: z.number().optional(),
});

export type Champion = z.infer<typeof ChampionSchema>;
export type Trait = z.infer<typeof TraitSchema>;
export type Item = z.infer<typeof ItemSchema>;
export type Augment = z.infer<typeof AugmentSchema>;
```

### IPC Handler for Startup Status (Splash Screen)
```typescript
// src/main/ipc/handlers.ts
import { ipcMain } from 'electron';

// Renderer polls this to show startup progress
ipcMain.handle('get-startup-status', () => ({
  patchVersion: store.get('patchVersion'),
  staticDataReady: staticDataLoaded,
  metaDataReady: metaDataLoaded,
}));

// Or: push-style — main process sends updates to renderer
function sendStartupStatus(win: BrowserWindow, status: StartupStatus) {
  win.webContents.send('startup-status', status);
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Data Dragon for TFT data | CommunityDragon for TFT data | ~2023 (Set 8+) | Data Dragon TFT support is incomplete; CommunityDragon is the community standard for TFT tooling |
| electron-store for all persistence | electron-store for config only; node:fs for large data | electron-store v10 README explicitly warns against large data | Must use file system for anything over a few KB |
| cheerio for all scraping | Playwright for SPAs, cheerio for SSR pages | 2023-onward | MetaTFT and Mobalytics became full SPAs; tactics.tools remains SSR (Next.js), making cheerio viable for it specifically |
| Global `NODE_TLS_REJECT_UNAUTHORIZED=0` | Per-agent `rejectUnauthorized: false` | Always best practice | Global flag disables TLS verification for all HTTPS calls — security risk |

**Deprecated/outdated:**
- Scraping MetaTFT with cheerio: The site is now a pure SPA. This pattern no longer works.
- Using Data Dragon as the primary TFT data source: Missing augment data, incomplete trait info. CommunityDragon supersedes it for TFT.

---

## Open Questions

1. **Exact `__NEXT_DATA__` path to comp data in tactics.tools**
   - What we know: tactics.tools pre-renders comp data in `__NEXT_DATA__` JSON; `place`, `top4`, `win` fields are present
   - What's unclear: The exact JSON path (`pageProps.compositions`? `pageProps.data.comps`?) — this requires checking at implementation time during a live fetch
   - Recommendation: In Wave 0/Task 1, write a throwaway Node script that fetches the page and `console.log(JSON.stringify(nextData, null, 2))` to find the exact path before building the parser

2. **CommunityDragon `setData` key structure for current vs historical sets**
   - What we know: Top-level `setData` is an array; each element contains champions, traits, augments for that set
   - What's unclear: How to reliably identify the "current" set from the array (by index? by a `mutator` field? by the highest set number?)
   - Recommendation: Fetch `https://raw.communitydragon.org/latest/cdragon/tft/en_us.json` in a test script and inspect the `setData` array structure. Likely needs `setData[setData.length - 1]` or filtering by a `mutator` field.

3. **LCU API for locale and region auto-detection**
   - What we know: The League Client Update (LCU) API runs on a local port with a random port number; locale is available as a parameter
   - What's unclear: The exact LCU port discovery method in an Electron main process context (reading process args vs polling for the lockfile at `%localappdata%/Riot Games/League of Legends/lockfile`)
   - Recommendation: Read the lockfile at startup. It contains port + password for LCU access. This is the standard pattern used by all TFT tools.

4. **Image caching strategy for sprite/icon downloads**
   - What we know: User decision requires downloading and caching champion/item/trait icons; CommunityDragon icon paths are relative strings
   - What's unclear: Whether to download all icons eagerly at startup (hundreds of files, slow startup) or lazily on first display
   - Recommendation: Lazy caching — download icon on first request, cache to `{userData}/static/{set}/images/`, serve from disk on subsequent requests. This keeps startup fast and avoids downloading icons for champions never shown.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (part of electron-vite scaffold) |
| Config file | `vitest.config.ts` (Wave 0 — does not exist yet) |
| Quick run command | `npx vitest run src/main/data` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-01 | GameWatcher returns `null` when port 2999 is closed | unit | `npx vitest run src/main/game/GameWatcher.test.ts` | Wave 0 |
| DATA-01 | GameWatcher detects `gameMode === "TFT"` as active game | unit (mock HTTP) | `npx vitest run src/main/game/GameWatcher.test.ts` | Wave 0 |
| DATA-01 | GameWatcher fires `onGameStart` callback on transition from no-game to TFT | unit | `npx vitest run src/main/game/GameWatcher.test.ts` | Wave 0 |
| DATA-02 | Patch version check returns string like `"16.5.1"` | unit (mock HTTP) | `npx vitest run src/main/data/PatchVersionChecker.test.ts` | Wave 0 |
| DATA-02 | `isCacheStale` returns true when stored version differs from live | unit | `npx vitest run src/main/data/PatchVersionChecker.test.ts` | Wave 0 |
| DATA-02 | `readJsonFile` returns `null` on missing file (no throw) | unit | `npx vitest run src/main/data/DataCache.test.ts` | Wave 0 |
| DATA-02 | Zod schemas parse valid CommunityDragon champion/item/trait/augment objects | unit | `npx vitest run src/main/data/types.test.ts` | Wave 0 |
| DATA-03 | MetaScraper extracts non-empty array of comps from `__NEXT_DATA__` | unit (mock HTML fixture) | `npx vitest run src/main/data/MetaScraper.test.ts` | Wave 0 |
| DATA-03 | MetaScraper returns `null` (not throw) when `__NEXT_DATA__` is missing | unit | `npx vitest run src/main/data/MetaScraper.test.ts` | Wave 0 |
| DATA-03 | Meta cache fallback is used when scrape fails | unit | `npx vitest run src/main/data/MetaScraper.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/main/data src/main/game`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/main/game/GameWatcher.test.ts` — covers DATA-01
- [ ] `src/main/data/PatchVersionChecker.test.ts` — covers DATA-02 version check
- [ ] `src/main/data/DataCache.test.ts` — covers DATA-02 file operations
- [ ] `src/main/data/types.test.ts` — covers DATA-02 zod schema validation
- [ ] `src/main/data/MetaScraper.test.ts` — covers DATA-03 (requires HTML fixture file)
- [ ] `vitest.config.ts` — test framework config
- [ ] Framework install: `npm install -D vitest` — if not present in scaffold

---

## Sources

### Primary (HIGH confidence)
- [CommunityDragon CDN directory](https://raw.communitydragon.org/latest/cdragon/tft/) — confirmed 27 locale files, ~21MB each, updated 2026-03-11
- [DDragon versions endpoint](https://ddragon.leagueoflegends.com/api/versions.json) — confirmed returns `["16.5.1", ...]`; first element is current patch
- [electron-store GitHub README](https://github.com/sindresorhus/electron-store) — explicitly states "not a database; entire JSON file read/written on every change; for large data use SQLite or similar"
- [Riot developer-relations issue #373](https://github.com/RiotGames/developer-relations/issues/373) — confirms Live Client API TFT data is minimal; open since 2020 with no resolution

### Secondary (MEDIUM confidence)
- tactics.tools team-compositions page — direct fetch confirmed SSR with `__NEXT_DATA__` containing comp data including `place`, `top4`, `win` fields
- MetaTFT comps page — direct fetch confirmed pure SPA returning `"You need to enable JavaScript to run this app."` — cheerio cannot parse
- WebSearch result confirming gameMode field returns `"TFT"` for TFT games on port 2999
- [electron-store TypeScript guide](https://www.xjavascript.com/blog/electronstore-typescript/) — usage patterns and config schema setup

### Tertiary (LOW confidence — needs implementation validation)
- CommunityDragon JSON internal structure (setData keys, exact champion/item field names) — inferred from community docs; must be validated by fetching and inspecting actual JSON during implementation
- tactics.tools `__NEXT_DATA__` exact JSON path to comp array — page confirmed to contain data but props path unknown until implementation inspection
- LCU lockfile location for locale/region detection — standard pattern but not validated against current Riot client version

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — electron-store limitation confirmed by official README; axios + cheerio are standard; node:fs is the correct alternative
- Architecture: HIGH — startup sequence, patch version check, cache structure are well-established patterns for this domain
- CommunityDragon data: MEDIUM — file structure confirmed, internal JSON schema inferred from community docs but needs live validation
- tactics.tools scraping: MEDIUM — SSR confirmed by direct fetch, `__NEXT_DATA__` present, but exact JSON navigation path unknown until implementation
- Game detection: HIGH — gameMode="TFT" confirmed by multiple sources; self-signed cert bypass is documented Electron/Node pattern
- Pitfalls: HIGH — electron-store performance confirmed by official docs; MetaTFT SPA confirmed by direct fetch

**Research date:** 2026-03-12
**Valid until:** 2026-04-12 for static patterns; 2026-03-26 for tactics.tools scraping (site structure can change with Next.js upgrades)

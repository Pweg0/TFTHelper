---
phase: 01-data-pipeline
plan: "03"
subsystem: data
tags: [axios, cheerio, zod, vitest, electron, tft, live-client-api, web-scraping]

# Dependency graph
requires:
  - phase: 01-data-pipeline/01-01
    provides: LiveClientResponse and GameState interfaces, MetaCompSchema, DataCache (writeJsonFile/readJsonFile/getMetaCachePath)

provides:
  - LiveClientAPI: axios wrapper for Riot Live Client API (127.0.0.1:2999) with self-signed cert bypass
  - GameWatcher: polling loop with onGameStart/onGameEnd lifecycle callbacks for TFT game detection
  - MetaScraper: tactics.tools cheerio scraper with Zod validation and disk cache
  - 25 passing tests for game detection and meta scraping

affects:
  - 01-04 (startup orchestrator will wire GameWatcher and MetaScraper together)
  - 02-live-client (uses GameWatcher for game state transitions)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ECONNREFUSED as normal state: Live Client API polling treats ECONNREFUSED as no-game — not logged, not thrown"
    - "Self-signed cert bypass: axios httpsAgent with rejectUnauthorized:false for 127.0.0.1:2999"
    - "Transition-only callbacks: GameWatcher only fires onGameStart/onGameEnd on state changes, never on stable state"
    - "Scraper pattern: cheerio parses __NEXT_DATA__ JSON from Next.js server-rendered HTML"
    - "Debug logging of pageProps keys on first scrape for future data discovery"

key-files:
  created:
    - src/main/game/LiveClientAPI.ts
    - src/main/game/GameWatcher.ts
    - src/main/game/GameWatcher.test.ts
    - src/main/data/MetaScraper.ts
    - src/main/data/MetaScraper.test.ts
    - src/main/data/__fixtures__/tactics_tools_sample.html
  modified: []

key-decisions:
  - "tactics.tools __NEXT_DATA__ path is pageProps.compositions — confirmed via fixture and debug logging pattern"
  - "Non-TFT game modes (CLASSIC, etc.) treated as no-game by GameWatcher — only TFT triggers onGameStart"
  - "refreshMetaIfStale takes a Store interface (get/set) rather than a concrete electron-store instance for testability"

patterns-established:
  - "Error-as-null pattern: both fetchGameData and scrapeMetaComps return null (never throw) for all error conditions"
  - "State transition pattern: GameWatcher tracks boolean isGameActive to prevent duplicate callbacks"
  - "Cache-first with stale fallback: refreshMetaIfStale degrades gracefully through fresh cache -> scrape -> stale cache -> null"

requirements-completed:
  - DATA-01
  - DATA-03

# Metrics
duration: 3min
completed: 2026-03-12
---

# Phase 1 Plan 3: GameWatcher and MetaScraper Summary

**TFT game detection polling loop (127.0.0.1:2999 with self-signed cert bypass) and tactics.tools cheerio scraper with Zod validation and disk cache fallback — 25 tests green**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-12T22:28:27Z
- **Completed:** 2026-03-12T22:31:38Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- LiveClientAPI fetches from Riot Live Client Data API with self-signed cert bypass and returns null on any error (ECONNREFUSED, timeout, HTTP failure)
- GameWatcher polls on 3s interval (configurable), fires onGameStart/onGameEnd only on state transitions, ignores non-TFT game modes
- MetaScraper parses tactics.tools __NEXT_DATA__ via cheerio, extracts itemPriorities and positioning, validates with MetaCompSchema, logs pageProps keys for data discovery
- refreshMetaIfStale implements fresh-cache -> scrape -> stale-cache -> null degradation chain
- 25 tests pass: 11 GameWatcher tests (TDD), 14 MetaScraper tests (TDD)

## Task Commits

Each task was committed atomically (TDD: RED commit then GREEN commit):

1. **Task 1 RED: GameWatcher failing tests** - `98e22f3` (test)
2. **Task 1 GREEN: LiveClientAPI + GameWatcher implementation** - `ce549df` (feat)
3. **Task 2 RED: MetaScraper failing tests + HTML fixture** - `8e56d23` (test)
4. **Task 2 GREEN: MetaScraper implementation** - `1a231fa` (feat)

**Plan metadata:** (docs commit — see below)

_Note: Both tasks used TDD producing test commit (RED) then implementation commit (GREEN)._

## Files Created/Modified

- `src/main/game/LiveClientAPI.ts` - GET 127.0.0.1:2999 via axios; self-signed cert bypass; returns null on all errors
- `src/main/game/GameWatcher.ts` - Polling loop class; transition-only callbacks; TFT-mode gate; stop() clears interval
- `src/main/game/GameWatcher.test.ts` - 11 tests: state transitions, no-duplicates, stop behavior, fake timers
- `src/main/data/MetaScraper.ts` - scrapeMetaComps + refreshMetaIfStale; cheerio __NEXT_DATA__ parser; Zod validation; cache I/O
- `src/main/data/MetaScraper.test.ts` - 14 tests: extraction, filtering, null returns, cache fresh/stale/fallback paths
- `src/main/data/__fixtures__/tactics_tools_sample.html` - Minimal Next.js page fixture: 2 valid comps (with itemPriorities and positioning), 1 invalid

## Decisions Made

- `tactics.tools __NEXT_DATA__` path uses `pageProps.compositions` — assumed from research and confirmed against fixture. Debug logging of pageProps keys on every successful scrape enables future detection if the path changes.
- `GameWatcher` treats non-TFT game modes (CLASSIC, ARAM, etc.) as no-game — only fires `onGameStart` when `gameMode === 'TFT'`.
- `refreshMetaIfStale` accepts a `Store` interface (`get`/`set`) rather than concrete `electron-store` for testability without Electron runtime.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — both modules implemented cleanly. TDD cycle completed without unexpected issues.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- GameWatcher is ready for the startup orchestrator (Plan 01-04) to call `.start()` and register handlers
- MetaScraper is ready for the startup orchestrator to call `refreshMetaIfStale(store, patch)` at app launch
- Both modules handle errors gracefully — no uncaught exceptions possible at call sites
- Fixture and pageProps debug logging provide adaptation path if tactics.tools changes their __NEXT_DATA__ structure

## Self-Check: PASSED

- `src/main/game/LiveClientAPI.ts` — found on disk
- `src/main/game/GameWatcher.ts` — found on disk
- `src/main/game/GameWatcher.test.ts` — found on disk
- `src/main/data/MetaScraper.ts` — found on disk
- `src/main/data/MetaScraper.test.ts` — found on disk
- `src/main/data/__fixtures__/tactics_tools_sample.html` — found on disk
- Task commits verified: 98e22f3, ce549df, 8e56d23, 1a231fa
- 25 tests pass: `npx vitest run src/main/game/ src/main/data/MetaScraper.test.ts`

---
*Phase: 01-data-pipeline*
*Completed: 2026-03-12*

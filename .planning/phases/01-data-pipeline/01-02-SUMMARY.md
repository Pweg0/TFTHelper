---
phase: 01-data-pipeline
plan: "02"
subsystem: infra
tags: [axios, zod, vitest, electron-store, communitydragon, ddragon, tdd]

requires:
  - phase: 01-data-pipeline/01-01
    provides: Champion/Trait/Item/Augment Zod schemas, DataCache file I/O utility (writeJsonFile, readJsonFile, path helpers)

provides:
  - PatchVersionChecker: fetch DDragon latest patch, detect cache staleness via electron-store
  - CommunityDragonFetcher: download locale-matched CDragon JSON, extract current set data with Zod validation, disk caching
  - ImageCacheFetcher: download champion/item/trait/augment icons from CDragon CDN, lazy skip, graceful failure

affects:
  - 01-03 (MetaScraper can check patch version for cache invalidation)
  - 02-live-client (data pipeline is live; static data ready for UI consumption)
  - all subsequent plans (icon images and static JSON available from cache)

tech-stack:
  added: []
  patterns:
    - TDD: write failing test (RED commit) then implement (GREEN commit), repeat per task
    - CDragon URL pattern: lowercase full ASSETS/ path + replace .tex with .png under rcp-be-lol-game-data base
    - Zod filter pattern: safeParse in loop, filter failures with warning log (never throw on individual items)
    - Lazy image cache: fs.access check before axios.get, skip existing files

key-files:
  created:
    - src/main/data/PatchVersionChecker.ts
    - src/main/data/PatchVersionChecker.test.ts
    - src/main/data/CommunityDragonFetcher.ts
    - src/main/data/CommunityDragonFetcher.test.ts
    - src/main/data/ImageCacheFetcher.ts
    - src/main/data/ImageCacheFetcher.test.ts
  modified: []

key-decisions:
  - "CDragon setData: current set selected by highest numeric set.number value (not last array element), confirmed by test fixture design"
  - "Items and augments live at top-level CDragon JSON, not inside setData array — champions and traits are per-set"
  - "CDragon CDN URL: full ASSETS/ path lowercased + .tex extension replaced with .png under rcp-be-lol-game-data/global/default"
  - "ImageCacheFetcher deduplicates icon paths before downloading to avoid redundant requests"

patterns-established:
  - "CDragon download pattern: GET full locale JSON (30s timeout), writeJsonFile to DataCache path, log top-level keys"
  - "Icon download pattern: collect all icons, deduplicate, mkdir, fs.access skip, axios arraybuffer GET, writeFile, log summary"
  - "Zod filter pattern: safeParse per item, filter failures, log warning with identifier, return only valid items"

requirements-completed:
  - DATA-02

duration: 15min
completed: 2026-03-12
---

# Phase 1 Plan 2: CommunityDragon Data Pipeline Summary

**DDragon patch version checker, CommunityDragon locale JSON downloader with Zod validation, and icon image cache fetcher — 27 new tests passing (68 total)**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-12T22:28:18Z
- **Completed:** 2026-03-12T22:43:00Z
- **Tasks:** 3 (each TDD: RED commit + GREEN commit)
- **Files modified:** 6

## Accomplishments

- PatchVersionChecker fetches latest patch from DDragon API with 5s timeout, compares against electron-store cached version for staleness detection
- CommunityDragonFetcher downloads ~21MB locale JSON from CDragon CDN, identifies current set by highest set.number, validates champions/traits/items/augments with Zod schemas (filtering invalid items), writes to DataCache
- ImageCacheFetcher downloads champion/item/trait/augment icons, deduplicates paths, skips already-cached files, tolerates individual failures, logs download summary
- 68 total tests passing across all 6 test files in src/main/data/

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: PatchVersionChecker tests** - `96e73c9` (test)
2. **Task 1 GREEN: PatchVersionChecker implementation** - `ff2c5c8` (feat)
3. **Task 2 RED: CommunityDragonFetcher tests** - `b3a73b1` (test)
4. **Task 2 GREEN: CommunityDragonFetcher implementation** - `a362bf3` (feat)
5. **Task 3 RED: ImageCacheFetcher tests** - `4e38b76` (test)
6. **Task 3 GREEN: ImageCacheFetcher implementation** - `c88302d` (feat)

**Plan metadata:** (docs commit — see below)

_Note: All 3 tasks used TDD, each producing a test commit (RED) then an implementation commit (GREEN)._

## Files Created/Modified

- `src/main/data/PatchVersionChecker.ts` - GET DDragon versions.json (5s timeout), isCacheStale checks electron-store vs live
- `src/main/data/PatchVersionChecker.test.ts` - 7 tests: URL, first-element return, error throw, 4 staleness cases
- `src/main/data/CommunityDragonFetcher.ts` - downloadStaticData/extractCurrentSetData/loadStaticData with Zod validation and DataCache
- `src/main/data/CommunityDragonFetcher.test.ts` - 9 tests: URL construction, file write, set selection, Zod filtering, cache read
- `src/main/data/ImageCacheFetcher.ts` - getIconPath, downloadIcons with dedup/skip/retry-free failure tolerance
- `src/main/data/ImageCacheFetcher.test.ts` - 11 tests: path derivation, CDN URLs, skip logic, failure tolerance, dedup, empty no-op

## Decisions Made

- CDragon `setData` current set is determined by highest `number` value (not last array element) — more robust against out-of-order data.
- `items` and `augments` live at the top level of the CDragon JSON (not inside each set object) — champions and traits are per-set.
- CDragon CDN URL construction: full ASSETS/ path lowercased, `.tex` extension replaced with `.png`, under `rcp-be-lol-game-data/global/default`.
- Icon paths are deduplicated before downloading to avoid redundant network requests when multiple champions/traits share an icon.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Windows path separator compatibility in ImageCacheFetcher tests**
- **Found during:** Task 3 GREEN (ImageCacheFetcher implementation)
- **Issue:** `path.join` on Windows produces backslashes (`\`) but test assertions used forward slashes (`/cache/images/set13/`), causing 3 test failures
- **Fix:** Added `normPath` helper in test file that replaces backslashes with forward slashes before assertions
- **Files modified:** `src/main/data/ImageCacheFetcher.test.ts`
- **Verification:** All 11 ImageCacheFetcher tests pass; full suite 68/68 green
- **Committed in:** `c88302d` (Task 3 GREEN commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor test compatibility fix for Windows development environment. No functional changes to implementation.

## Issues Encountered

- CDragon JSON structure confidence was marked LOW in the plan. The implementation follows the fixture-confirmed structure: `setData[].champions`, `setData[].traits` (per set), top-level `items` and `augments`. This will need validation against a real CDragon download before production use, but the adapter code is clearly commented for easy update.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- PatchVersionChecker is ready to gate cache refresh logic in the app initialization flow
- CommunityDragonFetcher is ready for Plan 01-03 (MetaScraper) and Phase 2 integration
- ImageCacheFetcher provides icon paths for UI rendering in Phase 2+
- All static data persistence uses DataCache — survives restarts
- Reminder: CDragon `setData` structure LOW confidence marker remains — confirm with real download before Phase 2 integration testing

## Self-Check: PASSED

- All 6 source files verified present on disk
- All task commits (96e73c9, ff2c5c8, b3a73b1, a362bf3, 4e38b76, c88302d) verified in git log
- 68 tests pass across 6 test files: `npx vitest run src/main/data/` green

---
*Phase: 01-data-pipeline*
*Completed: 2026-03-12*

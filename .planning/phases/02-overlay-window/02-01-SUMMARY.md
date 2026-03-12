---
phase: 02-overlay-window
plan: 01
subsystem: data-model
tags: [tdd, types, zod, parsing, tft]
dependency_graph:
  requires: []
  provides: [parseBoardState, LiveClientResponseSchema, DisplayPlayer, TFTPlayer]
  affects: [BoardStatePoller, OverlayWindow, overlay-renderer]
tech_stack:
  added: []
  patterns: [zod-passthrough-schemas, tdd-red-green, provisional-types-with-fallbacks]
key_files:
  created:
    - src/main/overlay/BoardStateParser.ts
    - src/main/overlay/BoardStateParser.test.ts
  modified:
    - src/main/game/types.ts
    - src/main/overlay/OverlayWindow.test.ts
decisions:
  - "TFTPlayer champion list uses championName per allPlayers entry as a single-element string[] since TFT API likely puts one unit per entry"
  - "Players missing championStats are treated as eliminated (hp=0) rather than shown with ? indicator — display layer handles ? for the remaining live players"
  - "Filter uses isDead flag first, then HP <= 0, then missing championStats fallback to 0 which triggers the HP filter"
  - "Duplicate summonerNames preserved without dedup per spec — TFT may have multiple champion entries per player summonerName"
metrics:
  duration_minutes: 3
  completed_date: "2026-03-12"
  tasks_completed: 1
  files_changed: 4
---

# Phase 02 Plan 01: Board State Parser Summary

**One-liner:** Zod-validated TFT board state parser with HP-desc sort, dead-player filter, and local-player gold injection.

## What Was Built

`parseBoardState(data: LiveClientResponse): DisplayPlayer[]` — transforms raw Riot Live Client API data into a sorted, filtered overlay-ready model. Uses Zod schemas with `.passthrough()` and `.optional()` throughout so unknown TFT-specific fields never cause runtime failures.

### Types Added to `src/main/game/types.ts`

- `TFTItem` — item object with passthrough index signature
- `TFTPlayer` — per-entry in allPlayers; `championStats` optional because TFT availability is unconfirmed
- `ActivePlayer` — local player with `currentGold`, `summonerName`, optional `championStats`
- `DisplayPlayer` — overlay view model: summonerName, hp, maxHp, level, champions[], items[], isLocalPlayer, gold?
- `DisplayChampion` — future-use champion display shape
- Updated `LiveClientResponse.allPlayers` from `unknown[]` to `TFTPlayer[]`

### Zod Schemas in `src/main/overlay/BoardStateParser.ts`

- `TFTItemSchema` — validates displayName + itemID, passes through extra fields
- `TFTPlayerSchema` — safe defaults: championName='', level=1, isDead=false, items=[]
- `ActivePlayerSchema` — all TFT extras optional
- `LiveClientResponseSchema` — exported; allPlayers defaults to []

### parseBoardState Logic

1. Map each TFTPlayer to DisplayPlayer (hp from championStats?.currentHealth ?? 0)
2. Filter: isDead === true OR hp <= 0 (missing championStats falls to hp=0, gets filtered)
3. Sort: hp descending
4. Local player: match activePlayer.summonerName, set isLocalPlayer=true, attach gold

## Test Results

12/12 tests pass for BoardStateParser. Full suite: 99/99 tests pass across 9 files.

Test cases covered:
- 8 players sorted by HP desc
- isDead filter
- HP <= 0 filter (zero, negative)
- Missing championStats treated as eliminated
- Empty allPlayers returns []
- All eliminated returns []
- Local player isLocalPlayer=true with gold
- DisplayPlayer shape validation
- Duplicate summonerNames preserved
- Zod schema accepts unknown fields
- Zod schema applies safe defaults
- Zod schema handles empty allPlayers

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pre-existing vi.mock hoisting error in OverlayWindow.test.ts**
- **Found during:** Full suite run after GREEN phase
- **Issue:** `vi.mock` factory for `electron-overlay-window` referenced `mockAttachByTitle` and `mockEventsOn` directly, causing "Cannot access before initialization" because vi.mock is hoisted above vi.hoisted()
- **Fix:** Changed direct references to getter properties (`get attachByTitle() { return mockAttachByTitle; }`) so the hoisted variables are accessed at call time, not at module evaluation time
- **Files modified:** `src/main/overlay/OverlayWindow.test.ts`
- **Commit:** included in 8b3cd97

## Key Decisions

1. **Champion list as single-element array:** Each `allPlayers` entry in TFT appears to represent one champion unit, so `champions` is populated as `[player.championName]`. This will be validated against the live API in Plan 04.

2. **Missing championStats = eliminated:** The plan spec says "Missing fields fall back to hp: 0 (which means excluded)". This is implemented literally — no championStats means hp=0 which triggers the `hp <= 0` filter. The display "?" indicator is reserved for the overlay renderer layer.

3. **Filter before sort:** Dead/HP-zero players are excluded before sorting to avoid unnecessary comparisons.

4. **Provisional types with index signatures:** All interfaces use `[key: string]: unknown` index signatures so runtime passthrough data doesn't cause TypeScript assignment errors.

## Self-Check: PASSED

- BoardStateParser.ts: FOUND
- BoardStateParser.test.ts: FOUND
- types.ts (modified): FOUND
- feat(02-01) commit: FOUND
- test(02-01) commit: FOUND
- All 99 tests pass

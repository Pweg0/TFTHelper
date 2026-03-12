# Research Summary: TFT Helper

**Domain:** Desktop overlay app for Teamfight Tactics (auto-battler game)
**Researched:** 2026-03-12
**Overall confidence:** MEDIUM

## Executive Summary

Building a TFT overlay app is technically feasible but navigates a minefield of policy constraints, technical gotchas around game overlay windowing, and the absence of public meta-data APIs. The ecosystem has a clear center of gravity: every major TFT overlay tool (MetaTFT, TFTactics, Mobalytics, OP.GG, Blitz.gg) runs on the Overwolf platform, and this is not coincidental. Overwolf is the only documented path to rich real-time in-game data (board contents, shop, augments) for TFT without memory hacking.

The most critical finding is a direct conflict between PROJECT.md requirements and Riot Games' Third Party Application Policy. The requirement to display all players' compositions and boards during a live game is explicitly prohibited by Riot — this is classified as "scouting" and is a bannable offense for users. This constraint reshapes the entire product: the overlay must focus on the local player's own board and pre-loaded static meta recommendations, not live opponent scouting.

The technical stack is well-understood: Electron with `electron-overlay-window` for non-Overwolf builds, or Overwolf Electron for richer GEP data with anti-cheat guarantees. React + TypeScript + Tailwind is the standard web overlay stack. Static game data is freely available from CommunityDragon's CDN (updated every patch). Meta build data has no public API — the correct approach is a lightweight offline scraper that runs at app startup and caches results locally.

Rate limiting on the Riot API (20 req/sec for dev keys, 100 req/2 min) is manageable for an overlay that only needs to poll match context once pre-game. The Live Client Data API (localhost:2999) has no rate limits at all and is the primary source for in-game data, but exposes limited TFT-specific fields.

## Key Findings

**Stack:** Electron 34 + React 19 + TypeScript + electron-overlay-window + Riot Live Client Data API + CommunityDragon static data

**Architecture:** Local desktop app; no server needed for MVP. Data flows from Riot's local game client API and cached static files (CommunityDragon JSON + scraped meta data) into a React overlay window attached to the TFT process.

**Critical pitfall:** Displaying opponent board state during a live game violates Riot policy. The feature "show all players' comps" must be removed or redesigned to show only post-game data.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Project Setup and Static Data Pipeline** — Get the tech scaffolded and static data flowing before touching the overlay
   - Addresses: CommunityDragon data ingestion, meta build scraper, electron-store caching
   - Avoids: Building UI before the data model is defined

2. **Overlay Window and Riot API Integration** — Attach overlay to TFT, poll Live Client API
   - Addresses: `electron-overlay-window` setup, Live Client Data API polling, IPC between main/renderer
   - Avoids: Transparent window bugs by using `electron-overlay-window` from day one

3. **Own-Board Display and Item Recommendations** — Show the local player's board + item suggestions
   - Addresses: Board rendering, item cheat sheet, comp tracker for local player
   - Avoids: Policy violations by restricting to local player data only

4. **Meta Recommendation Engine** — Cross-reference board state with meta data
   - Addresses: Augment-aware comp suggestions, item combo recommendations
   - Avoids: Augment winrate display (banned by Riot) — show augment synergies instead

5. **Polish, Distribution and Riot Approval** — Package app, apply for Riot third-party approval
   - Addresses: electron-builder packaging, Riot developer portal application
   - Avoids: Distributing before approval (risk of key revocation)

**Phase ordering rationale:**
- Data pipeline must be proven before UI is built (no point rendering empty data)
- Overlay windowing is the hardest technical piece and needs early validation
- Policy compliance must be baked in from Phase 3, not retrofitted at Phase 5

**Research flags for phases:**
- Phase 2: Needs testing on actual TFT window (fullscreen vs windowed mode differences)
- Phase 3: Riot Live Client Data API TFT field list is sparse — validate what's actually available
- Phase 5: Riot third-party approval timeline is unpredictable (weeks to months)

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Electron + React + electron-overlay-window well-verified; Overwolf GEP data HIGH confidence |
| Features | MEDIUM | Policy constraints clearly documented; what's technically possible via Live API is less clear |
| Architecture | MEDIUM | Offline-first pattern confirmed by real TFT overlay devs; no public API for meta data |
| Pitfalls | HIGH | Policy violation risk is definitively documented; overlay windowing bugs are confirmed open issues |

## Gaps to Address

- Exact fields available from `https://127.0.0.1:2999/liveclientdata/allgamedata` for TFT specifically — needs hands-on testing
- Whether MetaTFT or tactics.tools HTML is server-rendered (cheerio-scrapeable) or client-rendered (requires playwright)
- Overwolf Electron GEP availability for TFT specifically — documentation says "per game basis rollout," TFT status needs confirmation from Overwolf
- Riot third-party approval process timeline — critical for distribution planning

# Phase 1: Data Pipeline - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Static game data (CommunityDragon) and meta build data (web scraper) are downloaded, cached locally, and ready to power the overlay. Riot Live Client API connection detects active TFT games. No UI rendering in this phase — data layer only.

</domain>

<decisions>
## Implementation Decisions

### Meta Build Scraper
- Claude chooses the best site to scrape (MetaTFT, tactics.tools, or other) based on scraping feasibility
- Extract ALL available data: comps, winrates, pickrates, augment tiers, item priorities, positioning
- Scrape runs once at app startup, not during gameplay
- Re-scrape when a new patch is detected (compare patch version)
- Splash screen simples during startup loading (no detailed progress bar)
- Auto-detect player's server region from Riot API
- Auto-detect client language and fetch CommunityDragon data in matching locale

### Cache and Storage
- Store cached data as JSON files
- Cache location: AppData do usuário (Electron default: AppData/Roaming/tft-helper)
- Cache invalidation: compare patch version from CommunityDragon on startup; if version changed, re-download everything
- No manual cache clearing — cache is self-managed
- Keep historical set data (don't delete when set changes)

### Game Detection
- User opens the app manually (no auto-start with Windows)
- When no game is active: show waiting screen ("Aguardando partida de TFT...")
- Detect ALL TFT game modes (Normal, Ranked, Hyper Roll, Double Up)
- Poll Live Client API (localhost:2999) to detect game start/end

### Data Model
- Strong TypeScript typing from day one: interfaces for Champion, Item, Trait, Augment, MetaComp
- Download and cache champion/item/trait sprites and icons from CommunityDragon (not just text data)
- Store only current set data actively, but preserve historical set data in separate folders

### Claude's Discretion
- Which meta build site to scrape (based on feasibility research)
- Scraper fallback strategy when site layout changes
- Polling interval for Live Client API
- Internal data model structure and relationships
- Exact splash screen design

</decisions>

<specifics>
## Specific Ideas

- App será compilado como .exe para Windows (electron-builder) — decisão de projeto que afeta tooling desde Phase 1
- Dados em múltiplos idiomas conforme locale do cliente do jogo
- Suporte a todas as regiões da Riot (BR, NA, EUW, etc.) via auto-detect

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing code

### Established Patterns
- None — patterns will be established in this phase (TypeScript interfaces, JSON cache structure, Electron main process architecture)

### Integration Points
- Electron main process: data fetching, caching, and Live Client API polling all run here
- IPC bridge: data flows from main process to renderer via contextBridge (future phases consume this)
- File system: AppData/Roaming/tft-helper/ for all cached data

</code_context>

<deferred>
## Deferred Ideas

- Compilação como .exe — Phase 5 (distribution), mas tooling (electron-builder) should be configured early
- Settings screen for manual cache clear — not needed per user decision

</deferred>

---

*Phase: 01-data-pipeline*
*Context gathered: 2026-03-12*

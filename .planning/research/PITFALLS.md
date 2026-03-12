# Pitfalls Research

**Domain:** TFT Helper — desktop overlay app with Riot API integration and meta recommendation engine
**Researched:** 2026-03-12
**Confidence:** HIGH (Riot API and ToS from official sources), MEDIUM (overlay rendering, scraping risks), HIGH (Vanguard from official Riot FAQ)

---

## Critical Pitfalls

### Pitfall 1: Using Development API Key in Production

**What goes wrong:**
The developer key expires every 24 hours and has a rate limit of 20 requests per second. Shipping an app to real users with a dev key means the key expires overnight, breaking the app for all users simultaneously. Riot actively monitors for dev key abuse and will revoke it — and deny your production key application if caught.

**Why it happens:**
Developers build the MVP quickly, it works locally, they ship it without applying for a production key first. The approval process takes 20+ business days, creating pressure to ship before key approval.

**How to avoid:**
Apply for a production key as early as possible — ideally in the first phase of development, before the MVP is feature-complete. The application requires a working product demo, a hosted domain with Terms of Service and Privacy Policy pages, and a clear description of the app. Build all of that early.

**Warning signs:**
- App stops working for users every morning around the same time (key expiration)
- Rate limit errors spike under even light usage
- Using `RGAPI-` prefixed keys in any code that will be distributed

**Phase to address:**
Phase 1 (Foundation/API Setup) — apply for production key on day one, build with production key timeline in mind.

---

### Pitfall 2: Live Client Data API Does Not Provide Full TFT Game State

**What goes wrong:**
Developers assume the Riot Live Client Data API (localhost:2999) gives rich TFT state — opponent boards, champion positions, shop contents, augment offers, other players' gold. It does not. The Live Client Data API returns a generic LoL-style JSON payload that is minimal for TFT: primarily local player data only. Opponent synergies, bench champions, carousel data, and board positions are not available.

**Why it happens:**
Riot's Live Client API was built for League of Legends. TFT was adapted onto it and inherits the same limited schema. The GitHub issue requesting richer TFT live data has been open since 2019 with no resolution. Developers only discover this during implementation.

**How to avoid:**
Architect the data pipeline around what is actually available: use the Match History API (TFT-match-v1) for post-game data, and use the Spectator API for live game discovery. For real-time recommendations, accept that you can only read your own player's state from the local API — recommendations must be built from your player's perspective, not from tracking every opponent's board in real time.

**Warning signs:**
- Planning document assumes "read all 8 players' boards in real time"
- Architecture requires polling opponent data faster than once per stage
- Feature list includes tracking what items opponents are holding

**Phase to address:**
Phase 1 (API Research/Data Layer) — verify exactly what fields the Live Client API returns for TFT before designing any recommendation logic.

---

### Pitfall 3: Vanguard Compatibility — Memory Reading Will Break the App

**What goes wrong:**
Riot Vanguard (kernel-level anti-cheat) is active in TFT because it runs inside the League of Legends client. Any tool that reads game memory directly (to extract unit positions, shop state, gold, etc.) will be blocked by Vanguard. There is no allowlist — even legitimate tools get no exception.

**Why it happens:**
Memory reading is the fastest way to get rich game state that the API doesn't expose. Many older overlay tutorials and GitHub repos use memory reading. Developers copy these approaches not realizing Vanguard will block them.

**How to avoid:**
Use only official APIs: the Riot Live Client Data API (localhost:2999), the Riot Games REST API, and the Riot Client LCU. Do not read or write process memory. Do not hook into game DLLs. The entire app must work without touching the game process — only render on top of it and query external APIs.

**Warning signs:**
- Any dependency on reading TFT process memory
- Using libraries designed for memory scanning (Cheat Engine APIs, ReadProcessMemory)
- Features that require data impossible to get from official APIs (exact unit positions mid-fight)

**Phase to address:**
Phase 1 (Architecture Decision) — explicitly document "API-only, no memory access" as a hard constraint before any data layer code is written.

---

### Pitfall 4: Overlay Invisible in Exclusive Fullscreen Mode

**What goes wrong:**
Standard Windows "always on top" transparent windows cannot render over a game running in exclusive fullscreen mode. TFT runs inside the League of Legends client, which defaults to fullscreen on some systems. The overlay appears in the taskbar but is invisible during gameplay.

**Why it happens:**
In exclusive fullscreen, the GPU renders directly to the display buffer, bypassing the Windows Desktop Window Manager (DWM). No external window can composite on top. This only appears at distribution time when users have different display settings.

**How to avoid:**
Target borderless windowed mode explicitly. Document this as a setup requirement. On first launch, detect the window mode (via the LCU API or heuristic checks) and warn the user if the game is in exclusive fullscreen. Test specifically on fullscreen mode during development so the failure is caught early, not at user reports. Overwolf handles this automatically if using that platform.

**Warning signs:**
- Only tested in "Borderless" or "Windowed" mode during development
- No game display mode detection logic
- User reports of "can't see the overlay" on initial release

**Phase to address:**
Phase 2 (Overlay Rendering) — test on all three display modes (fullscreen, borderless windowed, windowed) as a hard acceptance criterion.

---

### Pitfall 5: Riot ToS Policy Changes Breaking Features Mid-Development

**What goes wrong:**
Riot actively updates its third-party app policies. In March 2025, Enemy Ultimate Timers were banned with 48 hours notice — API keys for non-compliant apps were deactivated. In May 2025, in-game advertisements were banned. Any feature that Riot decides gives an "unfair advantage" can be prohibited after your app ships.

**Why it happens:**
Policy is not static. Riot's policy explicitly prohibits features that "draw conclusions for you during gameplay" or "expose information intentionally obfuscated." The line between helpful overlay and prohibited advantage is interpreted by Riot, not the developer.

**How to avoid:**
Before building any recommendation feature, verify it against the current Riot General Developer Policy. The safest recommendations are "this comp is strong this patch" (statistical meta data, not live opponent tracking). Avoid features that predict opponent plays, track hidden information, or automate decisions. Read the policy at project start and subscribe to Riot Developer Relations announcements for changes.

**Warning signs:**
- Features that display information the game UI hides from the player
- Real-time opponent strategy prediction based on their hidden board state
- Any feature that could be described as "drawing conclusions for the player"

**Phase to address:**
Phase 1 (Design/Requirements) — policy review checkpoint before finalizing feature scope.

---

### Pitfall 6: Meta Data Stale Immediately After Patch

**What goes wrong:**
TFT patches release approximately every two weeks (8 patches per set). After a patch, champion stats change, augment values change, and entire comp rankings shift. If the app caches meta data without versioning it to the current patch, users receive wrong recommendations that could actively hurt their games. Data Dragon (Riot's static data) can lag 1-2 days behind a live patch.

**Why it happens:**
Developers fetch meta data once, cache it indefinitely, and assume it stays valid. The recommendation engine then confidently suggests outdated builds as "best in meta."

**How to avoid:**
Version all cached meta data by patch number. On app startup, check the current Data Dragon version against cached version. If different, invalidate cache and fetch fresh data. For scraped meta data from third-party sites (MetaTFT, Mobalytics), include a "last updated: patch X.Y" label in the UI so users know data age. Build the data layer to be patch-agnostic from day one.

**Warning signs:**
- Hard-coded comp names, champion IDs, or augment names in recommendation logic
- No patch version check on startup
- Meta data cache with no expiration or versioning

**Phase to address:**
Phase 2 (Data Layer) — patch-versioned caching must be part of the initial data architecture, not added later.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Use dev API key throughout development | No production key wait | App breaks every 24 hours; denied production key if caught in production | Only for solo local testing, never in a distributed build |
| Hard-code current set's champion/trait data | Fast to build | Requires full rewrite each new TFT set (every ~4 months) | Never — always fetch from Data Dragon |
| Poll Riot API on every game tick | Simpler code | Rate limit exhaustion within minutes; banned key | Never — use staged polling with backoff |
| Scrape meta site HTML directly | No API needed | Breaks when site changes DOM; violates site ToS; Cloudflare blocks | Only for proof of concept, replace with stable data source before shipping |
| Skip display mode detection | Less setup code | Overlay invisible for a significant portion of users | Never in production |
| Build recommendations for opponent tracking | Richer recommendations | Violates Riot ToS on "exposing hidden information" | Never |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Riot Live Client API (localhost:2999) | Assume it's available when TFT is running | Only available when game client is active and a game is in progress; must poll for availability |
| Riot Games REST API | Use one rate limit counter for all endpoints | App rate limits AND method rate limits apply simultaneously; track both separately |
| Riot Data Dragon | Fetch latest version and assume it matches live patch | Data Dragon can lag 1-2 days behind a patch; always check version number, not just "latest" |
| Meta site scraping (MetaTFT, Mobalytics) | Scrape freely as a data source | Sites use Cloudflare bot detection; ToS may prohibit scraping; IP can be blocked; must use official APIs or get permission |
| Production API key | Apply after MVP is built | Requires a working hosted product, domain, ToS page, privacy policy, and 20+ business day wait; apply in Phase 1 |
| Windows overlay z-order | Use SetWindowPos with HWND_TOPMOST | Exclusive fullscreen bypasses DWM; no standard overlay technique works — must require borderless windowed mode |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Transparent Electron window with hardware acceleration enabled | Game drops from 120 FPS to ~20 FPS | Disable hardware acceleration for overlay window OR use Overwolf's compositing | From first user test on any system |
| Polling Riot API more than once per 50ms | Rate limit 429 errors; key suspension | Use staged polling: once per round/stage, not per frame | Immediately — even one enthusiastic poller can exhaust a dev key |
| Fetching full match history on every launch | Slow startup, high API cost | Cache match history locally; only fetch delta since last cached match | At 50+ matches cached |
| Loading all Set data (all champions, all items, all augments) synchronously on startup | 2-5 second startup freeze | Lazy load: fetch only what's needed for current game state | From day one on lower-end machines |
| Re-rendering entire overlay on every API poll | UI jank every poll interval | Diff-based updates; only re-render changed data | Immediately if polling every second |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Bundling API key in distributed Electron app | Key extracted from app bundle, abused by third parties, key revoked | Never bundle keys in client code; use a lightweight backend to proxy API calls |
| No rate limit on your own backend proxy | Third party abuses your backend to exhaust your Riot API quota | Add per-user or per-IP rate limiting on any proxy endpoints |
| Storing user's Riot account credentials locally | Credential theft if machine is compromised | Use Riot's RSO (OAuth) flow for account linking; never store passwords |
| Fetching meta data over HTTP | Man-in-the-middle can inject bad recommendation data | Always use HTTPS for all external data fetching |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing recommendations without confidence context | Users follow low-confidence suggestions from small sample sizes early in patch | Show "sample size: 847 games" or "data from patch 16.5 - may be outdated" |
| Overlay covers important game UI elements | Users miss critical in-game info (augment choices, shop) | Default overlay position to a corner; make fully draggable; allow opacity control |
| No "game not detected" state | Users confused when overlay shows nothing | Explicit states: "Waiting for TFT to launch", "In lobby", "Game in progress" |
| Recommendation updates mid-round | Jarring UI changes while player is making decisions | Lock recommendations per stage; only update between rounds |
| First-time setup requires too many steps | Abandonment before first use | Auto-detect TFT install; auto-detect summoner name from LCU; minimize manual config |

---

## "Looks Done But Isn't" Checklist

- [ ] **API Key**: Production key approved and integrated — verify by checking key type prefix (not `RGAPI-` dev key) and rate limit headers in responses
- [ ] **Overlay Visibility**: Test with game in exclusive fullscreen — overlay must either warn user or be visible; do not assume borderless windowed
- [ ] **Data Freshness**: Patch version displayed in UI and cache invalidation triggers on patch version change — verify by manually bumping the local patch version
- [ ] **Rate Limiting**: App respects both app-level and method-level rate limits simultaneously — verify by adding a rate limit hit counter to logs
- [ ] **Meta Data Source**: Third-party data source has explicit permission for programmatic access OR is using a public API — verify ToS of each source before shipping
- [ ] **Vanguard Compatibility**: Zero memory-reading code paths exist anywhere in the codebase — verify with a grep for ReadProcessMemory, WriteProcessMemory, OpenProcess
- [ ] **Offline Graceful Failure**: App doesn't crash if Riot API is unreachable — verify by blocking API calls and confirming graceful fallback
- [ ] **Set Rotation**: App correctly loads data for new TFT set without code changes — verify by pointing to a previous set's Data Dragon and checking it loads cleanly

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Dev key used in production, key revoked | HIGH | Reapply for production key (20+ day wait); app is broken for all users in the interim |
| Overlay invisible for fullscreen users | MEDIUM | Ship hotfix requiring borderless windowed mode + display instructions in README; implement detection in next release |
| Meta data cache serving wrong patch data | LOW | Push update clearing local cache and bumping Data Dragon version; users re-fetch on next launch |
| Scraper blocked by Cloudflare on meta site | MEDIUM | Switch to a permitted data source or official API; may require partial feature removal |
| Riot ToS violation discovered post-launch | HIGH | Remove offending feature immediately (API key deactivation is possible); submit policy clarification request to Riot Dev Relations |
| API key rate limit exhausted under user load | MEDIUM | Add backend proxy with caching layer; throttle per-user polling; ship as hotfix |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Dev key in production | Phase 1 — apply for production key immediately | Check key prefix in all distributed builds |
| Live Client API data gaps | Phase 1 — map all available fields before designing features | Compare feature list to confirmed API field list |
| Vanguard memory access | Phase 1 — architectural decision documented | Grep codebase for forbidden Win32 calls before each release |
| Exclusive fullscreen invisible overlay | Phase 2 — overlay rendering tests on all display modes | QA checklist: fullscreen, borderless, windowed |
| ToS policy violations | Phase 1 — policy review; Phase 3 — feature review before each release | Each feature mapped to policy section that permits it |
| Stale meta data post-patch | Phase 2 — patch-versioned cache architecture | Simulate patch version bump; confirm cache invalidation |
| Transparent Electron window FPS drop | Phase 2 — performance benchmark on overlay render | FPS delta test: game FPS with overlay vs without |
| Meta site scraping risks | Phase 2 — data source selection | Written confirmation of data access permissions per source |
| API key bundled in app | Phase 1 — backend proxy architecture decision | Code review: no API keys in frontend bundle |
| Recommendation accuracy post-patch | Phase 3 — sample size thresholds, patch version gating | Minimum sample size floor before showing recommendations |

---

## Sources

- [Riot Developer Portal — TFT APIs](https://developer.riotgames.com/docs/tft) — official, HIGH confidence
- [Riot General Developer Policy](https://developer.riotgames.com/policies/general) — official, HIGH confidence
- [Vanguard FAQ for Third Party Applications](https://www.riotgames.com/en/DevRel/vanguard-faq) — official, HIGH confidence
- [Riot Developer Relations — Enemy Ultimate Timers ban announcement](https://x.com/RiotGamesDevRel/status/1899532362637250955) — official, HIGH confidence
- [Riot Developer Relations — In-game ads ban announcement](https://x.com/RiotGamesDevRel/status/1928141776415568329) — official, HIGH confidence
- [Production Key Applications — Riot Support](https://support-developer.riotgames.com/hc/en-us/articles/22801383038867-Production-Key-Applications) — official, HIGH confidence
- [Overwolf Riot Games compliance guide](https://dev.overwolf.com/ow-native/guides/game-compliance/riot-games/) — official Overwolf, MEDIUM confidence
- [Live Client Data API — TFT data gaps (GitHub issue #373)](https://github.com/RiotGames/developer-relations/issues/373) — official Riot repo, HIGH confidence
- [Electron transparent overlay FPS bug (GitHub issue #28439)](https://github.com/electron/electron/issues/28439) — community, MEDIUM confidence
- [DirectX Fullscreen Optimizations — Microsoft DevBlog](https://devblogs.microsoft.com/directx/demystifying-full-screen-optimizations/) — official Microsoft, HIGH confidence
- [Rate Limiting — hextechdocs.dev](https://hextechdocs.dev/rate-limiting/) — community documentation, MEDIUM confidence
- [Data Dragon update timing — riot-api-libraries.readthedocs.io](https://riot-api-libraries.readthedocs.io/en/latest/) — community, MEDIUM confidence

---
*Pitfalls research for: TFT Helper overlay desktop app*
*Researched: 2026-03-12*

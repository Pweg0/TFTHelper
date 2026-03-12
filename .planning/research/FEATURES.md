# Feature Research

**Domain:** TFT (Teamfight Tactics) In-Game Overlay / Helper App
**Researched:** 2026-03-12
**Confidence:** MEDIUM-HIGH (established competitor landscape; Riot API policy details partially blocked)

---

## Competitive Landscape Summary

The four main competitors define what the market expects:

| App | Platform | Positioning | Strengths |
|-----|----------|-------------|-----------|
| **Blitz.gg** | Overwolf + standalone | Generalist multi-game, clean UX | 5 distinct overlays, free tier, augment tiers |
| **Mobalytics** | Overwolf + standalone | Beginner-friendly, curated comps | Expert-curated comp selection, positioning diagrams |
| **MetaTFT** | Overwolf | Feature-dense, data-forward | Lobby scouting, win chance AI, shop alerts, advanced history |
| **TFTactics** | Overwolf | Comprehensive database + coach | Personal coach messages, full database, trait builder |

**What this means:** The market is mature. All four competitors cover core features. Differentiation must come from UX quality, data freshness, or unique insight synthesis — not raw feature count.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Real-time comp recommendations | All major competitors have this; it's the core value proposition | MEDIUM | Must filter by current board state (units owned + items), not just show generic meta list |
| Item recipe cheat sheet | Every TFT player needs this; alt-tabbing to check recipes is a known pain point | LOW | Static data from Data Dragon; show component → combined item mapping |
| Recommended items per champion | Users expect to know "what items does this carry want?" | MEDIUM | Sourced from tier list sites; must update per patch |
| Leveling timing guide | Economy management is a core TFT skill; all competitors display this | LOW | Stage-gated advice: when to level, when to roll, when to save |
| Augment tier display | Blitz, MetaTFT, and Mobalytics all show augment tiers during selection screens | MEDIUM | CRITICAL RISK: Riot policy prohibits displaying augment *win rates*. Tier labels (S/A/B) from curated human tier lists are likely acceptable, but verify |
| Opponent HP / placement tracking | Players need to know who's ahead and who to target | LOW | Available via Riot API / Overwolf GEP |
| All-player board view (scouting) | MetaTFT and TFTactics both offer this; users expect to scout what opponents are playing | HIGH | Requires Overwolf GEP or TFT Spectator API; Riot scouting policy has restrictions — must not "bypass skill test" of tracking boards manually |
| Automatic overlay activation | Overlay should appear when game starts, disappear when game ends | LOW | Standard Overwolf behavior via game events |
| Overlay position/size customization | All competitors allow this; players have different monitor setups | LOW | Drag-and-drop panel positioning |
| Per-patch data updates | TFT patches every 2 weeks; stale data is useless | MEDIUM | Need automated data pipeline from meta sites or Data Dragon |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Context-aware comp recommendation | Instead of showing top 10 meta comps, rank by fit to *current* game state: items in hand, units already owned, contested picks | HIGH | This is the project's stated core value. Scoring formula should weight carry champions heavily (missing carry = 8th place). TacticalFlow blog confirms this approach is technically viable with Overwolf APIs |
| Contested-comp detection | Show when 2+ opponents are playing the same comp you're targeting, reducing value of that path | MEDIUM | Requires reading opponent board data from Overwolf GEP; surfaces strategic value beyond raw comp strength |
| Flexible offline data pipeline | Pre-scrape meta builds at patch time rather than making runtime requests; zero external latency during gameplay | MEDIUM | TacticalFlow blog validates this pattern. Scrape TFTFlow, MetaTFT, or Mobalytics weekly |
| Shop alert / unit notifications | Notify when a key unit for your targeted comp appears in shop | MEDIUM | MetaTFT has this; it reduces cognitive load significantly for reroll comps |
| Win probability estimate | Show estimated round win chance before each fight | HIGH | MetaTFT uses AI for this. Baseline: compare board power scores |
| Early-game transition advice | Show what early boards to play while building toward late-game comp | MEDIUM | Reduces time-to-value for new users; bridges "I have nothing" early game to target comp |
| Trait activation tracker | Show which traits are active, how many units needed for next breakpoint | LOW | Reduces counting errors, useful for splashing traits |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Augment win rate display | "Just show me the best augment statistically" | **Explicitly prohibited by Riot ToS** as of Set 9 (Patch 13.12). Can result in account bans. Apps have been forced to remove this. | Show curated human tier lists (S/A/B) instead — these are allowed |
| Auto-buy / auto-position | Maximum convenience, remove tedium | Violates Riot anti-cheat policies. The overlay cannot interact with the game process, only read API and render on top | Show recommendations, require player to act |
| Live win-rate filtering for comps | "Show only comps above 60% win rate" | Riot policy prohibits displaying win rates for Augments; comp win rates are a grey area that could trigger policy action | Show tier labels (S/A/B/C) rather than raw win rate percentages |
| Memory reading / process injection | More data available than official APIs | Against Riot Terms of Service; ban risk; fragile to game updates | Use Overwolf GEP + official Riot API exclusively |
| Streaming / social features | Sharing boards with Twitch chat | Out of scope per PROJECT.md; adds significant complexity with no core value | Keep as personal tool; streaming is a v2+ concern |
| Full match history browser | "Let me review all my past games" | Not an overlay feature — it's a website feature. Adds backend persistence complexity | Focus on live match; post-match summary is acceptable but deep history is out of scope for MVP |
| Mobile companion app | "I want to check comps on my phone" | Desktop only per PROJECT.md; mobile is a separate product with separate API constraints | N/A for this project |

---

## Feature Dependencies

```
[Riot API / Overwolf GEP Integration]
    └──required by──> [All Player Board View (Scouting)]
    └──required by──> [Opponent HP / Placement Tracking]
    └──required by──> [Shop Alert / Unit Notifications]
    └──required by──> [Contested Comp Detection]
    └──required by──> [Win Probability Estimate]

[Meta Build Data Pipeline]
    └──required by──> [Comp Recommendations]
                          └──required by──> [Context-Aware Comp Ranking]
    └──required by──> [Item Recommendations per Champion]
    └──required by──> [Augment Tier Display]

[Comp Recommendations]
    └──enhances──> [Item Recipe Cheat Sheet] (once a comp is selected, show its specific items)
    └──enhances──> [Leveling Timing Guide] (guide adapts to which comp is targeted)

[Context-Aware Comp Ranking]
    └──requires──> [Comp Recommendations] (base list to score against)
    └──requires──> [All Player Board View] (for contested comp detection)

[Automatic Overlay Activation]
    └──required by──> [Everything] (overlay must know game is live)
```

### Dependency Notes

- **Riot API / Overwolf GEP is the foundation:** All live game features depend on this. This must be Phase 1.
- **Meta Build Data Pipeline before Comp Recommendations:** Can't recommend comps without meta data. Even a static JSON file from Data Dragon is sufficient to unblock MVP.
- **Context-Aware Ranking requires both comp data AND board state:** These two tracks must converge before the core differentiator works.
- **Augment tier display is technically independent** but carries policy risk — isolate it so it can be removed if Riot tightens policies further.

---

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept.

- [ ] Riot API / Overwolf GEP connection — live game detection, player data
- [ ] Meta build data pipeline — scrape/fetch comp + item data at patch time, store locally
- [ ] Comp recommendations panel — show top meta comps filtered by owned units and items
- [ ] Item cheat sheet — recipe lookup + recommended items for selected comp's carries
- [ ] Leveling timing guide — stage-based economy advice
- [ ] All-player board view — HP, level, and what each opponent is playing
- [ ] Automatic overlay activation — shows when game starts, hides when game ends
- [ ] Overlay customization — moveable panels, toggle visibility

### Add After Validation (v1.x)

Features to add once core is working and data pipeline is stable.

- [ ] Augment tier display — show S/A/B tier labels during augment selection (must verify current Riot policy before shipping)
- [ ] Shop alert / unit notifications — ping when target comp pieces appear in shop
- [ ] Contested comp detection — warn when 2+ opponents are building the same comp
- [ ] Trait activation tracker — show active traits and breakpoints
- [ ] Early-game transition advice — what to play before target comp comes online

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Win probability estimate — complex, requires statistical modeling or ML; high effort, nice to have
- [ ] Post-match summary — "how did this match go?" lightweight history panel
- [ ] Pro player board analysis — import and learn from high-rank replays
- [ ] Carousel priority advisor — recommend which items to grab from carousel based on target comp

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Riot API / Overwolf GEP integration | HIGH | MEDIUM | P1 |
| Meta build data pipeline | HIGH | MEDIUM | P1 |
| Context-aware comp recommendations | HIGH | HIGH | P1 |
| All-player board view (HP, level, comp) | HIGH | MEDIUM | P1 |
| Item cheat sheet | HIGH | LOW | P1 |
| Automatic overlay activation | HIGH | LOW | P1 |
| Leveling timing guide | MEDIUM | LOW | P1 |
| Overlay panel customization | MEDIUM | LOW | P1 |
| Augment tier display | MEDIUM | LOW | P2 (policy risk) |
| Shop alert / unit notifications | HIGH | MEDIUM | P2 |
| Contested comp detection | HIGH | MEDIUM | P2 |
| Trait activation tracker | MEDIUM | LOW | P2 |
| Early-game transition advice | MEDIUM | MEDIUM | P2 |
| Win probability estimate | MEDIUM | HIGH | P3 |
| Post-match summary | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

| Feature | Blitz.gg | Mobalytics | MetaTFT | TFTactics | Our Approach |
|---------|----------|------------|---------|-----------|--------------|
| Comp recommendations | Yes, curated list | Yes, expert-curated, user picks target comp | Yes, meta-ranked | Yes, with tier labels | Ranked by fit to *current board state* — this is the differentiator |
| Item recommendations | Yes, per comp | Yes, carousel priority + cheat sheet | Yes, per unit based on owned items | Yes | Per champion for selected comp; filter by items already owned |
| Augment tier display | Yes (tier labels) | Not prominently | Yes, with tags | Limited | Tier labels only (S/A/B), never win rates — policy compliance required |
| All-player scouting | Basic matchup tracking | Not prominent | Strong — lobby scouting, rank display, rounds since fought | Limited | All 8 players: HP, level, units on board |
| Leveling guide | Yes, XP overlay | Yes, stage-by-stage | Limited | Yes | Stage-gated advice, adapts to targeted comp |
| Shop alerts | No | No | Yes | No | Yes — key differentiator to add post-MVP |
| Contested comp warning | No | No | Partial (lobby tendencies) | No | Yes — unique angle, surface comp conflict before it's too late |
| Win probability | No | No | Yes (AI-based) | No | v2+ |
| Offline data pipeline | Unknown | Unknown | Likely server-fetched | Unknown | Local data at patch time — zero gameplay latency |
| Overwolf platform | Yes | Yes | Yes | Yes | Likely Overwolf (GEP required for board state data) |

---

## Critical Policy Constraints

These are not features but constraints that affect feature design:

**Riot Terms of Service restrictions (MEDIUM confidence — official page returned 403, sourced from Overwolf GEP docs + Dotesports reporting):**

1. **Augment win rates are prohibited.** Cannot display numerical win rate for augments anywhere in the app. Use curated tier labels (S/A/B) sourced from human expert lists.
2. **Scouting must not "bypass skill tests."** The TFT Spectator API (released March 2024) explicitly added clarification to the scouting policy. Apps may show opponent boards but cannot aggregate tracking in a way that replaces a player's own scouting effort. Verify exact language before shipping lobby scouting.
3. **No process injection / memory reading.** Overlay must read only Overwolf GEP or official Riot API. Cannot interact with the game process.
4. **Apps cannot "dictate player decisions."** Recommendations must inform, not automate. Framing matters: "Consider this comp" vs "You must play this comp."
5. **Comp win rates** — grey area. Riot policy explicitly mentions Augment and Legend win rates. General comp win rates from aggregate match data appear to still be displayed by MetaTFT and Mobalytics. Flag as MEDIUM risk; monitor.

---

## Data Availability Reality Check

| Data Point | Available Via | Notes |
|------------|--------------|-------|
| Player HP, level, gold | Overwolf GEP | Standard events |
| Own board units + items | Overwolf GEP | Per unit: position, level, items |
| Own shop contents | Overwolf GEP | 5 shop slots |
| Opponent board units | Overwolf GEP | Available; scouting policy applies |
| Augments chosen by player | Overwolf GEP | Available; cannot show win rates for them |
| Round outcomes | Overwolf GEP | Win/loss, damage taken |
| Champion/item static data | Data Dragon | JSON files, updated per patch |
| Meta comp tier lists | Third-party sites (MetaTFT, TFTFlow, Mobalytics) | No official API; requires scraping or manual curation |
| Augment tier labels | Third-party sites (human curated) | Safe to display; numerical win rates are not |
| Opponent augments | Not reliably available | Riot Spectator API returns participant data without detailed augment state mid-game |

---

## Sources

- [Blitz.gg TFT Overlays feature page](https://blitz.gg/overlays/tft)
- [Mobalytics TFT Overlay page](https://mobalytics.gg/tft-overlay/)
- [Mobalytics TFT Overlay usage guide](https://mobalytics.gg/blog/tft/how-to-use-the-mobalytics-tft-overlay/)
- [MetaTFT Overwolf app listing](https://www.overwolf.com/app/metatft.com-metatft)
- [How to Use the MetaTFT App](https://ghost.metatft.com/how-to-use-the-metatft-app/)
- [Overwolf GEP: Teamfight Tactics game events documentation](https://dev.overwolf.com/ow-native/live-game-data-gep/supported-games/teamfight-tactics/)
- [Riot Developer Portal: TFT documentation](https://developer.riotgames.com/docs/tft)
- [Riot Games DevRel: TFT Spectator API announcement (March 2024)](https://x.com/RiotGamesDevRel/status/1768386870617030891)
- [Dotesports: Riot shuts down augment win-rate data (Patch 13.12)](https://dotesports.com/tft/news/riot-shuts-down-unhealthy-win-rate-data-through-updated-api-policy-in-tft-patch-13-12)
- [TacticalFlow overlay blog: technical approach with Overwolf APIs](https://inusha.dev/blog/tft_tactical_overlay)
- [1v9.gg: Best TFT companion apps comparison](https://1v9.gg/blog/best-tft-companion-apps)
- [Mobi.gg: Best TFT tools overview](https://mobi.gg/en/tips/best-tft-tools/)

---

*Feature research for: TFT Helper overlay desktop app*
*Researched: 2026-03-12*

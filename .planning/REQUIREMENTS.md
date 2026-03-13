# Requirements: TFT Helper

**Defined:** 2026-03-12
**Core Value:** Recomendar a melhor composição possível para a partida atual, considerando o que os outros jogadores estão fazendo, os augments disponíveis e os itens do jogador.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Dados e Integração

- [x] **DATA-01**: App conecta com Riot Live Client API para detectar partida ativa de TFT
- [x] **DATA-02**: App baixa e cacheia dados estáticos de campeões, traits, itens e augments via CommunityDragon
- [x] **DATA-03**: App coleta e cacheia meta builds (comps, winrates) de sites como MetaTFT/Mobalytics ao iniciar
- [ ] **DATA-04**: App lê board state do jogador local via OCR (composição, itens, nível de estrela)
- [ ] **DATA-05**: App lê a shop do jogador via OCR (5 campeões disponíveis)
- [ ] **DATA-06**: App lê board state dos oponentes via OCR na tela de scouting (Tab)
- [ ] **DATA-07**: App lê gold, level e HP do jogador local (Live Client API + OCR)

### Overlay

- [x] **OVER-01**: App exibe overlay transparente always-on-top sobre a janela do TFT
- [ ] **OVER-02**: Overlay mostra painel completo com todas as informações simultaneamente
- [ ] **OVER-03**: Overlay destaca campeões na shop que o jogador já possui (camada dourada transparente)

### Scouting

- [ ] **SCOU-01**: Overlay mostra composições completas de todos os jogadores da partida (via OCR scouting)
- [ ] **SCOU-02**: Overlay mostra level e HP de cada jogador
- [ ] **SCOU-03**: Overlay mostra itens dos campeões dos outros jogadores

### Recomendação

- [ ] **RECO-01**: App recomenda melhor composição baseada no board atual e meta builds
- [ ] **RECO-02**: App recomenda combinações de itens ideais para os campeões da comp sugerida
- [ ] **RECO-03**: App mostra sinergias e recomendações baseadas nos augments escolhidos
- [ ] **RECO-04**: App exibe winrate de augments na tela de seleção

## Technical Notes

### Data Sources
- **Live Client API** (localhost:2999): Game detection, gold, level, player names. Does NOT provide TFT board state.
- **OCR** (screen capture + recognition): Board composition, shop, items, HP, scouting. Primary data source for TFT-specific information.
- **CommunityDragon CDN**: Static champion/item/augment data and icons.
- **MetaTFT/tactics.tools**: Meta comp winrates and tier lists (scraped at startup).

### OCR Constraints
- Requires fixed resolution (1920x1080 borderless/windowed fullscreen)
- Coordinate-based region detection — may break on TFT UI patches
- ~100-500ms per scan cycle
- Reference implementation: TFT-OCR-BOT (github.com/jfd02/TFT-OCR-BOT)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Pré-jogo

- **PRE-01**: Navegar e estudar meta comps fora de partida
- **PRE-02**: Planejar estratégias antes de entrar numa partida

### Histórico

- **HIST-01**: Visualizar histórico de partidas com stats
- **HIST-02**: Tracking de evolução de rank

## Out of Scope

| Feature | Reason |
|---------|--------|
| App mobile | Desktop only — overlay precisa rodar sobre o cliente do jogo |
| Automação de jogo (auto-buy, auto-position) | Apenas informação/recomendação, sem interação com o jogo |
| Streaming/social features | Ferramenta pessoal |
| Suporte a outros jogos | Foco exclusivo em TFT |
| Memory reading | Bloqueado pelo Vanguard (anti-cheat kernel-level) |
| Overwolf GEP | Requer parceria + ads + distribuição Overwolf, conflita com plano de .exe privado |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 1 | Complete |
| DATA-02 | Phase 1 | Complete |
| DATA-03 | Phase 1 | Complete |
| DATA-04 | Phase 3 | Pending |
| DATA-05 | Phase 3 | Pending |
| DATA-06 | Phase 4 | Pending |
| DATA-07 | Phase 2 | Pending |
| OVER-01 | Phase 2 | Complete |
| OVER-02 | Phase 4 | Pending |
| OVER-03 | Phase 3 | Pending |
| SCOU-01 | Phase 4 | Pending |
| SCOU-02 | Phase 4 | Pending |
| SCOU-03 | Phase 4 | Pending |
| RECO-01 | Phase 5 | Pending |
| RECO-02 | Phase 5 | Pending |
| RECO-03 | Phase 5 | Pending |
| RECO-04 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0

---
*Requirements defined: 2026-03-12*
*Last updated: 2026-03-12 — restructured for OCR-based data collection after Live Client API limitation discovery*

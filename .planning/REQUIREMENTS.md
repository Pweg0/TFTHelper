# Requirements: TFT Helper

**Defined:** 2026-03-12
**Core Value:** Recomendar a melhor composição possível para a partida atual, considerando o que os outros jogadores estão fazendo, os augments disponíveis e os itens do jogador.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Dados e Integração

- [ ] **DATA-01**: App conecta com Riot Live Client API para detectar partida ativa de TFT
- [ ] **DATA-02**: App baixa e cacheia dados estáticos de campeões, traits, itens e augments via CommunityDragon
- [ ] **DATA-03**: App coleta e cacheia meta builds (comps, winrates) de sites como MetaTFT/Mobalytics ao iniciar
- [ ] **DATA-04**: App lê board state de todos os jogadores da partida (comps, itens, level, HP)

### Overlay

- [ ] **OVER-01**: App exibe overlay transparente always-on-top sobre a janela do TFT
- [ ] **OVER-02**: Overlay mostra painel completo com todas as informações simultaneamente
- [ ] **OVER-03**: Overlay destaca campeões na shop que o jogador já possui (camada dourada transparente)

### Scouting

- [ ] **SCOU-01**: Overlay mostra composições completas de todos os jogadores da partida
- [ ] **SCOU-02**: Overlay mostra level e HP de cada jogador
- [ ] **SCOU-03**: Overlay mostra itens dos campeões dos outros jogadores

### Recomendação

- [ ] **RECO-01**: App recomenda melhor composição baseada no board atual e meta builds
- [ ] **RECO-02**: App recomenda combinações de itens ideais para os campeões da comp sugerida
- [ ] **RECO-03**: App mostra sinergias e recomendações baseadas nos augments escolhidos
- [ ] **RECO-04**: App exibe winrate de augments na tela de seleção

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

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 1 | Pending |
| DATA-02 | Phase 1 | Pending |
| DATA-03 | Phase 1 | Pending |
| DATA-04 | Phase 2 | Pending |
| OVER-01 | Phase 2 | Pending |
| OVER-02 | Phase 3 | Pending |
| OVER-03 | Phase 3 | Pending |
| SCOU-01 | Phase 3 | Pending |
| SCOU-02 | Phase 3 | Pending |
| SCOU-03 | Phase 3 | Pending |
| RECO-01 | Phase 4 | Pending |
| RECO-02 | Phase 4 | Pending |
| RECO-03 | Phase 4 | Pending |
| RECO-04 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 14 total
- Mapped to phases: 14
- Unmapped: 0

---
*Requirements defined: 2026-03-12*
*Last updated: 2026-03-12 — traceability filled after roadmap creation*

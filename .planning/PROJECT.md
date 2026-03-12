# TFT Helper

## What This Is

Um overlay desktop para Teamfight Tactics que analisa a partida em tempo real via Riot API, mostra as composições de todos os jogadores, e recomenda a melhor build considerando os augments, itens e estado atual do jogo. Cruza dados com sites de meta builds para sugerir a composição ideal.

## Core Value

Recomendar a melhor composição possível para a partida atual, considerando o que os outros jogadores estão fazendo, os augments disponíveis e os itens do jogador.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Conectar com Riot API para capturar dados da partida ao vivo
- [ ] Exibir overlay transparente por cima da tela do TFT
- [ ] Mostrar comps, level e HP de todos os jogadores
- [ ] Integrar com site de meta builds (melhor disponível: Mobalytics, MetaTFT, etc.)
- [ ] Recomendar melhor composição baseada no estado atual da partida
- [ ] Mostrar combinações de itens ideais para os campeões recomendados
- [ ] Considerar augments do jogador na recomendação
- [ ] Painel completo com todas as informações visíveis simultaneamente

### Out of Scope

- Funcionalidades fora do jogo (browser de comps, estudo) — foco é overlay ao vivo
- App mobile — desktop only
- Automação de jogo (auto-buy, auto-position) — apenas informação/recomendação
- Streaming/social features — ferramenta pessoal

## Context

- TFT é um auto-battler da Riot Games que roda no cliente League of Legends
- Riot Games disponibiliza API pública para dados de partida (necessita API key)
- O jogo tem sets que mudam periodicamente (campeões, traits, augments)
- Overlay precisa funcionar sem interferir com o jogo (anti-cheat compatível)
- Sites como Mobalytics, MetaTFT e TFTactics disponibilizam dados de meta/winrate

## Constraints

- **Anti-cheat**: Overlay não pode interagir com o processo do jogo, apenas ler API e renderizar por cima
- **Riot API**: Rate limits da API precisam ser respeitados
- **Performance**: Overlay precisa ser leve para não afetar FPS do jogo
- **Set rotation**: Dados de meta mudam a cada set/patch, sistema precisa ser adaptável

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Riot API para dados de partida | Confiável, oficial, sem risco de ban | — Pending |
| Overlay desktop (tech a pesquisar) | Pesquisa vai determinar melhor framework | — Pending |
| Fonte de meta builds a pesquisar | Usar a que tiver melhor API/dados disponíveis | — Pending |

## Current Milestone: v1.0 TFT Helper MVP

**Goal:** Criar o overlay funcional que lê dados da partida ao vivo e recomenda a melhor composição.

**Target features:**
- Conexão com Riot API para dados ao vivo
- Overlay desktop transparente sobre o TFT
- Painel com info de todos os jogadores
- Integração com meta builds
- Sistema de recomendação de comps e itens

---
*Last updated: 2026-03-12 after milestone v1.0 started*

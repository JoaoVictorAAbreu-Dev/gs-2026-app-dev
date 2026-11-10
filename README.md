Integrantes: João Victor Alves de Abreu (RM 564946) e Rodrigo Kenshin Viana Matayoshi (RM 564026).

# Território Seguro

Aplicação web para **relatos comunitários dos efeitos da chuva em Itaquaquecetuba (SP)**. Global Solution 2026.2 — Application Development (FIAP).

## Problema
A chuva forte causa alagamentos, bueiros entupidos, água dentro de casa, erosão e ruas danificadas. Muita coisa só aparece nos registros oficiais depois, ou nunca. Quem mora no bairro sabe primeiro, mas não tem um jeito simples de registrar e de ver o conjunto.

## Público
Moradores do município, inclusive quem lê com dificuldade: o formulário usa figuras, botões "Ouvir", letra ajustável, alto contraste, ditado por voz e Libras (VLibras).

## Objetivo
Registrar relatos em poucos passos e somá-los em indicadores que mostram **quais tipos de problema e quais bairros** concentram mais ocorrências, e onde a atenção deve ser maior nos últimos 7 dias. Os números são relatos comunitários, **não alertas oficiais**.

## ODS
- **ODS 11** — Cidades e Comunidades Sustentáveis
- **ODS 13** — Ação contra a Mudança Global do Clima

## Tecnologias
HTML, CSS e JavaScript (sem framework) · Node.js ≥ 22.9 · Express 5 · MongoDB (driver oficial).

## Como executar
```bash
npm install
cp .env.example .env        # ajuste MONGODB_URI (local ou Atlas)
npm run seed                # opcional: 42 relatos fictícios de demonstração
npm start                   # http://localhost:3000
```
Outros comandos: `npm run dev` (reinicia ao salvar) e `npm test` (testes sem precisar de banco).

Páginas: `/` início · `/registrar` formulário · `/relatos` listagem · `/painel` indicadores · qualquer outro endereço mostra a página 404.

## Rotas
| Método | Rota | O que faz |
|---|---|---|
| GET | `/api/relatos` | Lista paginada (`pagina`, `limite`) com filtros `categoria`, `impacto`, `bairro` |
| POST | `/api/relatos` | Valida e grava um relato (201) ou devolve erros por campo (422) |
| GET | `/api/indicadores` | Total, resumo por categoria/impacto/bairro e atenção por bairro |
| GET | `/api/bairros` | Bairros já usados (sugestões do formulário) |

Coleção `relatos`: `categoria`, `impacto`, `bairro`, `dataEvento`, `descricao`, `criadoEm`, `ficticio` (validador `$jsonSchema` + índices criados na inicialização).

## Indicadores (explicação)
1. **Total de relatos e resumo por categoria e por impacto** — o MongoDB faz a contagem com `aggregate`/`$group`; o servidor calcula o percentual de cada grupo (uma casa decimal).
2. **Bairros com mais relatos** — top 5, com os demais agrupados em "Outros N bairros".
3. **Atenção por bairro (últimos 7 dias)** — compara os 7 dias mais recentes com os 7 anteriores.
   - *Alta*: 5 ou mais relatos, ou 2 ou mais de impacto alto.
   - *Moderada*: 2 a 4 relatos, ou 1 de impacto alto.
   - Caso contrário, "Sem sinal". A **tendência** (subindo, estável, caindo) vem da comparação com a janela anterior.

A regra é um sinal para olhar com cuidado, não uma previsão nem um alerta oficial.

## Estrutura
```
src/        servidor (app, rotas, controlador, validação, serviço de indicadores, repositório MongoDB)
public/     páginas HTML, css/ (camadas), js/ (módulos ES), img/
scripts/    seed de dados fictícios
tests/      testes com node:test (validação, indicadores, controlador)
```

## Recursos modernos usados
Express 5 (erros assíncronos vão ao middleware) · `node --test` e `--env-file-if-exists` · CSS `@layer`, nesting nativo, `:has()`, container queries, `:user-invalid`, `field-sizing`, view transitions, animações por rolagem (com `@supports`) · HTML `<search>`, `<dialog closedby>`, `popover`, `<details name>` · custom element `<ts-barras>` · `Promise.withResolvers` · `speechSynthesis` e `SpeechRecognition` com detecção de suporte · `prefers-reduced-motion`.

## Limites e honestidade
- Dados de demonstração são marcados como "Exemplo" (`ficticio: true`) e o seed só apaga esses.
- A fonte Public Sans vem do Google Fonts; sem internet, o site usa a fonte do sistema.
- O VLibras só é carregado se a pessoa clicar em "Libras" (serviço externo do governo federal).
- O ditado por voz depende do navegador e pode enviar o áudio ao serviço dele.
- Fotos: crédito do bueiro ainda a confirmar (ver rodapé).
- Não há autenticação nem moderação: protótipo acadêmico.

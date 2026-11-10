# Roteiro do vídeo pitch — Território Seguro

Duração do rascunho: **2 min 46 s** (o edital pede de 2 a 3 minutos). Cerca de 370 palavras, em ritmo calmo.
Os tempos abaixo são os do arquivo `territorio-seguro-pitch-rascunho.mp4`; na edição final as cenas são ajustadas ao áudio gravado.

| # | Tempo | Na tela | Critério da avaliação |
|---|---|---|---|
| 1 | 0:00–0:13 | Cartão de abertura | Introdução: problema |
| 2 | 0:13–0:33 | Página inicial: chamada, "como funciona", dados do município | Introdução: problema e público |
| 3 | 0:33–0:48 | Tipos de relato + cartão dos ODS | Introdução: objetivo e ODS |
| 4 | 0:48–1:25 | Formulário: Ouvir, A+, alto contraste, erros, preenchimento, envio | Implementação: interface, POST, MongoDB |
| 5 | 1:25–1:43 | Listagem: relato novo no topo, filtro, "Carregar mais" | Processamento: consulta e listagem |
| 6 | 1:43–2:15 | Painel: números, gráficos, atenção por bairro, regra | Processamento: 2 indicadores |
| 7 | 2:15–2:32 | Formulário no celular + página 404 | Implementação: responsivo e 404 |
| 8 | 2:32–2:46 | Cartão de encerramento com as tecnologias | Documentação e fechamento |

## Narração

**1 — Abertura (0:00)**
Em Itaquaquecetuba, quando a chuva forte chega, ruas alagam, bueiros entopem e a água entra nas casas. Quem mora no bairro vê primeiro, mas não tem onde registrar.

**2 — Problema e público (0:13)**
O município tem 167 setores de risco mapeados e cerca de 10% dos domicílios em áreas sujeitas a inundação. O Território Seguro é um site onde qualquer morador conta, em dois minutos, o que a chuva causou perto dele: sem cadastro, sem nome e sem telefone.

**3 — Objetivo e ODS (0:33)**
O objetivo é somar esses relatos para mostrar quais problemas e quais bairros concentram mais ocorrências. O projeto atende ao ODS 11, cidades e comunidades sustentáveis, e ao ODS 13, ação contra a mudança do clima.

**4 — Registrar um relato (0:48)**
O formulário tem cinco perguntas e foi pensado para quem lê com dificuldade: a pessoa escolhe uma figura, o nível da água, o bairro e o dia. Cada pergunta tem um botão para ouvir o texto, e dá para aumentar a letra, ligar o alto contraste, usar Libras ou falar em vez de escrever. Se faltar alguma resposta, o site mostra o que corrigir. Ao enviar, a rota POST do Express valida os dados de novo no servidor e grava o relato em uma coleção do MongoDB.

**5 — Listagem (1:25)**
Na listagem, uma rota GET consulta o banco e mostra os relatos do mais recente ao mais antigo, com filtros por tipo de problema, impacto e bairro. O relato que acabamos de enviar já aparece no topo.

**6 — Painel e indicadores (1:43)**
O painel traz os indicadores. O primeiro é o total de relatos, com o resumo por categoria e por impacto, calculado com agregação no MongoDB. O segundo é a atenção por bairro: comparamos os últimos sete dias com os sete anteriores. Cinco relatos ou mais, ou dois de impacto alto, colocam o bairro em atenção alta, e a tendência mostra se a situação está subindo ou caindo. É um sinal da comunidade, não um alerta oficial.

**7 — Celular e 404 (2:15)**
No celular, o formulário vira uma pergunta por tela, com botões grandes. E qualquer endereço que não existe leva a uma página de erro 404, com o caminho de volta.

**8 — Encerramento (2:32)**
O projeto usa HTML, CSS e JavaScript na interface, Node.js com Express no servidor e MongoDB no banco, com testes automatizados. Território Seguro: cada relato ajuda o bairro a enxergar o problema.

## Dicas para gravar o áudio
- Grave um arquivo por cena (8 arquivos) ou um arquivo único com uma pausa de 2 segundos entre as cenas: facilita o corte.
- Lugar silencioso, celular a um palmo da boca, sem encostar no microfone.
- Se errar, pare, respire e repita a frase inteira; o erro é cortado na edição.
- Os dois integrantes podem dividir: um fala as cenas 1 a 4, o outro as cenas 5 a 8.
- Os números do painel no vídeo são de dados fictícios de demonstração; a narração não cita esses valores.

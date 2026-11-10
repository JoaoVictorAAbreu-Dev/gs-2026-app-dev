# Design

O protótipo de interface foi feito no Figma antes do código e o CSS usa os mesmos tokens (cores, espaçamentos, raios e tipografia).

- Arquivo: https://www.figma.com/design/NYu89a4RQQoQ0SCPxUGbUJ
- Telas de desktop: D01 início · D02–D04 formulário (perguntas, erros, sucesso) · D05–D06 relatos · D07 painel · D08 404
- Telas de celular: M02 (formulário em passos) · M09 (painel)

## Decisões de acessibilidade
- Perguntas com figuras e frases curtas, para quem lê com dificuldade; botão "Ouvir" em cada pergunta.
- Letra ajustável (A−/A+), alto contraste, ditado por voz e Libras (VLibras) sob demanda.
- O número de cada barra do gráfico sempre aparece escrito; a cor nunca é a única informação.
- Respeita `prefers-reduced-motion`.

## Movimento (microinterações do Figma)
Implementadas em `public/css/componentes.css`, seção "Movimento":

| Onde | Animação |
|---|---|
| Botões | hover em 150 ms (fundo, sombra, seta anda 6 px); pressionar em 80 ms |
| Figuras, nível da água e data | hover em 150 ms; ao escolher, o ✓ "salta" em 250 ms; tocar de novo desmarca |
| Ouvir | ondas sonoras em loop de 350 ms e rótulo "Parar" enquanto lê |
| Falar | ponto vermelho pulsando (1,2 s) e rótulo "Ouvindo… toque para parar" |
| Sucesso | círculo cresce e o ✓ se desenha em 450 ms |

Com `prefers-reduced-motion`, tudo vira troca instantânea; o estado continua indicado por cor, ícone e texto.

## Quando um recurso do navegador falha
Ouvir, Falar e Libras dependem do navegador. Toda falha vira uma frase visível (não só para leitor de tela):
microfone bloqueado, sem microfone, sem internet para o reconhecimento, navegador sem voz instalada, VLibras fora do ar.

## Créditos das imagens
Juan Pablo, Conrado Junior e Vitaly Gariev (Unsplash License); Connor Scott McManus (Licença Pexels); foto do bueiro: fonte a confirmar.

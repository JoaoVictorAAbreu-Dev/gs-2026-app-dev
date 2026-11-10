// Botões "Ouvir": leitura em voz alta com a síntese de voz do próprio navegador (speechSynthesis).
// Funciona sem internet e sem enviar texto a nenhum serviço. Sem suporte, os botões somem.
//
// Uso no HTML:
//   <button data-ouvir="#titulo, #dica">   lê o texto desses elementos
//   <button data-ouvir-texto="...">        lê um texto montado pelo JavaScript

export const podeFalar = 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function';

let botaoAtivo = null;

function marcar(botao) {
  botaoAtivo?.setAttribute('aria-pressed', 'false');
  botaoAtivo = botao;
  botao?.setAttribute('aria-pressed', 'true');
}

/** Quebra em frases curtas: alguns navegadores cortam falas muito longas no meio. */
function emTrechos(texto, maximo = 220) {
  const frases = texto.replace(/\s+/g, ' ').trim().split(/(?<=[.!?:])\s+/);
  const trechos = [];
  for (const frase of frases) {
    const ultimo = trechos.at(-1);
    if (ultimo && ultimo.length + frase.length < maximo) trechos[trechos.length - 1] = `${ultimo} ${frase}`;
    else trechos.push(frase);
  }
  return trechos.filter(Boolean);
}

export function pararFala() {
  if (!podeFalar) return;
  window.speechSynthesis.cancel();
  marcar(null);
}

/** Lê o texto. Tocar de novo no mesmo botão interrompe a leitura. */
export function falar(texto, botao = null) {
  if (!podeFalar || !texto?.trim()) return;
  const eraEste = botao !== null && botao === botaoAtivo;
  window.speechSynthesis.cancel();
  marcar(null);
  if (eraEste) return;

  const trechos = emTrechos(texto);
  marcar(botao);
  trechos.forEach((trecho, i) => {
    const fala = new window.SpeechSynthesisUtterance(trecho);
    fala.lang = 'pt-BR';
    fala.rate = 0.95;
    if (i === trechos.length - 1) {
      const terminar = () => {
        if (botaoAtivo === botao) marcar(null);
      };
      fala.onend = terminar;
      fala.onerror = terminar;
    }
    window.speechSynthesis.speak(fala);
  });
}

function textoDoBotao(botao) {
  if (botao.dataset.ouvirTexto) return botao.dataset.ouvirTexto;
  const alvos = document.querySelectorAll(botao.dataset.ouvir);
  return [...alvos].map((alvo) => alvo.innerText).join('. ');
}

export function ligarBotoesOuvir() {
  for (const botao of document.querySelectorAll('[data-ouvir], [data-ouvir-texto]')) {
    botao.hidden = !podeFalar;
    botao.setAttribute('aria-pressed', 'false');
  }
  if (!podeFalar) return;

  // Um só ouvinte para a página inteira: vale também para botões criados depois.
  document.addEventListener('click', (evento) => {
    const botao = evento.target.closest('[data-ouvir], [data-ouvir-texto]');
    if (botao) falar(textoDoBotao(botao), botao);
  });
  window.addEventListener('pagehide', pararFala);
}

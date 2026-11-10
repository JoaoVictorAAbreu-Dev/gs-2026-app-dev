// Botões "Ouvir": leitura em voz alta com a síntese de voz do próprio navegador (speechSynthesis).
// Funciona sem enviar texto a nenhum serviço. Sem suporte, os botões somem.
//
// Uso no HTML:
//   <button data-ouvir="#titulo, #dica">   lê o texto desses elementos
//   <button data-ouvir-texto="...">        lê um texto montado pelo JavaScript
//
// O botão pode ter <span data-rotulo>Ouvir</span>: o texto vira "Parar" enquanto lê.

import { avisar } from './dom.js';

export const podeFalar = 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function';

// Alguns navegadores (comum no Linux) têm a função, mas nenhuma voz instalada: o botão
// ficaria "lendo" em silêncio. Se a fala não começar neste prazo, avisamos a pessoa.
const PRAZO_PARA_COMECAR_MS = 4000;
const TAMANHO_DO_TRECHO = 220;
const SEM_VOZ = 'Este navegador não tem voz para ler em voz alta. Tente no Google Chrome ou no Edge.';

let botaoAtivo = null;
let vigia = null;

function marcar(botao) {
  for (const [alvo, ligado] of [[botaoAtivo, false], [botao, true]]) {
    if (!alvo) continue;
    alvo.setAttribute('aria-pressed', String(ligado));
    const rotulo = alvo.querySelector('[data-rotulo]');
    if (rotulo) {
      rotulo.dataset.rotulo ||= rotulo.textContent;
      rotulo.textContent = ligado ? 'Parar' : rotulo.dataset.rotulo;
    }
  }
  botaoAtivo = botao;
}

/** Quebra em frases curtas: alguns navegadores cortam falas muito longas no meio. */
function emTrechos(texto, maximo = TAMANHO_DO_TRECHO) {
  const frases = texto.replace(/\s+/g, ' ').trim().split(/(?<=[.!?:])\s+/);
  const trechos = [];
  for (const frase of frases) {
    const ultimo = trechos.at(-1);
    if (ultimo && ultimo.length + frase.length < maximo) trechos[trechos.length - 1] = `${ultimo} ${frase}`;
    else trechos.push(frase);
  }
  return trechos.filter(Boolean);
}

/** Prefere uma voz em português do Brasil; sem ela, deixa o navegador escolher. */
function vozEmPortugues() {
  const vozes = window.speechSynthesis.getVoices();
  return vozes.find((v) => /^pt[-_]BR/i.test(v.lang)) ?? vozes.find((v) => /^pt/i.test(v.lang)) ?? null;
}

export function pararFala() {
  if (!podeFalar) return;
  clearTimeout(vigia);
  window.speechSynthesis.cancel();
  marcar(null);
}

/** Lê o texto. Tocar de novo no mesmo botão interrompe a leitura. */
export function falar(texto, botao = null) {
  if (!podeFalar || !texto?.trim()) return;
  const eraEste = botao !== null && botao === botaoAtivo;
  pararFala();
  if (eraEste) return;

  const trechos = emTrechos(texto);
  const voz = vozEmPortugues();
  let comecou = false;
  marcar(botao);

  const terminar = () => {
    clearTimeout(vigia);
    if (botaoAtivo === botao) marcar(null);
  };

  trechos.forEach((trecho, i) => {
    const fala = new window.SpeechSynthesisUtterance(trecho);
    fala.lang = voz?.lang ?? 'pt-BR';
    if (voz) fala.voice = voz;
    fala.rate = 0.95;
    if (i === 0) {
      fala.onstart = () => {
        comecou = true;
        clearTimeout(vigia);
      };
    }
    // "interrupted"/"canceled" acontecem quando a própria pessoa manda parar: não são falha.
    fala.onerror = (evento) => {
      if (evento.error === 'interrupted' || evento.error === 'canceled') return;
      terminar();
      avisar(SEM_VOZ);
    };
    if (i === trechos.length - 1) fala.onend = terminar;
    window.speechSynthesis.speak(fala);
  });

  vigia = setTimeout(() => {
    if (comecou || botaoAtivo !== botao) return;
    pararFala();
    avisar(SEM_VOZ);
  }, PRAZO_PARA_COMECAR_MS);
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

  // Pede a lista de vozes cedo: em alguns navegadores ela só chega depois deste primeiro pedido.
  window.speechSynthesis.getVoices();

  // Um só ouvinte para a página inteira: vale também para botões criados depois.
  document.addEventListener('click', (evento) => {
    const botao = evento.target.closest('[data-ouvir], [data-ouvir-texto]');
    if (botao) falar(textoDoBotao(botao), botao);
  });
  window.addEventListener('pagehide', pararFala);
}

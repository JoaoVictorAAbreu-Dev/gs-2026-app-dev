// Barra de acessibilidade: letra maior/menor, alto contraste, ouvir a página e Libras (VLibras).
// As preferências ficam no localStorage do navegador. Não são dados pessoais e não vão ao servidor.

import { anunciar, el } from './dom.js';
import { falar, podeFalar } from './falar.js';

const ESCALAS = [0.9, 1, 1.15, 1.3, 1.5];
const raiz = document.documentElement;

function guardar(chave, valor) {
  try {
    localStorage.setItem(chave, valor);
  } catch {
    // Sem armazenamento (janela privada): a mudança vale só nesta página.
  }
}

function escalaAtual() {
  const valor = Number.parseFloat(getComputedStyle(raiz).getPropertyValue('--escala')) || 1;
  // Índice da escala disponível mais próxima do valor atual.
  return ESCALAS.reduce((melhor, e, i) => (Math.abs(e - valor) < Math.abs(ESCALAS[melhor] - valor) ? i : melhor), 1);
}

function mudarLetra(passo) {
  const indice = Math.min(ESCALAS.length - 1, Math.max(0, escalaAtual() + passo));
  raiz.style.setProperty('--escala', String(ESCALAS[indice]));
  guardar('ts:escala', String(ESCALAS[indice]));
  atualizarBotoesDeLetra();
  anunciar(`Tamanho da letra: ${Math.round(ESCALAS[indice] * 100)} por cento.`);
}

function atualizarBotoesDeLetra() {
  const indice = escalaAtual();
  const menos = document.querySelector('[data-acao="fonte-menos"]');
  const mais = document.querySelector('[data-acao="fonte-mais"]');
  if (menos) menos.disabled = indice === 0;
  if (mais) mais.disabled = indice === ESCALAS.length - 1;
}

function alternarContraste(botao) {
  const ligado = raiz.dataset.contraste !== 'alto';
  if (ligado) raiz.dataset.contraste = 'alto';
  else delete raiz.dataset.contraste;
  guardar('ts:contraste', ligado ? 'alto' : 'normal');
  botao.setAttribute('aria-pressed', String(ligado));
  anunciar(ligado ? 'Alto contraste ligado.' : 'Alto contraste desligado.');
}

// VLibras: tradutor para Libras do governo federal. Só é carregado se a pessoa clicar,
// porque o script vem de vlibras.gov.br (serviço externo).
let estadoLibras = 'desligado';
let caixaLibras = null;

function ligarLibras(botao) {
  if (estadoLibras !== 'desligado') return;
  estadoLibras = 'carregando';
  botao.setAttribute('aria-pressed', 'true');

  caixaLibras = el(
    'div',
    { class: 'enabled', vw: true },
    el('div', { 'vw-access-button': true, class: 'active' }),
    el('div', { 'vw-plugin-wrapper': true }, el('div', { class: 'vw-plugin-top-wrapper' })),
  );
  document.body.append(caixaLibras);

  const falhar = () => {
    caixaLibras?.remove();
    estadoLibras = 'desligado';
    botao.setAttribute('aria-pressed', 'false');
    anunciar('Não foi possível carregar o VLibras. Confira a internet e tente de novo.');
  };

  const script = el('script', { src: 'https://vlibras.gov.br/app/vlibras-plugin.js' });
  script.addEventListener('load', () => {
    try {
      new window.VLibras.Widget('https://vlibras.gov.br/app');
      estadoLibras = 'ligado';
      anunciar('Libras ativado. Use o botão do VLibras na lateral da página.');
    } catch {
      falhar();
    }
  });
  script.addEventListener('error', falhar);
  document.head.append(script);
}

export function iniciarBarraAcessibilidade() {
  const barra = document.querySelector('.barra-a11y');
  if (!barra) return;

  const botaoContraste = barra.querySelector('[data-acao="contraste"]');
  botaoContraste?.setAttribute('aria-pressed', String(raiz.dataset.contraste === 'alto'));
  atualizarBotoesDeLetra();

  const botaoOuvir = barra.querySelector('[data-acao="ouvir-pagina"]');
  if (botaoOuvir) botaoOuvir.hidden = !podeFalar;

  barra.addEventListener('click', (evento) => {
    const botao = evento.target.closest('[data-acao]');
    if (!botao) return;
    switch (botao.dataset.acao) {
      case 'fonte-menos':
        mudarLetra(-1);
        break;
      case 'fonte-mais':
        mudarLetra(1);
        break;
      case 'contraste':
        alternarContraste(botao);
        break;
      case 'ouvir-pagina':
        falar(document.querySelector('main')?.innerText ?? '', botao);
        break;
      case 'libras':
        ligarLibras(botao);
        break;
    }
  });
}

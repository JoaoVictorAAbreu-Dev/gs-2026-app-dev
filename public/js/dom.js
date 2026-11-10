// Criação de elementos sem innerHTML: todo texto entra como texto, nunca como HTML.
// Assim, mesmo que um relato traga "<script>", ele aparece escrito na tela e não executa.

const SVG = 'http://www.w3.org/2000/svg';

/**
 * el('p', { class: 'x', hidden: true }, 'texto', outroNo)
 * Atributos null/false são ignorados; true vira atributo vazio.
 */
export function el(tag, atributos = {}, ...filhos) {
  const no = document.createElement(tag);
  for (const [nome, valor] of Object.entries(atributos)) {
    if (valor === null || valor === undefined || valor === false) continue;
    if (nome === 'class') no.className = valor;
    else no.setAttribute(nome, valor === true ? '' : valor);
  }
  no.append(...filhos.flat().filter((f) => f !== null && f !== undefined && f !== false));
  return no;
}

/** Ícone do sprite (public/img/sprite.svg). */
export function icone(id, classe = 'icone') {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('class', classe);
  svg.setAttribute('aria-hidden', 'true');
  const uso = document.createElementNS(SVG, 'use');
  uso.setAttribute('href', `/img/sprite.svg#${id}`);
  svg.append(uso);
  return svg;
}

/** Mensagem para leitores de tela (região aria-live), sem mudar nada na tela. */
export function anunciar(mensagem) {
  let regiao = document.getElementById('anuncio');
  if (!regiao) {
    regiao = el('div', { id: 'anuncio', class: 'so-leitor', role: 'status', 'aria-live': 'polite' });
    document.body.append(regiao);
  }
  // Limpa antes, para repetir a mesma frase ser lido de novo.
  regiao.textContent = '';
  setTimeout(() => {
    regiao.textContent = mensagem;
  }, 50);
}

const TEMPO_DO_AVISO_MS = 7000;
let relogioDoAviso = null;

/**
 * Aviso visível no rodapé da tela (e lido por leitores de tela), que some sozinho.
 * Serve para falhas de ações como "Ouvir" e "Falar": sem ele a pessoa aperta o botão,
 * nada acontece e ela não sabe por quê.
 */
export function avisar(mensagem) {
  let caixa = document.getElementById('aviso-flutuante');
  if (!caixa) {
    caixa = el('div', { id: 'aviso-flutuante', class: 'aviso-flutuante', role: 'status', 'aria-live': 'polite' });
    document.body.append(caixa);
  }
  caixa.textContent = mensagem;
  caixa.dataset.visivel = '';
  clearTimeout(relogioDoAviso);
  relogioDoAviso = setTimeout(() => delete caixa.dataset.visivel, TEMPO_DO_AVISO_MS);
}

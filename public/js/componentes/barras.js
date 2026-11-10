// <ts-barras>: gráfico de barras horizontais, como lista (cada linha = rótulo + barra + número).
// Componente sem Shadow DOM, para herdar o CSS do site. O número fica sempre escrito:
// a barra é só reforço visual, então quem não enxerga cores ou usa leitor de tela perde nada.
//
//   const grafico = document.querySelector('ts-barras');
//   grafico.dados = [{ rotulo: 'Alagamento em via', valor: 18 }, ...];

import { el } from '../dom.js';

class TsBarras extends HTMLElement {
  #dados = [];

  get dados() {
    return this.#dados;
  }

  set dados(valor) {
    this.#dados = Array.isArray(valor) ? valor : [];
    this.#desenhar();
  }

  connectedCallback() {
    this.#desenhar();
  }

  #desenhar() {
    if (!this.isConnected) return;
    const maior = Math.max(1, ...this.#dados.map(({ valor }) => valor));

    const linhas = this.#dados.map(({ rotulo, valor }) => {
      const preenchimento = el('span', { class: 'barras__preenchimento' });
      preenchimento.style.setProperty('--pct', `${(valor / maior) * 100}%`);
      return el(
        'li',
        { class: 'barras__linha' },
        el('span', { class: 'barras__rotulo' }, rotulo),
        el('span', { class: 'barras__trilho', 'aria-hidden': 'true' }, preenchimento),
        el('span', { class: 'barras__valor' }, String(valor)),
      );
    });

    this.replaceChildren(el('ul', { class: 'barras' }, ...linhas));
  }
}

if (!customElements.get('ts-barras')) customElements.define('ts-barras', TsBarras);

// Página "Relatos": lista paginada com filtros e um resumo ao lado.
import { ErroApi, listarBairros, listarRelatos, obterIndicadores } from './api.js';
import { anunciar, el } from './dom.js';
import { ATENCAO, CATEGORIAS, IMPACTOS, formatarData, formatarDataHora, plural } from './rotulos.js';
import './componentes/barras.js';

const LIMITE = 10;

const form = document.getElementById('filtros');
const lista = document.getElementById('lista');
const estado = document.getElementById('estado');
const rodape = document.getElementById('rodape-lista');
const mostrando = document.getElementById('mostrando');
const botaoMais = document.getElementById('mais');
const contagem = document.getElementById('contagem');

let pagina = 1;
let carregados = 0;
let busca = 0; // descarta respostas antigas se a pessoa mudar o filtro no meio

// Opções dos filtros vêm dos mesmos rótulos usados no resto do site.
document
  .getElementById('f-categoria')
  .append(...Object.entries(CATEGORIAS).map(([valor, { nome }]) => el('option', { value: valor }, nome)));
document
  .getElementById('f-impacto')
  .append(...Object.entries(IMPACTOS).map(([valor, { nome }]) => el('option', { value: valor }, nome)));

function cartao(relato) {
  const categoria = CATEGORIAS[relato.categoria] ?? CATEGORIAS.outro;
  const impacto = IMPACTOS[relato.impacto];
  const selos = [];
  if (impacto) {
    selos.push(
      el(
        'span',
        { class: `badge${impacto.selo ? ` badge--${impacto.selo}` : ''}` },
        el('span', { class: 'badge__ponto', 'aria-hidden': 'true' }),
        impacto.nome,
      ),
    );
  }
  if (relato.ficticio) selos.push(el('span', { class: 'badge badge--info' }, 'Exemplo'));

  return el(
    'li',
    {},
    el(
      'article',
      { class: 'relato' },
      el(
        'div',
        { class: 'relato__topo' },
        el('h3', { class: 'relato__titulo' }, categoria.nome, ' ', el('span', { class: 'relato__bairro' }, `· ${relato.bairro}`)),
        el('div', { class: 'relato__selos' }, ...selos),
      ),
      relato.descricao ? el('p', { class: 'relato__texto' }, relato.descricao) : null,
      el(
        'p',
        { class: 'relato__meta' },
        `Aconteceu em ${formatarData(relato.dataEvento)} · registrado em ${formatarDataHora(relato.criadoEm)}`,
      ),
    ),
  );
}

function filtrosAtuais() {
  const dados = new FormData(form);
  return {
    categoria: dados.get('categoria'),
    impacto: dados.get('impacto'),
    bairro: String(dados.get('bairro') ?? '').trim(),
  };
}

function mostrarMensagem(...filhos) {
  estado.replaceChildren(...filhos);
}

function mensagemVazia(comFiltro) {
  return el(
    'div',
    { class: 'vazio' },
    el('h3', { class: 't-h3' }, comFiltro ? 'Nenhum relato com esses filtros' : 'Ainda não há relatos'),
    el(
      'p',
      {},
      comFiltro
        ? 'Tente limpar os filtros ou escolher outro bairro.'
        : 'Quando alguém registrar um relato, ele aparece aqui. Seja a primeira pessoa a contar.',
    ),
    comFiltro
      ? null
      : el('a', { class: 'btn btn--primario', href: '/registrar' }, 'Registrar relato'),
  );
}

async function carregar({ reiniciar }) {
  const minhaBusca = ++busca;
  if (reiniciar) {
    pagina = 1;
    carregados = 0;
    lista.replaceChildren();
    lista.hidden = true;
    rodape.hidden = true;
    mostrarMensagem(
      el('div', { class: 'carregando', 'aria-label': 'Carregando relatos' }, el('div', { class: 'esqueleto' }, ''), el('div', { class: 'esqueleto' }, ''), el('div', { class: 'esqueleto' }, '')),
    );
  }

  const filtros = filtrosAtuais();
  botaoMais.disabled = true;
  try {
    const resposta = await listarRelatos({ ...filtros, pagina, limite: LIMITE });
    if (minhaBusca !== busca) return;

    mostrarMensagem();
    lista.append(...resposta.itens.map(cartao));
    carregados += resposta.itens.length;
    contagem.textContent = `(${resposta.total})`;

    const temFiltro = Object.values(filtros).some(Boolean);
    if (resposta.total === 0) {
      mostrarMensagem(mensagemVazia(temFiltro));
      lista.hidden = true;
      rodape.hidden = true;
      return;
    }

    lista.hidden = false;
    rodape.hidden = false;
    mostrando.textContent = `Mostrando ${carregados} de ${resposta.total}`;
    botaoMais.hidden = !resposta.temMais;
    if (reiniciar) anunciar(`${plural(resposta.total, 'relato encontrado', 'relatos encontrados')}.`);
  } catch (erro) {
    if (minhaBusca !== busca) return;
    const tentar = el('button', { type: 'button', class: 'btn btn--secundario' }, 'Tentar de novo');
    tentar.addEventListener('click', () => carregar({ reiniciar: carregados === 0 }));
    mostrarMensagem(
      el(
        'div',
        { class: 'aviso aviso--erro', role: 'alert' },
        el('div', {}, el('p', { class: 'aviso__titulo' }, 'Não deu para carregar os relatos.'), el('p', { class: 'aviso__corpo' }, erro instanceof ErroApi ? erro.message : 'Tente de novo.'), tentar),
      ),
    );
  } finally {
    botaoMais.disabled = false;
  }
}

botaoMais.addEventListener('click', () => {
  pagina += 1;
  carregar({ reiniciar: false });
});

form.addEventListener('submit', (evento) => {
  evento.preventDefault();
  carregar({ reiniciar: true });
});
form.addEventListener('reset', () => {
  // O reset limpa os campos depois do evento; espera um ciclo para ler os valores já vazios.
  setTimeout(() => carregar({ reiniciar: true }), 0);
});

// Resumo ao lado: usa os mesmos indicadores do painel.
obterIndicadores()
  .then((dados) => {
    document.getElementById('resumo-total').textContent = String(dados.total);
    document.getElementById('resumo-barras').dados = dados.porCategoria
      .filter(({ total }) => total > 0)
      .map(({ categoria, total }) => ({ rotulo: CATEGORIAS[categoria].painel, valor: total }));
  })
  .catch(() => {
    document.getElementById('resumo-total').textContent = '—';
  });

listarBairros()
  .then(({ bairros }) => {
    document.getElementById('f-bairros').replaceChildren(...bairros.map((b) => el('option', { value: b })));
  })
  .catch(() => {});

carregar({ reiniciar: true });

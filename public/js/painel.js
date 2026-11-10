// Página "Painel": mostra os indicadores calculados pelo servidor (GET /api/indicadores).
import { ErroApi, obterIndicadores } from './api.js';
import { el } from './dom.js';
import { ATENCAO, CATEGORIAS, IMPACTOS, TENDENCIA, formatarDataHora, plural } from './rotulos.js';
import './componentes/barras.js';

const estado = document.getElementById('painel-estado');
const conteudo = document.getElementById('painel-conteudo');

const texto = (id, valor) => {
  document.getElementById(id).textContent = valor;
};

function linhaDeAtencao(item) {
  const nivel = ATENCAO[item.nivel];
  const selo = el(
    'span',
    { class: `badge${nivel.selo ? ` badge--${nivel.selo}` : ''}` },
    el('span', { class: 'badge__ponto', 'aria-hidden': 'true' }),
    nivel.nome,
  );
  return el(
    'tr',
    {},
    el('th', { scope: 'row', class: 'bairro' }, item.bairro),
    el('td', { class: 'grau' }, selo),
    el('td', {}, `${item.relatos7d} (antes: ${item.relatosAnteriores})`),
    el('td', { class: `tendencia tendencia--${item.tendencia}` }, TENDENCIA[item.tendencia]),
    el('td', { class: 'motivo' }, item.motivo),
  );
}

function mostrar(dados) {
  texto('k-total', String(dados.total));
  texto('k-categoria', dados.categoriaMaisRelatada ? CATEGORIAS[dados.categoriaMaisRelatada.categoria].nome : 'Sem relatos');
  texto(
    'k-categoria-n',
    dados.categoriaMaisRelatada
      ? `${plural(dados.categoriaMaisRelatada.total, 'relato', 'relatos')} (${String(dados.categoriaMaisRelatada.percentual).replace('.', ',')}%)`
      : '',
  );
  texto('k-bairros', String(dados.bairrosComRelatos));
  texto('k-alta', String(dados.atencaoAlta));

  document.getElementById('g-categoria').dados = dados.porCategoria.map(({ categoria, total }) => ({
    rotulo: CATEGORIAS[categoria].painel,
    valor: total,
  }));
  document.getElementById('g-impacto').dados = dados.porImpacto.map(({ impacto, total }) => ({
    rotulo: IMPACTOS[impacto].nome,
    valor: total,
  }));
  document.getElementById('g-bairro').dados = dados.porBairro.map(({ bairro, total }) => ({ rotulo: bairro, valor: total }));

  const { regra } = dados;
  document.getElementById('regra-lista').replaceChildren(
    el('li', {}, `Janela: últimos ${regra.janelaDias} dias, comparada com os ${regra.janelaDias} dias antes.`),
    el('li', {}, `Atenção alta: ${regra.altaRelatos} relatos ou mais, ou ${regra.altaImpactoAlto} relatos de impacto alto ou mais.`),
    el(
      'li',
      {},
      `Atenção moderada: de ${regra.moderadaRelatosMin} a ${regra.moderadaRelatosMax} relatos, ou ${regra.moderadaImpactoAlto} relato de impacto alto.`,
    ),
    el('li', {}, 'Tendência: compara com a janela anterior (subindo, estável ou caindo).'),
  );

  const corpo = document.getElementById('atencao-corpo');
  corpo.replaceChildren(...dados.atencao.map(linhaDeAtencao));
  document.getElementById('atencao-vazia').hidden = dados.atencao.length > 0;
  document.getElementById('tabela-atencao').hidden = dados.atencao.length === 0;

  texto('gerado-em', `Números calculados em ${formatarDataHora(dados.geradoEm)}. Relatos comunitários, não alertas oficiais.`);

  estado.replaceChildren();
  conteudo.hidden = false;
}

async function carregar() {
  try {
    mostrar(await obterIndicadores());
  } catch (erro) {
    const tentar = el('button', { type: 'button', class: 'btn btn--secundario' }, 'Tentar de novo');
    tentar.addEventListener('click', carregar);
    estado.replaceChildren(
      el(
        'div',
        { class: 'aviso aviso--erro', role: 'alert' },
        el(
          'div',
          {},
          el('p', { class: 'aviso__titulo' }, 'Não deu para carregar o painel.'),
          el('p', { class: 'aviso__corpo' }, erro instanceof ErroApi ? erro.message : 'Tente de novo.'),
          tentar,
        ),
      ),
    );
  }
}

document.getElementById('imprimir').addEventListener('click', () => window.print());
carregar();

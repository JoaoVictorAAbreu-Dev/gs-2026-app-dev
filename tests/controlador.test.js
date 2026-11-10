// Testa os handlers de ponta a ponta (validação -> repositório -> indicadores),
// com repositório em memória. Não precisa de MongoDB nem de Express.

import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { criarControlador } from '../src/controllers/relatos.js';
import { gerarRelatosFicticios } from '../scripts/dadosFicticios.js';
import { criarRepositorioMemoria } from './helpers/repositorioMemoria.js';

// 09/11/2026, 18h em São Paulo
const AGORA = new Date('2026-11-09T18:00:00-03:00');

function criarResposta() {
  return {
    statusCode: 200,
    corpo: undefined,
    status(codigo) {
      this.statusCode = codigo;
      return this;
    },
    json(corpo) {
      this.corpo = corpo;
      return this;
    },
  };
}

async function chamar(handler, req) {
  const res = criarResposta();
  await handler(req, res);
  return res;
}

const relatoValido = () => ({
  categoria: 'drenagem',
  bairro: 'vila modelo',
  impacto: 'alto',
  dataEvento: '2026-11-09',
  descricao: 'Bueiro entupido.',
});

describe('POST /api/relatos (criar)', () => {
  let repositorio;
  let controlador;
  beforeEach(() => {
    repositorio = criarRepositorioMemoria();
    controlador = criarControlador({ repositorio, agora: () => AGORA });
  });

  it('grava, responde 201 e confirma', async () => {
    const res = await chamar(controlador.criar, { body: relatoValido() });
    assert.equal(res.statusCode, 201);
    assert.equal(res.corpo.mensagem, 'Pronto! Seu relato foi registrado.');
    assert.equal(res.corpo.relato.bairro, 'Vila Modelo');
    assert.equal(res.corpo.relato.dataEvento, '2026-11-09');
    assert.equal(res.corpo.relato.ficticio, false);
    assert.equal(repositorio.documentos.length, 1);
  });

  it('guarda a data do evento como Date e o instante do registro', async () => {
    await chamar(controlador.criar, { body: relatoValido() });
    const [doc] = repositorio.documentos;
    assert.ok(doc.dataEvento instanceof Date);
    assert.equal(doc.dataEvento.toISOString(), '2026-11-09T00:00:00.000Z');
    assert.equal(doc.criadoEm.toISOString(), AGORA.toISOString());
  });

  it('não deixa o cliente marcar o relato como fictício nem escolher o _id', async () => {
    await chamar(controlador.criar, { body: { ...relatoValido(), ficticio: true, _id: 'meu-id' } });
    const [doc] = repositorio.documentos;
    assert.equal(doc.ficticio, false);
    assert.notEqual(doc._id, 'meu-id');
  });

  it('responde 422 com mensagem por campo e não grava nada', async () => {
    const res = await chamar(controlador.criar, { body: { ...relatoValido(), categoria: 'x', dataEvento: '2027-01-01' } });
    assert.equal(res.statusCode, 422);
    assert.equal(res.corpo.erro, 'validacao');
    assert.deepEqual(Object.keys(res.corpo.campos).sort(), ['categoria', 'dataEvento']);
    assert.equal(repositorio.documentos.length, 0);
  });

  it('corpo ausente também é 422 (e não erro 500)', async () => {
    const res = await chamar(controlador.criar, { body: undefined });
    assert.equal(res.statusCode, 422);
    assert.ok(res.corpo.campos._geral);
  });
});

describe('GET /api/relatos (listar)', () => {
  let controlador;
  beforeEach(() => {
    const repositorio = criarRepositorioMemoria(gerarRelatosFicticios(AGORA));
    controlador = criarControlador({ repositorio, agora: () => AGORA });
  });

  it('pagina do mais recente para o mais antigo', async () => {
    const res = await chamar(controlador.listar, { query: { limite: '5' } });
    assert.equal(res.statusCode, 200);
    assert.equal(res.corpo.itens.length, 5);
    assert.equal(res.corpo.total, 42);
    assert.equal(res.corpo.temMais, true);
    const datas = res.corpo.itens.map((i) => i.criadoEm);
    assert.deepEqual(datas, [...datas].sort().reverse());
  });

  it('a última página não tem "mais" e o total não muda', async () => {
    const res = await chamar(controlador.listar, { query: { limite: '5', pagina: '9' } });
    assert.equal(res.corpo.itens.length, 2);
    assert.equal(res.corpo.temMais, false);
  });

  it('filtra por categoria, impacto e bairro (sem diferenciar maiúsculas do bairro)', async () => {
    const porBairro = await chamar(controlador.listar, { query: { bairro: 'jardim exemplo', limite: '50' } });
    assert.equal(porBairro.corpo.total, 11);
    assert.ok(porBairro.corpo.itens.every((i) => i.bairro === 'Jardim Exemplo'));

    const porCategoria = await chamar(controlador.listar, { query: { categoria: 'erosao' } });
    assert.equal(porCategoria.corpo.total, 2);

    const combinado = await chamar(controlador.listar, { query: { categoria: 'alagamento', impacto: 'alto', limite: '50' } });
    assert.ok(combinado.corpo.itens.every((i) => i.categoria === 'alagamento' && i.impacto === 'alto'));
  });

  it('recusa filtros desconhecidos ou com formato de operador do MongoDB', async () => {
    for (const query of [{ categoria: 'xyz' }, { impacto: ['alto', 'baixo'] }, { bairro: { $ne: '' } }]) {
      const res = await chamar(controlador.listar, { query });
      assert.equal(res.statusCode, 400, JSON.stringify(query));
      assert.equal(res.corpo.erro, 'filtro_invalido');
    }
  });

  it('recusa paginação inválida', async () => {
    for (const query of [{ limite: '0' }, { limite: '51' }, { limite: 'abc' }, { pagina: '-1' }, { pagina: '1.5' }]) {
      const res = await chamar(controlador.listar, { query });
      assert.equal(res.statusCode, 400, JSON.stringify(query));
    }
  });

  it('não expõe campos internos', async () => {
    const res = await chamar(controlador.listar, { query: { limite: '1' } });
    assert.deepEqual(
      Object.keys(res.corpo.itens[0]).sort(),
      ['bairro', 'categoria', 'criadoEm', 'dataEvento', 'descricao', 'ficticio', 'id', 'impacto'],
    );
  });
});

describe('GET /api/indicadores — dados fictícios reproduzem o painel do Figma', () => {
  let indicadores;
  beforeEach(async () => {
    const repositorio = criarRepositorioMemoria(gerarRelatosFicticios(AGORA));
    const controlador = criarControlador({ repositorio, agora: () => AGORA });
    indicadores = (await chamar(controlador.indicadores, { query: {} })).corpo;
  });

  it('indicador 1: quantidade total de registros', () => {
    assert.equal(indicadores.total, 42);
  });

  it('indicador 2: resumo por categoria', () => {
    assert.deepEqual(
      indicadores.porCategoria.map((c) => [c.categoria, c.total]),
      [['alagamento', 18], ['drenagem', 12], ['via', 5], ['agua-imovel', 4], ['erosao', 2], ['outro', 1]],
    );
    assert.deepEqual(indicadores.categoriaMaisRelatada, { categoria: 'alagamento', total: 18, percentual: 42.9 });
  });

  it('resumo por impacto soma o total', () => {
    assert.equal(indicadores.porImpacto.reduce((soma, i) => soma + i.total, 0), 42);
  });

  it('resumo por bairro: 9 bairros, 5 em destaque e "Outros 4 bairros"', () => {
    assert.equal(indicadores.bairrosComRelatos, 9);
    assert.deepEqual(
      indicadores.porBairro.map((b) => [b.bairro, b.total]),
      [['Jardim Exemplo', 11], ['Vila Modelo', 9], ['Parque Fictício', 8], ['Jardim Ilustrativo', 6], ['Vila Teste', 4], ['Outros 4 bairros', 4]],
    );
  });

  it('atenção dos últimos 7 dias: 2 bairros em alta, com tendência', () => {
    assert.equal(indicadores.atencaoAlta, 2);
    assert.deepEqual(
      indicadores.atencao.map((a) => [a.bairro, a.nivel, a.relatos7d, a.relatosAnteriores, a.tendencia]),
      [
        ['Jardim Exemplo', 'alta', 6, 2, 'subindo'],
        ['Vila Modelo', 'alta', 3, 3, 'estavel'],
        ['Parque Fictício', 'moderada', 3, 1, 'subindo'],
        ['Jardim Ilustrativo', 'moderada', 2, 4, 'caindo'],
        ['Vila Teste', 'sem-sinal', 1, 3, 'caindo'],
      ],
    );
  });
});

describe('GET /api/indicadores — janelas de 7 dias', () => {
  it('conta o dia de hoje e os 6 anteriores; o 7º dia atrás já é a semana anterior', async () => {
    const dia = (n) => new Date(Date.UTC(2026, 10, 9 - n)); // n dias antes de 09/11/2026
    const doc = (n) => ({ categoria: 'alagamento', bairro: 'Vila Borda', impacto: 'baixo', dataEvento: dia(n), descricao: '', ficticio: false, criadoEm: AGORA });
    const repositorio = criarRepositorioMemoria([doc(0), doc(6), doc(7), doc(13), doc(14)]);
    const controlador = criarControlador({ repositorio, agora: () => AGORA });
    const { corpo } = await chamar(controlador.indicadores, { query: {} });
    const [linha] = corpo.atencao;
    assert.equal(linha.relatos7d, 2); // dias 0 e 6
    assert.equal(linha.relatosAnteriores, 2); // dias 7 e 13; o dia 14 fica de fora
  });

  it('banco vazio: zeros, sem erro', async () => {
    const controlador = criarControlador({ repositorio: criarRepositorioMemoria(), agora: () => AGORA });
    const { statusCode, corpo } = await chamar(controlador.indicadores, { query: {} });
    assert.equal(statusCode, 200);
    assert.equal(corpo.total, 0);
    assert.deepEqual(corpo.atencao, []);
  });
});

describe('GET /api/bairros', () => {
  it('devolve os nomes sem repetir, em ordem alfabética', async () => {
    const repositorio = criarRepositorioMemoria(gerarRelatosFicticios(AGORA));
    const controlador = criarControlador({ repositorio, agora: () => AGORA });
    const { corpo } = await chamar(controlador.bairros, {});
    assert.equal(corpo.bairros.length, 9);
    assert.deepEqual(corpo.bairros, [...corpo.bairros].sort((a, b) => a.localeCompare(b, 'pt-BR')));
  });
});

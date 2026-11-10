import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  calcularIndicadores,
  classificarAtencao,
  janelasDeAtencao,
  montarAtencao,
  percentual,
  resumirBairros,
  tendencia,
} from '../src/services/indicadores.js';

describe('percentual', () => {
  it('arredonda para uma casa e trata total zero', () => {
    assert.equal(percentual(18, 42), 42.9);
    assert.equal(percentual(1, 3), 33.3);
    assert.equal(percentual(0, 0), 0);
  });
});

describe('classificarAtencao (regra: alta ≥5 relatos ou ≥2 de impacto alto; moderada 2–4 ou 1 alto)', () => {
  const caso = (atual, altoAtual) => classificarAtencao({ atual, altoAtual }).nivel;

  it('alta por quantidade, exatamente no limiar de 5', () => {
    assert.equal(caso(5, 0), 'alta');
    assert.equal(caso(4, 0), 'moderada');
  });

  it('alta por impacto alto, exatamente no limiar de 2', () => {
    assert.equal(caso(2, 2), 'alta');
    assert.equal(caso(3, 2), 'alta');
    assert.equal(caso(3, 1), 'moderada');
  });

  it('moderada por faixa de 2 a 4 relatos', () => {
    assert.equal(caso(2, 0), 'moderada');
    assert.equal(caso(4, 0), 'moderada');
  });

  it('moderada por 1 relato de impacto alto, mesmo sendo só 1 relato', () => {
    assert.equal(caso(1, 1), 'moderada');
  });

  it('sem sinal abaixo dos limiares, e o texto não diz "seguro"', () => {
    const resultado = classificarAtencao({ atual: 1, altoAtual: 0 });
    assert.equal(resultado.nivel, 'sem-sinal');
    assert.equal(resultado.motivo, 'Abaixo dos limiares da regra');
  });

  it('explica o motivo da classificação', () => {
    assert.equal(classificarAtencao({ atual: 6, altoAtual: 2 }).motivo, '6 relatos em 7 dias (limiar: 5)');
    assert.equal(classificarAtencao({ atual: 3, altoAtual: 2 }).motivo, '2 relatos com impacto alto em 7 dias');
    assert.equal(classificarAtencao({ atual: 3, altoAtual: 0 }).motivo, '3 relatos em 7 dias (faixa 2–4)');
    assert.equal(classificarAtencao({ atual: 1, altoAtual: 1 }).motivo, '1 relato com impacto alto em 7 dias');
  });
});

describe('tendencia', () => {
  it('compara a semana atual com a anterior', () => {
    assert.equal(tendencia(6, 2), 'subindo');
    assert.equal(tendencia(3, 3), 'estavel');
    assert.equal(tendencia(2, 4), 'caindo');
    assert.equal(tendencia(0, 0), 'estavel');
  });
});

describe('montarAtencao', () => {
  it('lista só bairros com relato recente e ordena de alta a sem sinal', () => {
    const lista = montarAtencao([
      { bairro: 'Vila Teste', atual: 1, anterior: 3, altoAtual: 0 },
      { bairro: 'Sem Relato Recente', atual: 0, anterior: 5, altoAtual: 0 },
      { bairro: 'Parque Fictício', atual: 3, anterior: 1, altoAtual: 0 },
      { bairro: 'Jardim Exemplo', atual: 6, anterior: 2, altoAtual: 2 },
    ]);
    assert.deepEqual(
      lista.map((l) => [l.bairro, l.nivel, l.tendencia]),
      [
        ['Jardim Exemplo', 'alta', 'subindo'],
        ['Parque Fictício', 'moderada', 'subindo'],
        ['Vila Teste', 'sem-sinal', 'caindo'],
      ],
    );
  });
});

describe('resumirBairros', () => {
  const linhas = [
    ['A', 11], ['B', 9], ['C', 8], ['D', 6], ['E', 4], ['F', 1], ['G', 1], ['H', 1], ['I', 1],
  ].map(([chave, total]) => ({ chave, total }));

  it('mostra os 5 maiores e agrupa o resto como "Outros N bairros"', () => {
    const resumo = resumirBairros(linhas);
    assert.equal(resumo.length, 6);
    assert.deepEqual(resumo.at(-1), { bairro: 'Outros 4 bairros', total: 4, agregado: true });
  });

  it('não cria "Outros" quando cabem todos', () => {
    assert.equal(resumirBairros(linhas.slice(0, 3)).length, 3);
  });
});

describe('calcularIndicadores', () => {
  const dados = {
    total: 3,
    porCategoria: [{ chave: 'alagamento', total: 2 }, { chave: 'via', total: 1 }],
    porImpacto: [{ chave: 'alto', total: 3 }],
    porBairro: [{ chave: 'A', total: 2 }, { chave: 'B', total: 1 }],
    janelas: [],
    geradoEm: new Date('2026-11-09T21:00:00Z'),
  };

  it('inclui todas as categorias e impactos, mesmo com zero relatos', () => {
    const resultado = calcularIndicadores(dados);
    assert.equal(resultado.porCategoria.length, 6);
    assert.equal(resultado.porImpacto.length, 3);
    assert.deepEqual(resultado.porImpacto.map((i) => i.total), [3, 0, 0]);
  });

  it('informa categoria mais relatada com percentual e conta bairros', () => {
    const resultado = calcularIndicadores(dados);
    assert.deepEqual(resultado.categoriaMaisRelatada, { categoria: 'alagamento', total: 2, percentual: 66.7 });
    assert.equal(resultado.bairrosComRelatos, 2);
  });

  it('com banco vazio não quebra e não inventa categoria mais relatada', () => {
    const resultado = calcularIndicadores({
      total: 0, porCategoria: [], porImpacto: [], porBairro: [], janelas: [],
    });
    assert.equal(resultado.total, 0);
    assert.equal(resultado.categoriaMaisRelatada, null);
    assert.equal(resultado.atencaoAlta, 0);
    assert.ok(resultado.porCategoria.every((c) => c.total === 0 && c.percentual === 0));
  });

  it('inclui a regra aplicada, para o painel poder mostrá-la', () => {
    assert.equal(calcularIndicadores(dados).regra.altaRelatos, 5);
  });
});

describe('janelasDeAtencao', () => {
  it('janela atual = hoje e os 6 dias anteriores; a anterior = os 7 dias antes', () => {
    // 09/11/2026 às 22h em São Paulo (01h UTC do dia 10): o "hoje" continua sendo dia 9.
    const { inicioAnterior, inicioAtual, fim } = janelasDeAtencao(new Date('2026-11-10T01:00:00Z'));

    assert.equal(fim.toISOString(), '2026-11-10T00:00:00.000Z');
    assert.equal(inicioAtual.toISOString(), '2026-11-03T00:00:00.000Z');
    assert.equal(inicioAnterior.toISOString(), '2026-10-27T00:00:00.000Z');
  });
});

import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { describe, it } from 'node:test';
import { criarLimitadorDeEnvios } from '../src/middlewares/limitarEnvios.js';

const MINUTO = 60_000;

/** Resposta falsa com o mínimo que o middleware usa: status, json, set e o evento "finish". */
function respostaFalsa() {
  const res = new EventEmitter();
  res.statusCode = 200;
  res.cabecalhos = {};
  res.set = (nome, valor) => {
    res.cabecalhos[nome] = valor;
    return res;
  };
  res.status = (codigo) => {
    res.statusCode = codigo;
    return res;
  };
  res.json = (corpo) => {
    res.corpo = corpo;
    return res;
  };
  return res;
}

/** Simula um POST: passa pelo limitador e, se liberado, termina com o status informado. */
function enviar(limitar, { ip = '10.0.0.1', status = 201 } = {}) {
  const res = respostaFalsa();
  let liberado = false;
  limitar({ ip }, res, () => {
    liberado = true;
    res.statusCode = status;
    res.emit('finish');
  });
  return { liberado, res };
}

describe('limite de envios por origem', () => {
  it('libera até o máximo e bloqueia o seguinte com 429 e Retry-After', () => {
    const limitar = criarLimitadorDeEnvios({ maximo: 3, janelaMs: 10 * MINUTO, agora: () => 0 });

    for (let i = 0; i < 3; i++) assert.equal(enviar(limitar).liberado, true);

    const { liberado, res } = enviar(limitar);
    assert.equal(liberado, false);
    assert.equal(res.statusCode, 429);
    assert.equal(res.corpo.erro, 'muitos_envios');
    assert.equal(res.cabecalhos['Retry-After'], '600');
  });

  it('volta a liberar quando a janela passa', () => {
    let relogio = 0;
    const limitar = criarLimitadorDeEnvios({ maximo: 1, janelaMs: 10 * MINUTO, agora: () => relogio });

    assert.equal(enviar(limitar).liberado, true);
    relogio = 9 * MINUTO;
    assert.equal(enviar(limitar).liberado, false);
    relogio = 10 * MINUTO;
    assert.equal(enviar(limitar).liberado, true);
  });

  it('conta cada origem separadamente', () => {
    const limitar = criarLimitadorDeEnvios({ maximo: 1, janelaMs: MINUTO, agora: () => 0 });

    assert.equal(enviar(limitar, { ip: '10.0.0.1' }).liberado, true);
    assert.equal(enviar(limitar, { ip: '10.0.0.2' }).liberado, true);
    assert.equal(enviar(limitar, { ip: '10.0.0.1' }).liberado, false);
  });

  it('envio recusado pela validação (422) não gasta o limite', () => {
    const limitar = criarLimitadorDeEnvios({ maximo: 1, janelaMs: MINUTO, agora: () => 0 });

    for (let i = 0; i < 5; i++) assert.equal(enviar(limitar, { status: 422 }).liberado, true);
    assert.equal(enviar(limitar).liberado, true);
    assert.equal(enviar(limitar).liberado, false);
  });
});

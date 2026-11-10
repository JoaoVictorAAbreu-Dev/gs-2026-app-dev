import { LIMITE_ENVIOS, MS_POR_MINUTO } from '../dominio.js';

const ORIGENS_ANTES_DA_FAXINA = 1000;

/**
 * Limita quantos relatos a mesma origem (IP) registra por janela de tempo.
 * Só relatos gravados (201) contam: quem erra um campo e corrige não é punido.
 *
 * A contagem fica na memória do processo, o que basta para um servidor só.
 * Com várias instâncias, o lugar certo seria um armazenamento compartilhado.
 *
 * @param {{ maximo?: number, janelaMs?: number, agora?: () => number }} [opcoes]
 */
export function criarLimitadorDeEnvios({
  maximo = LIMITE_ENVIOS.maximo,
  janelaMs = LIMITE_ENVIOS.janelaMinutos * MS_POR_MINUTO,
  agora = Date.now,
} = {}) {
  /** @type {Map<string, number[]>} origem -> instantes dos envios aceitos */
  const enviosPorOrigem = new Map();

  const recentes = (origem, instante) => (enviosPorOrigem.get(origem) ?? []).filter((t) => instante - t < janelaMs);

  function removerExpirados(instante) {
    for (const origem of enviosPorOrigem.keys()) {
      const validos = recentes(origem, instante);
      if (validos.length === 0) enviosPorOrigem.delete(origem);
      else enviosPorOrigem.set(origem, validos);
    }
  }

  return function limitarEnvios(req, res, next) {
    const origem = req.ip ?? 'desconhecida';
    const instante = agora();
    const envios = recentes(origem, instante);

    if (envios.length >= maximo) {
      const esperaSegundos = Math.ceil((envios[0] + janelaMs - instante) / 1000);
      res.set('Retry-After', String(esperaSegundos));
      return res.status(429).json({
        erro: 'muitos_envios',
        mensagem: `Você já registrou ${maximo} relatos em pouco tempo. Espere ${Math.ceil(esperaSegundos / 60)} min e tente de novo.`,
      });
    }

    res.on('finish', () => {
      if (res.statusCode !== 201) return;
      enviosPorOrigem.set(origem, [...recentes(origem, agora()), agora()]);
      if (enviosPorOrigem.size > ORIGENS_ANTES_DA_FAXINA) removerExpirados(agora());
    });
    return next();
  };
}

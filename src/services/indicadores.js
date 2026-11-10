// Processamento dos relatos em indicadores.
//
// O banco faz a contagem pesada ($group, no repositório). Este módulo recebe
// esses totais e faz o que é regra de negócio: percentuais, "Outros N bairros",
// classificação de atenção por bairro e tendência. São funções puras, então
// os testes rodam sem MongoDB.

import { CATEGORIAS, IMPACTOS, MS_POR_DIA, REGRA_ATENCAO, dataDeTexto, hojeEmSaoPaulo } from '../dominio.js';

const BAIRROS_EM_DESTAQUE = 5;

/** Percentual com uma casa decimal (0 quando não há total). */
export function percentual(parte, todo) {
  if (!todo) return 0;
  return Math.round((parte / todo) * 1000) / 10;
}

/** Garante que toda chave conhecida apareça (mesmo com 0) e ordena do maior para o menor. */
function completarPorChave(linhas, chavesConhecidas, total) {
  const contagem = new Map(chavesConhecidas.map((chave) => [chave, 0]));
  for (const { chave, total: n } of linhas) {
    if (contagem.has(chave)) contagem.set(chave, n);
  }
  return [...contagem]
    .map(([chave, n]) => ({ chave, total: n, percentual: percentual(n, total) }))
    .sort((a, b) => b.total - a.total || chavesConhecidas.indexOf(a.chave) - chavesConhecidas.indexOf(b.chave));
}

/** Mostra os bairros com mais relatos e junta o restante em "Outros N bairros". */
export function resumirBairros(linhas, limite = BAIRROS_EM_DESTAQUE) {
  const ordenadas = [...linhas].sort(
    (a, b) => b.total - a.total || a.chave.localeCompare(b.chave, 'pt-BR'),
  );
  const destaque = ordenadas.slice(0, limite).map(({ chave, total }) => ({ bairro: chave, total }));
  const resto = ordenadas.slice(limite);
  if (resto.length > 0) {
    const soma = resto.reduce((acc, { total }) => acc + total, 0);
    destaque.push({ bairro: `Outros ${resto.length} bairros`, total: soma, agregado: true });
  }
  return destaque;
}

/**
 * Períodos comparados pela regra de atenção, a partir do "hoje" de São Paulo.
 * Janela atual = [inicioAtual, fim): hoje e os 6 dias anteriores.
 * Janela anterior = [inicioAnterior, inicioAtual): os 7 dias antes disso.
 * @returns {{ inicioAnterior: Date, inicioAtual: Date, fim: Date }}
 */
export function janelasDeAtencao(agora = new Date(), regra = REGRA_ATENCAO) {
  const hoje = dataDeTexto(hojeEmSaoPaulo(agora));
  const duracao = regra.janelaDias * MS_POR_DIA;
  const fim = new Date(hoje.getTime() + MS_POR_DIA); // exclusivo, para incluir o dia de hoje inteiro
  const inicioAtual = new Date(fim.getTime() - duracao);
  const inicioAnterior = new Date(inicioAtual.getTime() - duracao);
  return { inicioAnterior, inicioAtual, fim };
}

export function tendencia(atual, anterior) {
  if (atual > anterior) return 'subindo';
  if (atual < anterior) return 'caindo';
  return 'estavel';
}

const plural = (n, singular, pluralTexto) => `${n} ${n === 1 ? singular : pluralTexto}`;

/**
 * Aplica a regra de atenção a um bairro, olhando só os últimos 7 dias.
 * @param {{ atual: number, altoAtual: number }} janela
 * @returns {{ nivel: 'alta'|'moderada'|'sem-sinal', motivo: string }}
 */
export function classificarAtencao({ atual, altoAtual }, regra = REGRA_ATENCAO) {
  const dias = regra.janelaDias;

  if (atual >= regra.altaRelatos) {
    return { nivel: 'alta', motivo: `${atual} relatos em ${dias} dias (limiar: ${regra.altaRelatos})` };
  }
  if (altoAtual >= regra.altaImpactoAlto) {
    return { nivel: 'alta', motivo: `${altoAtual} relatos com impacto alto em ${dias} dias` };
  }
  if (atual >= regra.moderadaRelatosMin && atual <= regra.moderadaRelatosMax) {
    return {
      nivel: 'moderada',
      motivo: `${atual} relatos em ${dias} dias (faixa ${regra.moderadaRelatosMin}–${regra.moderadaRelatosMax})`,
    };
  }
  if (altoAtual >= regra.moderadaImpactoAlto) {
    return { nivel: 'moderada', motivo: `${plural(altoAtual, 'relato', 'relatos')} com impacto alto em ${dias} dias` };
  }
  return { nivel: 'sem-sinal', motivo: 'Abaixo dos limiares da regra' };
}

const ORDEM_NIVEL = { alta: 0, moderada: 1, 'sem-sinal': 2 };

/** Lista de atenção por bairro: só quem teve relato nos últimos 7 dias, do mais ao menos intenso. */
export function montarAtencao(janelas, regra = REGRA_ATENCAO) {
  return janelas
    .filter(({ atual }) => atual > 0)
    .map(({ bairro, atual, anterior, altoAtual }) => ({
      bairro,
      relatos7d: atual,
      relatosAnteriores: anterior,
      impactoAlto7d: altoAtual,
      tendencia: tendencia(atual, anterior),
      ...classificarAtencao({ atual, altoAtual }, regra),
    }))
    .sort(
      (a, b) =>
        ORDEM_NIVEL[a.nivel] - ORDEM_NIVEL[b.nivel] ||
        b.relatos7d - a.relatos7d ||
        a.bairro.localeCompare(b.bairro, 'pt-BR'),
    );
}

/**
 * Indicadores do painel.
 * Obrigatórios do enunciado: `total` e o resumo `porCategoria` / `porImpacto`.
 * Extras: bairro com mais relatos, atenção dos últimos 7 dias e tendência.
 *
 * @param {object} dados
 * @param {number} dados.total
 * @param {{chave: string, total: number}[]} dados.porCategoria
 * @param {{chave: string, total: number}[]} dados.porImpacto
 * @param {{chave: string, total: number}[]} dados.porBairro
 * @param {{bairro: string, atual: number, anterior: number, altoAtual: number}[]} dados.janelas
 * @param {Date} [dados.geradoEm]
 */
export function calcularIndicadores({ total, porCategoria, porImpacto, porBairro, janelas, geradoEm = new Date() }) {
  const categorias = completarPorChave(porCategoria, CATEGORIAS, total).map(({ chave, ...resto }) => ({
    categoria: chave,
    ...resto,
  }));
  const impactos = completarPorChave(porImpacto, IMPACTOS, total).map(({ chave, ...resto }) => ({
    impacto: chave,
    ...resto,
  }));
  const atencao = montarAtencao(janelas);

  return {
    total,
    categoriaMaisRelatada: total > 0 ? categorias[0] : null,
    bairrosComRelatos: porBairro.length,
    atencaoAlta: atencao.filter(({ nivel }) => nivel === 'alta').length,
    porCategoria: categorias,
    porImpacto: impactos,
    porBairro: resumirBairros(porBairro),
    atencao,
    regra: { ...REGRA_ATENCAO },
    geradoEm: geradoEm.toISOString(),
  };
}

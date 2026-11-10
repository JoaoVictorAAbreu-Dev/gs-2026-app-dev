// Acesso à coleção "relatos" do MongoDB.
// Tudo que fala com o banco fica aqui; o resto do código só conhece esta interface:
//   inserir, listar, contar, agruparPor, janelasPorBairro, bairros.
// Os agrupamentos usam o pipeline de agregação ($group), então o banco faz a contagem.

const CAMPOS_AGRUPAVEIS = new Set(['categoria', 'bairro', 'impacto']);

export function criarRepositorioMongo(colecao) {
  return {
    /** Grava um relato e devolve o documento com o _id gerado. */
    async inserir(documento) {
      const { insertedId } = await colecao.insertOne({ ...documento });
      return { ...documento, _id: insertedId };
    },

    /** Lista do mais recente para o mais antigo, com paginação. */
    async listar({ filtro = {}, limite, pular }) {
      const [itens, total] = await Promise.all([
        colecao.find(filtro).sort({ criadoEm: -1, _id: -1 }).skip(pular).limit(limite).toArray(),
        colecao.countDocuments(filtro),
      ]);
      return { itens, total };
    },

    contar(filtro = {}) {
      return colecao.countDocuments(filtro);
    },

    /** Relatos por categoria, impacto ou bairro: [{ chave, total }] do maior para o menor. */
    async agruparPor(campo, filtro = {}) {
      if (!CAMPOS_AGRUPAVEIS.has(campo)) throw new Error(`Campo não permitido para agrupamento: ${campo}`);
      return colecao
        .aggregate([
          { $match: filtro },
          { $group: { _id: `$${campo}`, total: { $sum: 1 } } },
          { $sort: { total: -1, _id: 1 } },
          { $project: { _id: 0, chave: '$_id', total: 1 } },
        ])
        .toArray();
    },

    /**
     * Para cada bairro: relatos na janela atual, na anterior e quantos de impacto alto na atual.
     * Janela atual = [inicioAtual, fim); anterior = [inicioAnterior, inicioAtual).
     */
    async janelasPorBairro({ inicioAnterior, inicioAtual, fim }) {
      const naAtual = { $gte: ['$dataEvento', inicioAtual] };
      return colecao
        .aggregate([
          { $match: { dataEvento: { $gte: inicioAnterior, $lt: fim } } },
          {
            $group: {
              _id: '$bairro',
              atual: { $sum: { $cond: [naAtual, 1, 0] } },
              anterior: { $sum: { $cond: [{ $lt: ['$dataEvento', inicioAtual] }, 1, 0] } },
              altoAtual: { $sum: { $cond: [{ $and: [naAtual, { $eq: ['$impacto', 'alto'] }] }, 1, 0] } },
            },
          },
          { $project: { _id: 0, bairro: '$_id', atual: 1, anterior: 1, altoAtual: 1 } },
        ])
        .toArray();
    },

    /** Bairros já informados (alimenta a lista de sugestões do formulário). */
    async bairros() {
      const lista = await colecao.distinct('bairro');
      return lista.sort((a, b) => a.localeCompare(b, 'pt-BR'));
    },
  };
}

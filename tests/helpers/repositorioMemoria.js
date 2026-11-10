// Repositório em memória com a mesma interface do repositório do MongoDB.
// Existe só para os testes e para a verificação local; o app usa relatosMongo.js.

import { ObjectId } from './idFalso.js';

function combina(documento, filtro) {
  return Object.entries(filtro).every(([campo, valor]) => documento[campo] === valor);
}

export function criarRepositorioMemoria(inicial = []) {
  const documentos = inicial.map((doc) => ({ _id: doc._id ?? new ObjectId(), ...doc }));

  return {
    documentos,

    async inserir(documento) {
      const salvo = { _id: new ObjectId(), ...documento };
      documentos.push(salvo);
      return salvo;
    },

    async listar({ filtro = {}, limite, pular }) {
      const filtrados = documentos
        .filter((doc) => combina(doc, filtro))
        .sort((a, b) => b.criadoEm - a.criadoEm);
      return { itens: filtrados.slice(pular, pular + limite), total: filtrados.length };
    },

    async contar(filtro = {}) {
      return documentos.filter((doc) => combina(doc, filtro)).length;
    },

    async agruparPor(campo, filtro = {}) {
      const contagem = new Map();
      for (const doc of documentos.filter((d) => combina(d, filtro))) {
        contagem.set(doc[campo], (contagem.get(doc[campo]) ?? 0) + 1);
      }
      return [...contagem]
        .map(([chave, total]) => ({ chave, total }))
        .sort((a, b) => b.total - a.total || String(a.chave).localeCompare(String(b.chave)));
    },

    async janelasPorBairro({ inicioAnterior, inicioAtual, fim }) {
      const porBairro = new Map();
      for (const doc of documentos) {
        if (doc.dataEvento < inicioAnterior || doc.dataEvento >= fim) continue;
        const linha = porBairro.get(doc.bairro) ?? { bairro: doc.bairro, atual: 0, anterior: 0, altoAtual: 0 };
        if (doc.dataEvento >= inicioAtual) {
          linha.atual += 1;
          if (doc.impacto === 'alto') linha.altoAtual += 1;
        } else {
          linha.anterior += 1;
        }
        porBairro.set(doc.bairro, linha);
      }
      return [...porBairro.values()];
    },

    async bairros() {
      return [...new Set(documentos.map((doc) => doc.bairro))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    },
  };
}

import { MongoClient } from 'mongodb';
import { CATEGORIAS, IMPACTOS, LIMITES } from '../dominio.js';

export const NOME_COLECAO = 'relatos';

// Segunda camada de validação, dentro do próprio MongoDB: se algum código esquecer
// de validar, o banco ainda recusa documentos fora do formato.
const VALIDADOR = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['categoria', 'bairro', 'impacto', 'dataEvento', 'descricao', 'ficticio', 'criadoEm'],
    properties: {
      categoria: { enum: [...CATEGORIAS] },
      bairro: { bsonType: 'string', minLength: LIMITES.bairroMin, maxLength: LIMITES.bairroMax },
      impacto: { enum: [...IMPACTOS] },
      dataEvento: { bsonType: 'date' },
      descricao: { bsonType: 'string', maxLength: LIMITES.descricaoMax },
      ficticio: { bsonType: 'bool' },
      criadoEm: { bsonType: 'date' },
    },
  },
};

/**
 * Conecta no MongoDB, garante a coleção (com validador) e os índices.
 * @returns {{ client: MongoClient, colecao: import('mongodb').Collection }}
 */
export async function conectar({ uri, nomeBanco }) {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  await client.connect();

  const db = client.db(nomeBanco);
  const existe = (await db.listCollections({ name: NOME_COLECAO }, { nameOnly: true }).toArray()).length > 0;
  if (!existe) await db.createCollection(NOME_COLECAO, { validator: VALIDADOR });

  const colecao = db.collection(NOME_COLECAO);
  await Promise.all([
    colecao.createIndex({ criadoEm: -1 }),
    colecao.createIndex({ dataEvento: -1 }),
    colecao.createIndex({ bairro: 1 }),
  ]);

  return { client, colecao };
}

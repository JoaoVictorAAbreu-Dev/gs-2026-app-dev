// Popula o banco com relatos fictícios para a demonstração: npm run seed
// Só apaga e recria documentos marcados com ficticio:true; relatos reais ficam intactos.

import { conectar } from '../src/config/db.js';
import { gerarRelatosFicticios } from './dadosFicticios.js';

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const nomeBanco = process.env.MONGODB_DB || 'territorio_seguro';

const { client, colecao } = await conectar({ uri, nomeBanco });
try {
  const apagados = await colecao.deleteMany({ ficticio: true });
  const documentos = gerarRelatosFicticios(new Date());
  const { insertedCount } = await colecao.insertMany(documentos);
  console.log(`Seed concluído: ${apagados.deletedCount} fictícios antigos removidos, ${insertedCount} inseridos em "${nomeBanco}.relatos".`);
} catch (erro) {
  console.error('Falha no seed:', erro.message);
  process.exitCode = 1;
} finally {
  await client.close();
}

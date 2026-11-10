import { criarApp } from './app.js';
import { conectar } from './config/db.js';
import { criarRepositorioMongo } from './repositories/relatosMongo.js';

const porta = Number(process.env.PORT) || 3000;
const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const nomeBanco = process.env.MONGODB_DB || 'territorio_seguro';

let conexao;
try {
  conexao = await conectar({ uri, nomeBanco });
} catch (erro) {
  console.error(`Não consegui conectar ao MongoDB em ${uri.replace(/\/\/[^@]*@/, '//***@')}.`);
  console.error('Confira se o MongoDB está rodando (ou se a MONGODB_URI do .env está certa). Detalhe:', erro.message);
  process.exit(1);
}

const app = criarApp({ repositorio: criarRepositorioMongo(conexao.colecao) });
const servidor = app.listen(porta, () => {
  console.log(`Território Seguro no ar: http://localhost:${porta}`);
});

// Encerramento limpo (Ctrl+C): fecha o servidor e a conexão com o banco.
async function encerrar() {
  servidor.close();
  await conexao.client.close();
  process.exit(0);
}
process.on('SIGINT', encerrar);
process.on('SIGTERM', encerrar);

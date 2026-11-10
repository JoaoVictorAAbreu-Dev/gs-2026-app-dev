import { criarApp } from './app.js';
import { conectar } from './config/db.js';
import { criarRepositorioMongo } from './repositories/relatosMongo.js';

const PORTA_PADRAO = 3000;
const PRAZO_PARA_ENCERRAR_MS = 5000;

const porta = Number(process.env.PORT) || PORTA_PADRAO;
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
// Espera os pedidos em andamento terminarem; se demorar demais, sai assim mesmo.
let encerrando = false;
async function encerrar() {
  if (encerrando) return;
  encerrando = true;
  setTimeout(() => process.exit(1), PRAZO_PARA_ENCERRAR_MS).unref();

  await new Promise((resolve) => servidor.close(resolve));
  await conexao.client.close();
  process.exit(0);
}
process.on('SIGINT', encerrar);
process.on('SIGTERM', encerrar);

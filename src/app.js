// Monta o app Express sem iniciar o servidor (quem chama `listen` é o server.js).
// Assim os testes criam o app com um repositório falso, sem precisar do MongoDB.

import { fileURLToPath } from 'node:url';
import express from 'express';
import { criarControlador } from './controllers/relatos.js';
import { criarLimitadorDeEnvios } from './middlewares/limitarEnvios.js';
import { cabecalhosSeguranca } from './middlewares/cabecalhosSeguranca.js';
import { criarNaoEncontrado } from './middlewares/naoEncontrado.js';
import { tratarErros } from './middlewares/tratarErros.js';
import { criarRotasApi } from './routes/api.js';

const PASTA_PUBLICA = fileURLToPath(new URL('../public/', import.meta.url));

export function criarApp({
  repositorio,
  agora = () => new Date(),
  pastaPublica = PASTA_PUBLICA,
  limitarEnvios = criarLimitadorDeEnvios(),
}) {
  const app = express();
  app.disable('x-powered-by');

  app.use(cabecalhosSeguranca);

  // API (GET e POST). Corpo JSON limitado: um relato cabe com folga em 10 KB.
  const controlador = criarControlador({ repositorio, agora });
  app.use('/api', express.json({ limit: '10kb' }), criarRotasApi(controlador, { limitarEnvios }));

  // Páginas do site: "/" -> index.html, "/registrar" -> registrar.html, etc.
  // Em desenvolvimento não usa cache, para ver as mudanças de CSS/JS ao recarregar.
  const maxAge = process.env.NODE_ENV === 'production' ? '1h' : 0;
  app.use(express.static(pastaPublica, { extensions: ['html'], maxAge }));

  app.use(criarNaoEncontrado(pastaPublica));
  app.use(tratarErros);

  return app;
}

import { Router } from 'express';

/** Rejeita POST que não seja JSON, com mensagem clara (415). */
function exigirJson(req, res, next) {
  if (!req.is('application/json')) {
    return res.status(415).json({ erro: 'formato_invalido', mensagem: 'Envie os dados em JSON (Content-Type: application/json).' });
  }
  return next();
}

/** Respostas da API mudam a cada relato; não devem ficar em cache. */
function semCache(req, res, next) {
  res.set('Cache-Control', 'no-store');
  next();
}

/**
 * Rotas da API. No Express 5, handlers `async` que lançam erro (ou rejeitam a Promise)
 * já vão para o middleware de erro, então não precisa de try/catch em cada rota.
 */
export function criarRotasApi(controlador) {
  const rotas = Router();
  rotas.use(semCache);

  rotas.get('/relatos', controlador.listar);
  rotas.post('/relatos', exigirJson, controlador.criar);
  rotas.get('/indicadores', controlador.indicadores);
  rotas.get('/bairros', controlador.bairros);

  return rotas;
}

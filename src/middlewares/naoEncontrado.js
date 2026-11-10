import { join } from 'node:path';

/**
 * Rota inexistente (404): JSON para /api, página HTML do site para o resto.
 * Fica depois de todas as rotas e do express.static.
 */
export function criarNaoEncontrado(pastaPublica) {
  return function naoEncontrado(req, res) {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({
        erro: 'rota_nao_encontrada',
        mensagem: `A rota ${req.method} ${req.path} não existe.`,
      });
    }
    return res.status(404).sendFile(join(pastaPublica, '404.html'));
  };
}

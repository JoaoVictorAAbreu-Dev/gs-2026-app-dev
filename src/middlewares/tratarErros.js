/**
 * Último middleware: transforma qualquer erro em JSON com mensagem amigável.
 * O detalhe técnico vai só para o log do servidor, nunca para quem usa o site.
 */
export function tratarErros(erro, req, res, next) {
  if (res.headersSent) return next(erro);

  // Erros do leitor de JSON do Express têm um "type" conhecido.
  if (erro.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'json_invalido', mensagem: 'Não consegui ler os dados enviados.' });
  }
  if (erro.type === 'entity.too.large') {
    return res.status(413).json({ erro: 'corpo_grande', mensagem: 'Os dados enviados são grandes demais.' });
  }

  console.error('[erro]', req.method, req.originalUrl, erro);
  return res.status(500).json({
    erro: 'erro_interno',
    mensagem: 'Algo deu errado do nosso lado. Suas respostas não foram perdidas; tente de novo em instantes.',
  });
}

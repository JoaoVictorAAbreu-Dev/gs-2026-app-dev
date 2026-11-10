// Conversa com a API do servidor. Todo erro vira um ErroApi com mensagem pronta para mostrar.

export class ErroApi extends Error {
  constructor(codigo, mensagem, { status = 0, campos = null } = {}) {
    super(mensagem);
    this.codigo = codigo;
    this.status = status;
    this.campos = campos;
  }
}

async function pedir(url, opcoes = {}) {
  let resposta;
  try {
    resposta = await fetch(url, { ...opcoes, headers: { Accept: 'application/json', ...opcoes.headers } });
  } catch {
    throw new ErroApi('rede', 'Sem conexão com o servidor. Confira a internet e tente de novo.');
  }

  const corpo = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    throw new ErroApi(corpo?.erro ?? 'http', corpo?.mensagem ?? 'Algo deu errado. Tente de novo.', {
      status: resposta.status,
      campos: corpo?.campos ?? null,
    });
  }
  return corpo;
}

/** Só envia os filtros preenchidos. */
function comParametros(caminho, parametros) {
  const consulta = new URLSearchParams(Object.entries(parametros).filter(([, v]) => v !== '' && v != null));
  const texto = consulta.toString();
  return texto ? `${caminho}?${texto}` : caminho;
}

export const listarRelatos = (parametros = {}) => pedir(comParametros('/api/relatos', parametros));

export const criarRelato = (dados) =>
  pedir('/api/relatos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  });

export const obterIndicadores = () => pedir('/api/indicadores');

export const listarBairros = () => pedir('/api/bairros');

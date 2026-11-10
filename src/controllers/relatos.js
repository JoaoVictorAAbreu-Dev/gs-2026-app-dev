// Controlador dos relatos. Recebe o repositório por parâmetro (injeção de dependência),
// então os mesmos handlers rodam com MongoDB de verdade ou com um repositório em memória nos testes.
// Cada handler só usa req.body, req.query e res.status().json(), que o Express e os testes oferecem.

import { CATEGORIAS, IMPACTOS, LIMITES, dataDeTexto, textoDeData } from '../dominio.js';
import { calcularIndicadores, janelasDeAtencao } from '../services/indicadores.js';
import { normalizarBairro, validarRelato } from '../validation/relato.js';

const LIMITE_PADRAO = 10;
const LIMITE_MAXIMO = 50;
const PAGINA_MAXIMA = 10_000;

/** Documento do banco -> JSON da API (sem expor detalhes internos). */
export function paraResposta(documento) {
  return {
    id: String(documento._id),
    categoria: documento.categoria,
    bairro: documento.bairro,
    impacto: documento.impacto,
    dataEvento: textoDeData(documento.dataEvento),
    descricao: documento.descricao,
    ficticio: documento.ficticio,
    criadoEm: documento.criadoEm.toISOString(),
  };
}

/** "5" -> 5; ausente -> padrão; qualquer outra coisa -> null (inválido). */
function lerInteiro(valor, padrao, minimo, maximo) {
  if (valor === undefined || valor === '') return padrao;
  if (typeof valor !== 'string' || !/^\d+$/.test(valor)) return null;
  const numero = Number(valor);
  return numero >= minimo && numero <= maximo ? numero : null;
}

/**
 * Filtros aceitos na listagem. Só valores conhecidos passam: isso evita que alguém
 * mande ?impacto[$ne]=x e vire uma consulta arbitrária no MongoDB.
 */
function lerFiltros(consulta) {
  const filtro = {};
  const { categoria, impacto, bairro } = consulta;

  if (categoria !== undefined && categoria !== '') {
    if (typeof categoria !== 'string' || !CATEGORIAS.includes(categoria)) return { invalido: 'categoria' };
    filtro.categoria = categoria;
  }
  if (impacto !== undefined && impacto !== '') {
    if (typeof impacto !== 'string' || !IMPACTOS.includes(impacto)) return { invalido: 'impacto' };
    filtro.impacto = impacto;
  }
  if (bairro !== undefined && bairro !== '') {
    if (typeof bairro !== 'string' || bairro.length > LIMITES.bairroMax) return { invalido: 'bairro' };
    filtro.bairro = normalizarBairro(bairro);
  }
  return { filtro };
}

export function criarControlador({ repositorio, agora = () => new Date() }) {
  return {
    /** POST /api/relatos — valida, grava e confirma. */
    async criar(req, res) {
      const resultado = validarRelato(req.body, { agora: agora() });
      if (!resultado.valido) {
        return res.status(422).json({
          erro: 'validacao',
          mensagem: 'Corrija os campos indicados e envie de novo.',
          campos: resultado.erros,
        });
      }

      const salvo = await repositorio.inserir({
        ...resultado.dados,
        dataEvento: dataDeTexto(resultado.dados.dataEvento),
        ficticio: false, // só o script de seed cria dados de demonstração
        criadoEm: agora(),
      });

      return res.status(201).json({ mensagem: 'Pronto! Seu relato foi registrado.', relato: paraResposta(salvo) });
    },

    /** GET /api/relatos — listagem paginada, do mais recente ao mais antigo. */
    async listar(req, res) {
      const consulta = req.query ?? {};
      const { filtro, invalido } = lerFiltros(consulta);
      if (invalido) {
        return res.status(400).json({ erro: 'filtro_invalido', mensagem: `Filtro inválido: ${invalido}.` });
      }

      const limite = lerInteiro(consulta.limite, LIMITE_PADRAO, 1, LIMITE_MAXIMO);
      const pagina = lerInteiro(consulta.pagina, 1, 1, PAGINA_MAXIMA);
      if (limite === null || pagina === null) {
        return res.status(400).json({
          erro: 'paginacao_invalida',
          mensagem: `Use limite de 1 a ${LIMITE_MAXIMO} e pagina a partir de 1.`,
        });
      }

      const { itens, total } = await repositorio.listar({ filtro, limite, pular: (pagina - 1) * limite });
      return res.json({
        itens: itens.map(paraResposta),
        total,
        pagina,
        limite,
        temMais: pagina * limite < total,
      });
    },

    /** GET /api/indicadores — total, resumo por categoria/impacto/bairro e atenção dos últimos 7 dias. */
    async indicadores(req, res) {
      const instante = agora();
      const [total, porCategoria, porImpacto, porBairro, janelas] = await Promise.all([
        repositorio.contar(),
        repositorio.agruparPor('categoria'),
        repositorio.agruparPor('impacto'),
        repositorio.agruparPor('bairro'),
        repositorio.janelasPorBairro(janelasDeAtencao(instante)),
      ]);

      return res.json(calcularIndicadores({ total, porCategoria, porImpacto, porBairro, janelas, geradoEm: instante }));
    },

    /** GET /api/bairros — nomes já usados, para sugerir no formulário. */
    async bairros(req, res) {
      return res.json({ bairros: await repositorio.bairros() });
    },
  };
}

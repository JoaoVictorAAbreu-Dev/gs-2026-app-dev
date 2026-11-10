// Validação do relato. Função pura: recebe o que chegou do formulário e devolve
// os dados limpos ou uma mensagem por campo. Não toca em banco nem em Express.

import {
  CATEGORIAS,
  IMPACTOS,
  LIMITES,
  MS_POR_DIA,
  dataDeTexto,
  hojeEmSaoPaulo,
} from '../dominio.js';

const ERROS = Object.freeze({
  categoria: 'Escolha uma figura para continuar.',
  bairro: `Escreva o nome do bairro (de ${LIMITES.bairroMin} a ${LIMITES.bairroMax} letras).`,
  bairroCaracteres: 'Use só letras, números e espaços no nome do bairro.',
  dataFaltando: 'Escolha o dia em que aconteceu.',
  dataFormato: 'A data não parece certa. Escolha de novo.',
  dataFuturo: 'A data não pode ser no futuro.',
  dataAntiga: 'Escolha uma data dos últimos 12 meses.',
  impacto: 'Escolha até onde a água chegou.',
  descricaoTamanho: `Use até ${LIMITES.descricaoMax} letras.`,
  descricaoPrivacidade: 'Tire telefones e e-mails do texto. Não pedimos dados pessoais.',
  geral: 'Envie as respostas do relato.',
});

const PALAVRAS_MINUSCULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
const CARACTERES_BAIRRO = /^[\p{L}\p{N} .,'’ºª-]+$/u;
const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/;
// Sequências que parecem telefone: 8+ dígitos, com ou sem DDD, espaço ou hífen.
const TELEFONE = /(?:\+?55[\s-]?)?(?:\(?\d{2}\)?[\s-]?)?9?\d{4}[\s-]?\d{4}/;
const ROMANOS = /^(?:i{1,3}|iv|v|vi{1,3}|ix|x)$/;
const CONTROLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** "jardim são josé  ii" -> "Jardim São José II" (preposições ficam minúsculas; romanos, maiúsculos). */
export function normalizarBairro(texto) {
  return texto
    .normalize('NFC')
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((palavra, i) => {
      const minuscula = palavra.toLocaleLowerCase('pt-BR');
      if (i > 0 && PALAVRAS_MINUSCULAS.has(minuscula)) return minuscula;
      // Algarismos romanos curtos (II, III, IV) continuam em maiúsculas.
      if (ROMANOS.test(minuscula)) return minuscula.toUpperCase();
      return minuscula.charAt(0).toLocaleUpperCase('pt-BR') + minuscula.slice(1);
    })
    .join(' ');
}

function ehObjetoSimples(valor) {
  return valor !== null && typeof valor === 'object' && !Array.isArray(valor);
}

function validarData(valor, agora) {
  if (valor === undefined || valor === null || valor === '') return { erro: ERROS.dataFaltando };
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return { erro: ERROS.dataFormato };

  const data = dataDeTexto(valor);
  // Confere se o dia existe de verdade (31/02 viraria 03/03 e não bate com o texto).
  if (Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== valor) {
    return { erro: ERROS.dataFormato };
  }

  const hoje = dataDeTexto(hojeEmSaoPaulo(agora));
  if (data > hoje) return { erro: ERROS.dataFuturo };
  if ((hoje - data) / MS_POR_DIA > LIMITES.diasNoPassadoMax) return { erro: ERROS.dataAntiga };
  return { valor };
}

/**
 * @param {unknown} entrada corpo recebido do formulário
 * @param {{ agora?: Date }} [opcoes] relógio injetável (facilita os testes)
 * @returns {{ valido: boolean, erros: Record<string, string>, dados?: object }}
 */
export function validarRelato(entrada, { agora = new Date() } = {}) {
  if (!ehObjetoSimples(entrada)) return { valido: false, erros: { _geral: ERROS.geral } };

  const erros = {};

  const categoria = entrada.categoria;
  if (typeof categoria !== 'string' || !CATEGORIAS.includes(categoria)) erros.categoria = ERROS.categoria;

  let bairro = '';
  if (typeof entrada.bairro !== 'string') {
    erros.bairro = ERROS.bairro;
  } else {
    bairro = normalizarBairro(entrada.bairro);
    if (bairro.length < LIMITES.bairroMin || bairro.length > LIMITES.bairroMax) erros.bairro = ERROS.bairro;
    else if (!CARACTERES_BAIRRO.test(bairro)) erros.bairro = ERROS.bairroCaracteres;
  }

  const data = validarData(entrada.dataEvento, agora);
  if (data.erro) erros.dataEvento = data.erro;

  const impacto = entrada.impacto;
  if (typeof impacto !== 'string' || !IMPACTOS.includes(impacto)) erros.impacto = ERROS.impacto;

  let descricao = '';
  if (entrada.descricao !== undefined && entrada.descricao !== null) {
    if (typeof entrada.descricao !== 'string') {
      erros.descricao = ERROS.descricaoTamanho;
    } else {
      descricao = entrada.descricao.replace(CONTROLE, '').trim();
      if (descricao.length > LIMITES.descricaoMax) erros.descricao = ERROS.descricaoTamanho;
      else if (EMAIL.test(descricao) || TELEFONE.test(descricao)) erros.descricao = ERROS.descricaoPrivacidade;
    }
  }

  if (Object.keys(erros).length > 0) return { valido: false, erros };

  return {
    valido: true,
    erros: {},
    dados: { categoria, bairro, impacto, dataEvento: data.valor, descricao },
  };
}

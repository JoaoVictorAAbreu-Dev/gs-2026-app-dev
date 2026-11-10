// Vocabulário do domínio: valores aceitos e regras numéricas.
// Mantido em um só lugar para a validação, o banco e a regra de atenção usarem os mesmos números.

export const CATEGORIAS = Object.freeze([
  'alagamento', // Alagamento em via
  'agua-imovel', // Água em imóvel
  'drenagem', // Obstrução de drenagem
  'erosao', // Erosão ou movimentação de terra
  'via', // Dano ou interdição de via
  'outro', // Outro impacto da chuva
]);

// Nível de água percebido por quem relata: tornozelo, joelho, cintura.
export const IMPACTOS = Object.freeze(['baixo', 'moderado', 'alto']);

export const FUSO = 'America/Sao_Paulo';

export const LIMITES = Object.freeze({
  bairroMin: 2,
  bairroMax: 80,
  descricaoMax: 500,
  diasNoPassadoMax: 365,
});

// Regra de "atenção comunitária" do painel (mostrada ao usuário, então vive aqui).
// alta:     >= 5 relatos em 7 dias OU >= 2 relatos de impacto alto em 7 dias
// moderada: 2 a 4 relatos em 7 dias OU 1 relato de impacto alto em 7 dias
export const REGRA_ATENCAO = Object.freeze({
  janelaDias: 7,
  altaRelatos: 5,
  altaImpactoAlto: 2,
  moderadaRelatosMin: 2,
  moderadaRelatosMax: 4,
  moderadaImpactoAlto: 1,
});

// Regra contra abuso: uma mesma origem (endereço IP) registra no máximo N relatos por janela.
// Sem isso, uma só pessoa conseguiria inflar a "atenção" de um bairro enviando vários relatos seguidos.
export const LIMITE_ENVIOS = Object.freeze({
  maximo: 5,
  janelaMinutos: 10,
});

export const MS_POR_DIA = 86_400_000;
export const MS_POR_MINUTO = 60_000;

/** Data de "hoje" no fuso de São Paulo, no formato AAAA-MM-DD. */
export function hojeEmSaoPaulo(agora = new Date()) {
  // O locale en-CA formata como AAAA-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(agora);
}

/** Converte AAAA-MM-DD em Date à meia-noite UTC (como as datas de evento são guardadas). */
export function dataDeTexto(texto) {
  const [ano, mes, dia] = texto.split('-').map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia));
}

/** Date (meia-noite UTC) para AAAA-MM-DD. */
export function textoDeData(data) {
  return data.toISOString().slice(0, 10);
}

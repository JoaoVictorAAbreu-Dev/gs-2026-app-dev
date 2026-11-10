// Nomes em português e formatação de datas. Os códigos (chaves) são os mesmos de src/dominio.js.

export const CATEGORIAS = {
  alagamento: { nome: 'Alagamento em via', curto: 'Rua alagada', painel: 'Alagamento em via', icone: 'pic-alagamento' },
  'agua-imovel': { nome: 'Água em imóvel', curto: 'Água dentro de casa', painel: 'Água em imóvel', icone: 'pic-agua-imovel' },
  drenagem: { nome: 'Obstrução de drenagem', curto: 'Bueiro entupido', painel: 'Obstrução de drenagem', icone: 'pic-drenagem' },
  erosao: { nome: 'Erosão ou movimentação de terra', curto: 'Terra cedendo', painel: 'Erosão/mov. de terra', icone: 'pic-erosao' },
  via: { nome: 'Dano ou interdição de via', curto: 'Rua danificada ou fechada', painel: 'Dano/interdição de via', icone: 'pic-via' },
  outro: { nome: 'Outro impacto da chuva', curto: 'Outro problema da chuva', painel: 'Outro impacto', icone: 'pic-outro' },
};

export const IMPACTOS = {
  baixo: { nome: 'Impacto baixo', curto: 'Pouco', detalhe: 'tornozelo', selo: '' },
  moderado: { nome: 'Impacto moderado', curto: 'Médio', detalhe: 'joelho', selo: 'moderada' },
  alto: { nome: 'Impacto alto', curto: 'Muito', detalhe: 'cintura', selo: 'alta' },
};

export const ATENCAO = {
  alta: { nome: 'Atenção alta', selo: 'alta' },
  moderada: { nome: 'Atenção moderada', selo: 'moderada' },
  'sem-sinal': { nome: 'Sem sinal', selo: '' },
};

export const TENDENCIA = {
  subindo: '↑ subindo',
  estavel: '→ estável',
  caindo: '↓ caindo',
};

const FUSO = 'America/Sao_Paulo';

export const plural = (n, singular, pluralTexto) => `${n} ${n === 1 ? singular : pluralTexto}`;

/** "A, B e C" */
export function listaEmTexto(itens) {
  if (itens.length <= 1) return itens.join('');
  return `${itens.slice(0, -1).join(', ')} e ${itens.at(-1)}`;
}

/** "2026-11-08" -> "08/11/2026" (sem passar por Date, para o fuso não mudar o dia). */
export function formatarData(iso) {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

const formatoDataHora = new Intl.DateTimeFormat('pt-BR', {
  timeZone: FUSO,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** Instante ISO -> "09/11/2026 às 09:12" no horário de Brasília. */
export function formatarDataHora(iso) {
  const p = Object.fromEntries(formatoDataHora.formatToParts(new Date(iso)).map(({ type, value }) => [type, value]));
  return `${p.day}/${p.month}/${p.year} às ${p.hour}:${p.minute}`;
}

/** Data de hoje em São Paulo (AAAA-MM-DD), a mesma regra que o servidor usa. */
export function hojeSP() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO }).format(new Date());
}

export function somarDias(iso, dias) {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia + dias)).toISOString().slice(0, 10);
}

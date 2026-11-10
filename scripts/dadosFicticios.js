// Gera 42 relatos fictícios para demonstração, com as mesmas contagens do protótipo do Figma:
//   categorias 18/12/5/4/2/1, 9 bairros, 2 bairros em atenção alta nos últimos 7 dias.
// As datas são relativas ao "agora", então o painel sempre mostra a última semana com dados.
// Sem aleatoriedade: rodar duas vezes gera o mesmo conjunto.

import { MS_POR_DIA, dataDeTexto, hojeEmSaoPaulo } from '../src/dominio.js';

// bairro -> quantos relatos na semana atual, na semana anterior e mais antigos (14 a 40 dias atrás)
const PLANO = [
  ['Jardim Exemplo', { atual: 6, anterior: 2, antigo: 3 }],
  ['Vila Modelo', { atual: 3, anterior: 3, antigo: 3 }],
  ['Parque Fictício', { atual: 3, anterior: 1, antigo: 4 }],
  ['Jardim Ilustrativo', { atual: 2, anterior: 4, antigo: 0 }],
  ['Vila Teste', { atual: 1, anterior: 3, antigo: 0 }],
  ['Vila Hipotética', { antigo: 1 }],
  ['Jardim Demonstração', { antigo: 1 }],
  ['Parque Amostra', { antigo: 1 }],
  ['Vila Protótipo', { antigo: 1 }],
];

// Impacto dos relatos da semana atual, por bairro. Só Jardim Exemplo e Vila Modelo
// têm impacto alto, para a regra de atenção dar o mesmo resultado do Figma.
const IMPACTO_SEMANA_ATUAL = {
  'Jardim Exemplo': ['alto', 'moderado', 'alto', 'moderado', 'baixo', 'moderado'],
  'Vila Modelo': ['alto', 'alto', 'baixo'],
  'Parque Fictício': ['moderado', 'baixo', 'moderado'],
  'Jardim Ilustrativo': ['baixo', 'moderado'],
  'Vila Teste': ['baixo'],
};
const IMPACTO_OUTROS = ['moderado', 'baixo', 'alto', 'moderado'];

const CONTAGEM_CATEGORIAS = [
  ['alagamento', 18],
  ['drenagem', 12],
  ['via', 5],
  ['agua-imovel', 4],
  ['erosao', 2],
  ['outro', 1],
];

const DESCRICOES = {
  alagamento: [
    'Água na altura do joelho na rua principal; carros e pedestres não conseguiam passar.',
    'Poças grandes no cruzamento, mas foi possível passar pela lateral.',
    'Rua tomada pela água depois de 20 minutos de chuva forte.',
  ],
  'agua-imovel': [
    'Água entrou em garagens de três casas da mesma rua durante a madrugada.',
    'Água passou da soleira e molhou o piso de um comércio pequeno.',
  ],
  drenagem: [
    'Boca de lobo da esquina tomada por lixo e folhas; água empoçou após a chuva.',
    'Bueiro entupido há dias, com água parada e mau cheiro.',
  ],
  via: [
    'Parte da calçada cedeu perto do córrego; trecho isolado com fita.',
    'Buraco grande no asfalto ficou coberto de água e não dava para ver.',
  ],
  erosao: ['Barranco ao lado da escada começou a soltar terra depois da chuva.'],
  outro: ['Queda de galho bloqueou a ciclovia por algumas horas.'],
};

/** Embaralha de forma determinística: o passo 17 é coprimo com 42, então percorre todos os índices. */
function categoriasEmbaralhadas() {
  const lista = CONTAGEM_CATEGORIAS.flatMap(([categoria, n]) => Array(n).fill(categoria));
  return lista.map((_, i) => lista[(i * 17) % lista.length]);
}

/** @returns {object[]} documentos prontos para inserir na coleção "relatos" */
export function gerarRelatosFicticios(agora = new Date()) {
  const hoje = dataDeTexto(hojeEmSaoPaulo(agora));
  const categorias = categoriasEmbaralhadas();
  const documentos = [];

  function adicionar(bairro, diasAtras, impacto) {
    const indice = documentos.length;
    const categoria = categorias[indice];
    const textos = DESCRICOES[categoria];
    const dataEvento = new Date(hoje.getTime() - diasAtras * MS_POR_DIA);
    // Registrado no mesmo dia, entre 7h e 21h; nunca no futuro.
    const registro = dataEvento.getTime() + (7 * 60 + ((indice * 47) % 840)) * 60_000;
    documentos.push({
      categoria,
      bairro,
      impacto,
      dataEvento,
      descricao: textos[indice % textos.length],
      ficticio: true,
      criadoEm: new Date(Math.min(registro, agora.getTime() - 60_000)),
    });
  }

  for (const [bairro, { atual = 0, anterior = 0, antigo = 0 }] of PLANO) {
    const impactosAtual = IMPACTO_SEMANA_ATUAL[bairro] ?? [];
    for (let k = 0; k < atual; k++) adicionar(bairro, k % 7, impactosAtual[k]);
    for (let k = 0; k < anterior; k++) adicionar(bairro, 7 + (k % 7), IMPACTO_OUTROS[k % IMPACTO_OUTROS.length]);
    for (let k = 0; k < antigo; k++) adicionar(bairro, 14 + ((k * 3) % 27), IMPACTO_OUTROS[(k + 1) % IMPACTO_OUTROS.length]);
  }

  return documentos;
}

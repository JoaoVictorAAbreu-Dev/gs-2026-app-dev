// Página "Registrar relato": validação no navegador, assistente de 5 passos no celular,
// ditado por voz, envio para a API e tela de sucesso.
import { ErroApi, criarRelato, listarBairros } from './api.js';
import { confirmar } from './confirmar.js';
import { anunciar, el, icone } from './dom.js';
import { CATEGORIAS, IMPACTOS, LIMITES, formatarData, hojeSP, somarDias } from './rotulos.js';

const form = document.getElementById('form-relato');
const passos = [...form.querySelectorAll('.passo')];
const resumoErros = document.getElementById('resumo-erros');
const resumoLista = document.getElementById('resumo-lista');
const erroEnvio = document.getElementById('erro-envio');
const botaoEnviar = document.getElementById('enviar');
const botaoContinuar = document.getElementById('continuar');
const botaoVoltar = document.getElementById('voltar');
const botaoLimpar = document.getElementById('limpar');
const assistente = document.getElementById('assistente');
const campoOutroDia = document.getElementById('campo-outro-dia');
const inputData = document.getElementById('dataEvento');
const inputBairro = document.getElementById('bairro');
const descricao = document.getElementById('descricao');

const PASSO_DO_CAMPO = { categoria: 1, impacto: 2, bairro: 3, dataEvento: 4, descricao: 5 };

// ---------- Estado do formulário ----------

function dataEscolhida() {
  const quando = form.elements.quando.value;
  const hoje = hojeSP();
  if (quando === 'hoje') return hoje;
  if (quando === 'ontem') return somarDias(hoje, -1);
  if (quando === 'outro') return inputData.value;
  return '';
}

function lerDados() {
  return {
    categoria: form.elements.categoria.value,
    impacto: form.elements.impacto.value,
    bairro: inputBairro.value.trim(),
    dataEvento: dataEscolhida(),
    descricao: descricao.value.trim(),
  };
}

/** Mesmas regras do servidor (src/validation/relato.js). O servidor continua sendo quem decide. */
function validarLocal(dados) {
  const erros = {};
  if (!CATEGORIAS[dados.categoria]) erros.categoria = 'Escolha uma figura para continuar.';
  if (!IMPACTOS[dados.impacto]) erros.impacto = 'Escolha até onde a água chegou.';
  if (dados.bairro.length < LIMITES.bairroMin || dados.bairro.length > LIMITES.bairroMax) {
    erros.bairro = `Escreva o nome do bairro (de ${LIMITES.bairroMin} a ${LIMITES.bairroMax} letras).`;
  }
  const hoje = hojeSP();
  if (!dados.dataEvento) erros.dataEvento = 'Escolha o dia em que aconteceu.';
  else if (dados.dataEvento > hoje) erros.dataEvento = 'A data não pode ser no futuro.';
  else if (dados.dataEvento < somarDias(hoje, -LIMITES.diasNoPassadoMax)) erros.dataEvento = 'Escolha uma data dos últimos 12 meses.';
  if (dados.descricao.length > LIMITES.descricaoMax) erros.descricao = `Use até ${LIMITES.descricaoMax} letras.`;
  return erros;
}

// ---------- Mostrar e limpar erros ----------

function entradasDo(campo) {
  if (campo === 'dataEvento') return [...form.querySelectorAll('input[name="quando"], #dataEvento')];
  return [...form.querySelectorAll(`[name="${campo}"]`)];
}

function mostrarErroDoCampo(campo, mensagem) {
  const caixa = form.querySelector(`[data-erro-de="${campo}"]`);
  if (!caixa) return;
  caixa.querySelector('span').textContent = mensagem ?? '';
  caixa.hidden = !mensagem;
  for (const entrada of entradasDo(campo)) {
    if (entrada.type === 'radio') continue;
    if (mensagem) entrada.setAttribute('aria-invalid', 'true');
    else entrada.removeAttribute('aria-invalid');
  }
  const passo = passos[PASSO_DO_CAMPO[campo] - 1];
  if (passo) passo.toggleAttribute('data-erro', Boolean(mensagem));
}

function limparErros() {
  for (const campo of Object.keys(PASSO_DO_CAMPO)) mostrarErroDoCampo(campo, '');
  resumoErros.hidden = true;
  resumoLista.replaceChildren();
  erroEnvio.hidden = true;
}

function mostrarErros(erros) {
  for (const campo of Object.keys(PASSO_DO_CAMPO)) mostrarErroDoCampo(campo, erros[campo] ?? '');
  const campos = Object.keys(erros).filter((c) => PASSO_DO_CAMPO[c]);
  if (campos.length === 0) return;

  resumoLista.replaceChildren(
    ...campos.map((campo) => {
      const ligacao = el('a', { href: `#titulo-${PASSO_DO_CAMPO[campo]}` }, erros[campo]);
      ligacao.addEventListener('click', (evento) => {
        evento.preventDefault();
        irParaPasso(PASSO_DO_CAMPO[campo], { focar: true });
      });
      return el('li', {}, ligacao);
    }),
  );
  resumoErros.hidden = false;
  resumoErros.focus();
  anunciar(`Falta ${campos.length === 1 ? 'uma resposta' : `${campos.length} respostas`}.`);
}

// ---------- Assistente de passos (celular) ----------

const consultaCelular = window.matchMedia('(max-width: 47.99rem)');
let passoAtual = 1;

function irParaPasso(numero, { focar = false } = {}) {
  passoAtual = Math.min(passos.length, Math.max(1, numero));
  passos.forEach((passo, i) => passo.toggleAttribute('data-ativo', i + 1 === passoAtual));
  atualizarControles();
  if (focar) document.getElementById(`titulo-${passoAtual}`).focus();
}

function atualizarControles() {
  const celular = consultaCelular.matches;
  assistente.hidden = !celular;
  botaoVoltar.hidden = !celular || passoAtual === 1;
  botaoContinuar.hidden = !celular || passoAtual === passos.length;
  botaoEnviar.hidden = celular && passoAtual !== passos.length;
  document.getElementById('assistente-texto').textContent = `Pergunta ${passoAtual} de ${passos.length}`;
  assistente.querySelectorAll('.assistente__barra li').forEach((marca, i) => {
    marca.toggleAttribute('data-feito', i < passoAtual);
  });
}

function camposDoPasso(numero) {
  return Object.entries(PASSO_DO_CAMPO)
    .filter(([, passo]) => passo === numero)
    .map(([campo]) => campo);
}

botaoContinuar.addEventListener('click', () => {
  const erros = validarLocal(lerDados());
  const doPasso = camposDoPasso(passoAtual).filter((c) => erros[c]);
  if (doPasso.length > 0) {
    for (const campo of camposDoPasso(passoAtual)) mostrarErroDoCampo(campo, erros[campo] ?? '');
    anunciar(erros[doPasso[0]]);
    return;
  }
  limparErros();
  irParaPasso(passoAtual + 1, { focar: true });
});

botaoVoltar.addEventListener('click', () => irParaPasso(passoAtual - 1, { focar: true }));
consultaCelular.addEventListener('change', () => irParaPasso(passoAtual));

// ---------- Campos ----------

// Escolher uma opção tira o erro daquele campo na hora.
form.addEventListener('change', (evento) => {
  const { name } = evento.target;
  if (name === 'quando') {
    campoOutroDia.hidden = evento.target.value !== 'outro';
    if (evento.target.value === 'outro') inputData.focus();
  }
  // Só radios e a data limpam o erro aqui. Campos de texto limpam ao digitar (evento "input"):
  // limpar ao sair do campo (blur) faria a tela pular debaixo do clique em "Enviar".
  if (evento.target.type === 'text' || evento.target.tagName === 'TEXTAREA') return;
  const campo = name === 'quando' ? 'dataEvento' : name;
  if (PASSO_DO_CAMPO[campo]) mostrarErroDoCampo(campo, '');
});

inputBairro.addEventListener('input', () => mostrarErroDoCampo('bairro', ''));
inputData.max = hojeSP();
inputData.min = somarDias(hojeSP(), -LIMITES.diasNoPassadoMax);

const contador = document.getElementById('contador-descricao');
function atualizarContador() {
  contador.textContent = `${descricao.value.length} de ${LIMITES.descricaoMax} letras`;
}
descricao.addEventListener('input', () => {
  atualizarContador();
  mostrarErroDoCampo('descricao', '');
});

listarBairros()
  .then(({ bairros }) => {
    document.getElementById('lista-bairros').replaceChildren(...bairros.map((b) => el('option', { value: b })));
  })
  .catch(() => {
    // Sugestões são só um conforto: sem elas o campo continua funcionando.
  });

// ---------- Ditado por voz (quando o navegador permite) ----------

const Reconhecimento = window.SpeechRecognition ?? window.webkitSpeechRecognition;
const botaoDitar = document.getElementById('ditar');

if (Reconhecimento) {
  botaoDitar.hidden = false;
  document.getElementById('ajuda-voz').hidden = false;
  let reconhecedor = null;

  const parar = () => {
    reconhecedor?.stop();
  };

  botaoDitar.addEventListener('click', () => {
    if (reconhecedor) {
      parar();
      return;
    }
    reconhecedor = new Reconhecimento();
    reconhecedor.lang = 'pt-BR';
    reconhecedor.interimResults = false;
    reconhecedor.continuous = true;

    reconhecedor.addEventListener('result', (evento) => {
      const frase = [...evento.results]
        .slice(evento.resultIndex)
        .map((r) => r[0].transcript.trim())
        .join(' ');
      const atual = descricao.value.trim();
      descricao.value = [atual, frase].filter(Boolean).join(' ').slice(0, LIMITES.descricaoMax);
      atualizarContador();
    });
    const terminou = () => {
      reconhecedor = null;
      botaoDitar.setAttribute('aria-pressed', 'false');
      botaoDitar.querySelector('span').textContent = 'Falar em vez de escrever';
    };
    reconhecedor.addEventListener('end', terminou);
    reconhecedor.addEventListener('error', (evento) => {
      terminou();
      if (evento.error === 'not-allowed') anunciar('Sem permissão para usar o microfone.');
    });

    try {
      reconhecedor.start();
      botaoDitar.setAttribute('aria-pressed', 'true');
      botaoDitar.querySelector('span').textContent = 'Parar de ouvir';
    } catch {
      terminou();
    }
  });
}

// ---------- Envio ----------

function mostrarSucesso(relato) {
  const caixa = document.getElementById('sucesso');
  const titulo = el('h2', { class: 't-display-l', tabindex: '-1' }, 'Pronto! Seu relato foi registrado.');

  caixa.replaceChildren(
    el('div', { class: 'sucesso__icone' }, icone('i-check')),
    titulo,
    el('p', {}, 'Obrigado por contar. Seu relato já entra na lista e nos números do painel.'),
    el(
      'ul',
      { class: 'resumo-sucesso' },
      el('li', {}, icone(CATEGORIAS[relato.categoria].icone, 'figura__icone'), el('strong', {}, CATEGORIAS[relato.categoria].nome), 'Problema'),
      el('li', {}, el('img', { src: `/img/nivel-${relato.impacto}.svg`, alt: '', width: '28', height: '28' }), el('strong', {}, IMPACTOS[relato.impacto].curto), 'Impacto'),
      el('li', {}, icone('i-pin'), el('strong', {}, relato.bairro), 'Bairro'),
      el('li', {}, icone('i-calendar'), el('strong', {}, formatarData(relato.dataEvento)), 'Dia'),
    ),
    el(
      'div',
      { class: 'caixa-perigo' },
      el('p', {}, 'Ainda há alguém em perigo? Este site não chama ninguém. Ligue para os Bombeiros.'),
      el('a', { class: 'btn btn--perigo', href: 'tel:193' }, icone('i-phone'), ' Ligar 193'),
    ),
    el(
      'div',
      { class: 'acoes' },
      el('a', { class: 'btn btn--primario btn--grande', href: '/relatos' }, 'Ver relatos'),
      el('button', { type: 'button', class: 'btn btn--secundario btn--grande', id: 'outro-relato' }, 'Registrar outro relato'),
    ),
  );

  form.hidden = true;
  caixa.hidden = false;
  titulo.focus();
  anunciar('Pronto! Seu relato foi registrado.');
  caixa.querySelector('#outro-relato').addEventListener('click', () => {
    caixa.hidden = true;
    form.hidden = false;
    reiniciar();
    irParaPasso(1, { focar: true });
  });
}

function reiniciar() {
  form.reset();
  campoOutroDia.hidden = true;
  limparErros();
  atualizarContador();
}

form.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  limparErros();

  const dados = lerDados();
  const erros = validarLocal(dados);
  if (Object.keys(erros).length > 0) {
    mostrarErros(erros);
    const primeiro = Math.min(...Object.keys(erros).map((c) => PASSO_DO_CAMPO[c]));
    irParaPasso(primeiro);
    return;
  }

  botaoEnviar.disabled = true;
  const rotulo = botaoEnviar.textContent;
  botaoEnviar.textContent = 'Enviando…';
  try {
    const { relato } = await criarRelato(dados);
    mostrarSucesso(relato);
  } catch (erro) {
    if (erro instanceof ErroApi && erro.campos) {
      mostrarErros(erro.campos);
      const primeiro = Math.min(...Object.keys(erro.campos).map((c) => PASSO_DO_CAMPO[c] ?? 1));
      irParaPasso(primeiro);
    } else {
      document.getElementById('erro-envio-texto').textContent =
        erro instanceof ErroApi ? erro.message : 'Algo deu errado. Tente de novo em instantes.';
      erroEnvio.hidden = false;
      erroEnvio.focus();
    }
  } finally {
    botaoEnviar.disabled = false;
    botaoEnviar.textContent = rotulo;
  }
});

botaoLimpar.addEventListener('click', async () => {
  const dados = lerDados();
  const preenchido = Object.values(dados).some(Boolean);
  if (preenchido) {
    const sim = await confirmar({
      titulo: 'Começar de novo?',
      texto: 'As respostas que você deu até agora serão apagadas.',
      confirmar: 'Sim, apagar',
      cancelar: 'Voltar',
    });
    if (!sim) return;
  }
  reiniciar();
  irParaPasso(1, { focar: true });
});

irParaPasso(1);

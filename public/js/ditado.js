// Ditado por voz: transforma a fala em texto dentro de um campo (Web Speech API).
// Nem todo navegador tem o recurso, e mesmo quando tem ele pode falhar (microfone bloqueado,
// sem internet, sem serviço de reconhecimento). Toda falha vira uma frase visível ao lado do
// botão: a pessoa nunca fica apertando o microfone sem saber por que nada acontece.

import { pararFala } from './falar.js';

const Reconhecimento = window.SpeechRecognition ?? window.webkitSpeechRecognition;

const ROTULO_OUVINDO = 'Ouvindo… toque para parar';

const MENSAGENS_DE_ERRO = {
  'not-allowed':
    'O microfone está bloqueado. Libere o microfone nas permissões do site (cadeado ao lado do endereço) e toque de novo.',
  'service-not-allowed': 'Este navegador não permite transformar fala em texto. Você pode escrever.',
  'audio-capture': 'Não encontrei um microfone neste aparelho. Você pode escrever.',
  network:
    'Não deu para transformar a fala em texto. Precisa de internet e funciona melhor no Google Chrome. Você pode escrever.',
  'language-not-supported': 'Este navegador não entende fala em português. Você pode escrever.',
  'no-speech': 'Não ouvi nada. Chegue mais perto do microfone e toque de novo.',
};
const ERRO_GENERICO = 'O microfone não funcionou agora. Tente de novo ou escreva.';
const SEM_ENDERECO_SEGURO = 'O microfone só funciona em endereço seguro (https). Você pode escrever.';

/**
 * Liga o botão de ditado a um campo de texto.
 * @param {object} opcoes
 * @param {HTMLButtonElement} opcoes.botao      botão que começa e para o ditado
 * @param {HTMLTextAreaElement} opcoes.campo    campo que recebe o texto
 * @param {HTMLElement} opcoes.estado           linha de estado visível (role="status")
 * @param {number} opcoes.limite                máximo de letras do campo
 * @param {() => void} [opcoes.aoMudar]         chamado quando o texto muda (ex.: atualizar contador)
 * @returns {{ disponivel: boolean, parar: () => void }}
 */
export function ligarDitado({ botao, campo, estado, limite, aoMudar = () => {} }) {
  if (!Reconhecimento) return { disponivel: false, parar() {} };

  const rotulo = botao.querySelector('[data-rotulo]');
  const rotuloParado = rotulo.textContent;
  let reconhecedor = null;
  let textoAntes = '';

  function mostrarEstado(mensagem, { erro = false } = {}) {
    estado.textContent = mensagem;
    estado.hidden = !mensagem;
    estado.toggleAttribute('data-erro', erro);
  }

  function marcarGravando(gravando) {
    botao.setAttribute('aria-pressed', String(gravando));
    rotulo.textContent = gravando ? ROTULO_OUVINDO : rotuloParado;
  }

  function parar() {
    reconhecedor?.stop();
  }

  function escrever(frase) {
    campo.value = [textoAntes, frase].filter(Boolean).join(' ').slice(0, limite);
    aoMudar();
  }

  function comecar() {
    if (!window.isSecureContext) {
      mostrarEstado(SEM_ENDERECO_SEGURO, { erro: true });
      return;
    }
    if (campo.value.length >= limite) {
      mostrarEstado('O texto já está no tamanho máximo.', { erro: true });
      return;
    }

    pararFala(); // senão o microfone escutaria a leitura em voz alta da própria página
    textoAntes = campo.value.trim();
    let houveErro = false;

    const atual = new Reconhecimento();
    reconhecedor = atual;
    atual.lang = 'pt-BR';
    atual.interimResults = true;
    // No celular, o modo contínuo repete palavras em alguns navegadores: lá, uma frase por toque.
    atual.continuous = !window.matchMedia('(pointer: coarse)').matches;

    atual.addEventListener('start', () => {
      marcarGravando(true);
      mostrarEstado('Pode falar. O texto aparece no campo.');
    });

    atual.addEventListener('result', (evento) => {
      // A lista traz tudo o que foi ouvido nesta sessão; reescrever tudo evita texto duplicado.
      const frase = [...evento.results].map((resultado) => resultado[0].transcript.trim()).join(' ');
      escrever(frase);
      if (campo.value.length >= limite) parar();
    });

    atual.addEventListener('error', (evento) => {
      if (evento.error === 'aborted') return; // a própria pessoa parou
      houveErro = true;
      mostrarEstado(MENSAGENS_DE_ERRO[evento.error] ?? ERRO_GENERICO, { erro: true });
    });

    atual.addEventListener('end', () => {
      if (reconhecedor === atual) reconhecedor = null;
      marcarGravando(false);
      if (!houveErro) mostrarEstado('');
    });

    try {
      atual.start();
    } catch {
      reconhecedor = null;
      marcarGravando(false);
      mostrarEstado(ERRO_GENERICO, { erro: true });
    }
  }

  botao.addEventListener('click', () => (reconhecedor ? parar() : comecar()));
  window.addEventListener('pagehide', parar);

  return { disponivel: true, parar };
}

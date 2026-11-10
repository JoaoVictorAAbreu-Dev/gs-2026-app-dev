// Diálogo de confirmação com <dialog>. Devolve uma Promise: true se a pessoa confirmou.
// Usa Promise.withResolvers() (ES2024) e closedby="any" (fecha com Esc ou clique fora).
import { el } from './dom.js';

function comResolvers() {
  if (typeof Promise.withResolvers === 'function') return Promise.withResolvers();
  // Navegadores mais antigos: mesma ideia, escrita à mão.
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

export function confirmar({ titulo, texto, confirmar: rotuloSim = 'Sim', cancelar: rotuloNao = 'Cancelar' }) {
  const { promise, resolve } = comResolvers();

  const botaoNao = el('button', { class: 'btn btn--secundario', value: 'cancelar', autofocus: true }, rotuloNao);
  const botaoSim = el('button', { class: 'btn btn--primario', value: 'ok' }, rotuloSim);
  const dialogo = el(
    'dialog',
    { class: 'confirmacao', closedby: 'any', 'aria-labelledby': 'confirmacao-titulo' },
    el('h2', { id: 'confirmacao-titulo' }, titulo),
    el('p', {}, texto),
    // method="dialog" fecha o diálogo e devolve o value do botão clicado.
    el('form', { method: 'dialog', class: 'confirmacao__acoes' }, botaoNao, botaoSim),
  );

  dialogo.addEventListener('close', () => {
    resolve(dialogo.returnValue === 'ok');
    dialogo.remove();
  });

  // Reforço para navegadores sem closedby: clique no fundo escuro também fecha.
  dialogo.addEventListener('click', (evento) => {
    if (evento.target !== dialogo) return;
    const caixa = dialogo.getBoundingClientRect();
    const fora =
      evento.clientX < caixa.left || evento.clientX > caixa.right || evento.clientY < caixa.top || evento.clientY > caixa.bottom;
    if (fora) dialogo.close('cancelar');
  });

  document.body.append(dialogo);
  dialogo.showModal();
  return promise;
}

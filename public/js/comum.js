// Carregado em todas as páginas: barra de acessibilidade, botões "Ouvir" e menu do celular.
import { iniciarBarraAcessibilidade } from './acessibilidade.js';
import { ligarBotoesOuvir } from './falar.js';

iniciarBarraAcessibilidade();
ligarBotoesOuvir();

const botaoMenu = document.querySelector('.menu-botao');
const menu = document.getElementById('menu-principal');

if (botaoMenu && menu) {
  const alternar = (abrir) => {
    menu.toggleAttribute('data-aberto', abrir);
    botaoMenu.setAttribute('aria-expanded', String(abrir));
  };

  botaoMenu.addEventListener('click', () => alternar(!menu.hasAttribute('data-aberto')));
  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape' && menu.hasAttribute('data-aberto')) {
      alternar(false);
      botaoMenu.focus();
    }
  });
}

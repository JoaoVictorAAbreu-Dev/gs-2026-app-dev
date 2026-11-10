// Roda antes de a página aparecer (script comum, sem "module"), para a letra grande e o alto contraste
// já valerem no primeiro desenho da tela, sem piscar.
(function () {
  var raiz = document.documentElement;
  raiz.classList.add('js');
  try {
    var escala = Number(localStorage.getItem('ts:escala'));
    if (escala >= 0.85 && escala <= 1.6) raiz.style.setProperty('--escala', String(escala));
    if (localStorage.getItem('ts:contraste') === 'alto') raiz.dataset.contraste = 'alto';
  } catch (erro) {
    // localStorage bloqueado (janela privada, por exemplo): segue com o padrão.
  }
})();

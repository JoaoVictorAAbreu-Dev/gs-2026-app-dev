/**
 * Cabeçalhos básicos de segurança, sem depender de pacote externo.
 * Não há Content-Security-Policy de scripts de propósito: o botão "Libras (VLibras)"
 * carrega, só quando a pessoa clica, o plugin do governo federal. O frame-ancestors
 * já impede que o site seja embutido em outra página.
 */
export function cabecalhosSeguranca(req, res, next) {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "frame-ancestors 'none'",
    // Microfone só neste site (ditado por voz); localização e câmera não são usadas.
    'Permissions-Policy': 'microphone=(self), geolocation=(), camera=()',
  });
  next();
}

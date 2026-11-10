// Substituto simples do ObjectId do MongoDB, para os testes não dependerem do driver.
let contador = 0;

export class ObjectId {
  constructor() {
    contador += 1;
    this.valor = contador.toString(16).padStart(24, '0');
  }

  toString() {
    return this.valor;
  }
}

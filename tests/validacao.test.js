import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizarBairro, validarRelato } from '../src/validation/relato.js';

// 09/11/2026, 18h em São Paulo
const AGORA = new Date('2026-11-09T18:00:00-03:00');

const valido = () => ({
  categoria: 'alagamento',
  bairro: 'Jardim Exemplo',
  impacto: 'moderado',
  dataEvento: '2026-11-08',
  descricao: 'Água na rua principal.',
});

describe('validarRelato', () => {
  it('aceita um relato completo e devolve os dados limpos', () => {
    const resultado = validarRelato(valido(), { agora: AGORA });
    assert.equal(resultado.valido, true);
    assert.deepEqual(resultado.dados, valido());
  });

  it('a descrição é opcional', () => {
    const { descricao, ...semDescricao } = valido();
    const resultado = validarRelato(semDescricao, { agora: AGORA });
    assert.equal(resultado.valido, true);
    assert.equal(resultado.dados.descricao, '');
  });

  it('ignora campos desconhecidos (não são gravados)', () => {
    const resultado = validarRelato({ ...valido(), ficticio: true, _id: 'x', admin: 1 }, { agora: AGORA });
    assert.equal(resultado.valido, true);
    assert.deepEqual(Object.keys(resultado.dados).sort(), ['bairro', 'categoria', 'dataEvento', 'descricao', 'impacto']);
  });

  it('recusa corpo que não é um objeto', () => {
    for (const entrada of [undefined, null, 'texto', 42, [], [valido()]]) {
      const resultado = validarRelato(entrada, { agora: AGORA });
      assert.equal(resultado.valido, false);
      assert.ok(resultado.erros._geral);
    }
  });

  it('aponta todos os campos obrigatórios que faltam, cada um com sua mensagem', () => {
    const resultado = validarRelato({}, { agora: AGORA });
    assert.equal(resultado.valido, false);
    assert.deepEqual(Object.keys(resultado.erros).sort(), ['bairro', 'categoria', 'dataEvento', 'impacto']);
    assert.equal(resultado.erros.categoria, 'Escolha uma figura para continuar.');
  });

  it('recusa categoria e impacto fora da lista', () => {
    const resultado = validarRelato({ ...valido(), categoria: 'terremoto', impacto: 'enorme' }, { agora: AGORA });
    assert.ok(resultado.erros.categoria);
    assert.ok(resultado.erros.impacto);
  });

  it('recusa tipos errados (objeto no lugar de texto, comum em tentativa de injeção)', () => {
    const resultado = validarRelato(
      { ...valido(), categoria: { $ne: '' }, bairro: ['a'], impacto: { $gt: '' }, descricao: 123 },
      { agora: AGORA },
    );
    assert.ok(resultado.erros.categoria);
    assert.ok(resultado.erros.bairro);
    assert.ok(resultado.erros.impacto);
    assert.ok(resultado.erros.descricao);
  });

  describe('bairro', () => {
    it('recusa nome curto ou longo demais', () => {
      assert.ok(validarRelato({ ...valido(), bairro: 'A' }, { agora: AGORA }).erros.bairro);
      assert.ok(validarRelato({ ...valido(), bairro: '   ' }, { agora: AGORA }).erros.bairro);
      assert.ok(validarRelato({ ...valido(), bairro: 'x'.repeat(81) }, { agora: AGORA }).erros.bairro);
    });

    it('recusa caracteres de marcação', () => {
      const resultado = validarRelato({ ...valido(), bairro: '<script>alert(1)</script>' }, { agora: AGORA });
      assert.ok(resultado.erros.bairro);
    });

    it('padroniza maiúsculas, espaços e preposições', () => {
      assert.equal(normalizarBairro('  jardim   são josé '), 'Jardim São José');
      assert.equal(normalizarBairro('VILA DE FÁTIMA'), 'Vila de Fátima');
      assert.equal(normalizarBairro('parque dos ipês ii'), 'Parque dos Ipês II');
    });

    it('grava o bairro já padronizado', () => {
      const resultado = validarRelato({ ...valido(), bairro: 'jardim  EXEMPLO' }, { agora: AGORA });
      assert.equal(resultado.dados.bairro, 'Jardim Exemplo');
    });
  });

  describe('data do evento', () => {
    it('aceita hoje', () => {
      assert.equal(validarRelato({ ...valido(), dataEvento: '2026-11-09' }, { agora: AGORA }).valido, true);
    });

    it('recusa data no futuro, usando o dia de São Paulo', () => {
      const resultado = validarRelato({ ...valido(), dataEvento: '2026-11-10' }, { agora: AGORA });
      assert.equal(resultado.erros.dataEvento, 'A data não pode ser no futuro.');
    });

    it('às 22h em São Paulo (já é dia seguinte em UTC), hoje ainda é o dia local', () => {
      const noite = new Date('2026-11-09T22:00:00-03:00');
      assert.equal(validarRelato({ ...valido(), dataEvento: '2026-11-09' }, { agora: noite }).valido, true);
      assert.ok(validarRelato({ ...valido(), dataEvento: '2026-11-10' }, { agora: noite }).erros.dataEvento);
    });

    it('recusa datas com mais de 12 meses', () => {
      assert.ok(validarRelato({ ...valido(), dataEvento: '2025-11-08' }, { agora: AGORA }).erros.dataEvento);
      assert.equal(validarRelato({ ...valido(), dataEvento: '2025-11-09' }, { agora: AGORA }).valido, true);
    });

    it('recusa formato errado e dia que não existe', () => {
      for (const dataEvento of ['09/11/2026', '2026-13-01', '2026-02-31', 'ontem', 20261109]) {
        assert.ok(validarRelato({ ...valido(), dataEvento }, { agora: AGORA }).erros.dataEvento, String(dataEvento));
      }
    });
  });

  describe('descrição', () => {
    it('aceita exatamente 500 letras e recusa 501', () => {
      assert.equal(validarRelato({ ...valido(), descricao: 'a'.repeat(500) }, { agora: AGORA }).valido, true);
      assert.ok(validarRelato({ ...valido(), descricao: 'a'.repeat(501) }, { agora: AGORA }).erros.descricao);
    });

    it('recusa e-mail e telefone (privacidade)', () => {
      for (const descricao of [
        'me chama em fulano@exemplo.com',
        'ligue (11) 91234-5678',
        'telefone 11912345678',
        'fala no 4640-1234',
      ]) {
        const resultado = validarRelato({ ...valido(), descricao }, { agora: AGORA });
        assert.ok(resultado.erros.descricao, descricao);
      }
    });

    it('não confunde datas, horas e quantidades com telefone', () => {
      for (const descricao of [
        'Começou às 18h e passou das 20h.',
        'Aconteceu em 08/11/2026 perto do número 150.',
        'Cerca de 300 casas e 2026 famílias afetadas.',
      ]) {
        const resultado = validarRelato({ ...valido(), descricao }, { agora: AGORA });
        assert.equal(resultado.valido, true, descricao);
      }
    });

    it('remove caracteres de controle', () => {
      const resultado = validarRelato({ ...valido(), descricao: 'Água\u0000 subindo\u0007.' }, { agora: AGORA });
      assert.equal(resultado.dados.descricao, 'Água subindo.');
    });
  });
});

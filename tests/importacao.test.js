import test from "node:test";
import assert from "node:assert/strict";
import {
  lerCsv,
  validarLinhas,
  valorNumerico,
} from "../src/importacaoPlanilha.js";
import { orcamentoParaApi } from "../src/funcionalidades/orcamentos/adaptadores.js";
test("CSV mantém códigos e ordem, delimitadores e valores brasileiros", () => {
  const r = validarLinhas(
    lerCsv(
      '\uFEFFCODIGO;DESC;UNIDADE DE MEDIDA;VALOR UNITARIO\r\n001;"Peça; especial";UN;"1.234,50"\r\n002;Cabo;M;12.50\r\n',
    ),
  );
  assert.deepEqual(r.erros, []);
  assert.equal(r.registros[0].codigo, "001");
  assert.equal(r.registros[0].descricao, "Peça; especial");
  assert.equal(r.registros[0].valor, 1234.5);
  assert.equal(r.registros[1].unidade, "MT");
  assert.equal(
    validarLinhas(
      lerCsv("CODIGO|DESC|UNIDADE DE MEDIDA|VALOR UNITARIO\nA|Teste|KG|0"),
    ).registros[0].valor,
    0,
  );
});
test("importação rejeita ordem de colunas, repetição, fórmula e valor inválido", () => {
  assert.throws(
    () =>
      validarLinhas([
        ["DESC", "CODIGO", "UNIDADE DE MEDIDA", "VALOR UNITARIO"],
      ]),
    /ordem/,
  );
  const r = validarLinhas([
    ["CODIGO", "DESC", "UNIDADE DE MEDIDA", "VALOR UNITARIO"],
    ["A", "Peça", "UN", "1"],
    ["a", "Outra", "UN", "2"],
    ["B", "=2+2", "UN", "3"],
    ["C", "Teste", "UN", "abc"],
  ]);
  assert.equal(r.erros.length, 3);
  assert.equal(r.registros.length, 1);
  assert.throws(() => valorNumerico("1.2345"));
  assert.throws(() => valorNumerico("-2"));
});
test("orçamento importado mantém código, preço e descrição sem substituir pelo catálogo", () => {
  const r = orcamentoParaApi(
    {
      cliente: "C",
      itens: [
        {
          importado: true,
          codigo: "001",
          descricao: "Peça especial",
          quantidade: 1,
          unidade: "M²",
          valor: 12.5,
        },
      ],
    },
    [{ id: "C" }],
    [{ id: "I", nome: "Peça especial", tipoApi: "PECA" }],
  );
  assert.equal(r.itens[0].itemCatalogoId, null);
  assert.equal(r.itens[0].descricao, "001 - Peça especial");
  assert.equal(r.itens[0].valorUnitario, 12.5);
  assert.equal(r.itens[0].unidadeMedida, "METRO_QUADRADO");
});

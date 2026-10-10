import test from "node:test";
import assert from "node:assert/strict";
import { formatarDocumento, validarDocumento } from "../src/documento.js";
import { formatarTelefone, validarTelefone } from "../src/telefone.js";

test("máscara e dígitos verificadores de CPF e CNPJ", () => {
  assert.equal(formatarDocumento("52998224725", "PF"), "529.982.247-25");
  assert.equal(formatarDocumento("04252011000110", "PJ"), "04.252.011/0001-10");
  assert.equal(formatarDocumento("5299822472599", "PF"), "529.982.247-25");
  assert.equal(validarDocumento("529.982.247-25", "PF"), true);
  assert.equal(validarDocumento("04.252.011/0001-10", "PJ"), true);
  assert.equal(validarDocumento("529.982.247-26", "PF"), false);
  assert.equal(validarDocumento("00.000.000/0000-00", "PJ"), false);
  assert.equal(validarDocumento("529.982.247-25", "PJ"), false);
});

test("telefone aceita formatos nacional e +55 com DDD", () => {
  assert.equal(formatarTelefone("41999999999"), "(41) 99999-9999");
  assert.equal(formatarTelefone("+5541999999999"), "+55 (41) 99999-9999");
  assert.equal(formatarTelefone("4133334444"), "(41) 3333-4444");
  assert.equal(validarTelefone("+55 (41) 99999-9999"), true);
  assert.equal(validarTelefone("(41) 3333-4444"), true);
  assert.equal(validarTelefone("(41) 1234"), false);
  assert.equal(validarTelefone("+44 (41) 99999-9999"), false);
  assert.equal(validarTelefone("419999999999"), false);
});

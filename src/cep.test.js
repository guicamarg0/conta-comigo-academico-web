import test from "node:test";
import assert from "node:assert/strict";
import { consultarCep, aplicarEnderecoCep, formatarCep } from "./cep.js";
const resposta = {
  cep: "01001-000",
  logradouro: "Praça da Sé",
  bairro: "Sé",
  localidade: "São Paulo",
  uf: "SP",
  complemento: "lado ímpar",
};
test("consulta pública envia apenas CEP e mapeia endereço sem complemento genérico", async () => {
  const endereco = await consultarCep("01001-000", {
    buscar: async (url, opcoes) => {
      assert.equal(url, "https://viacep.com.br/ws/01001000/json/");
      assert.equal(opcoes.credentials, "omit");
      assert.equal(opcoes.headers, undefined);
      return { ok: true, json: async () => resposta };
    },
  });
  assert.deepEqual(endereco, {
    logradouro: "Praça da Sé",
    bairro: "Sé",
    cidade: "São Paulo",
    estado: "SP",
  });
  assert.equal(formatarCep("01001000"), "01001-000");
});
test("CEP incompleto não consulta; inexistente e falha permitem preenchimento manual", async () => {
  await assert.rejects(
    consultarCep("123", { buscar: () => assert.fail("Não consultar") }),
    /8 dígitos/,
  );
  await assert.rejects(
    consultarCep("99999999", {
      buscar: async () => ({ ok: true, json: async () => ({ erro: true }) }),
    }),
    /não encontrado/,
  );
  await assert.rejects(
    consultarCep("01001000", {
      buscar: async () => {
        throw new TypeError("network");
      },
    }),
    /manualmente/,
  );
});
test("resposta antiga não altera novo CEP e preserva edição manual, número e complemento", () => {
  const original = {
    cep: "01001000",
    logradouro: "",
    bairro: "",
    cidade: "",
    estado: "",
    numero: "123",
    complemento: "Sala 1",
  };
  const atual = {
    ...original,
    logradouro: "Endereço digitado enquanto consulta",
  };
  const endereco = {
    logradouro: "Praça da Sé",
    bairro: "Sé",
    cidade: "São Paulo",
    estado: "SP",
  };
  const salvo = aplicarEnderecoCep(atual, original, endereco, "01001000");
  assert.equal(salvo.logradouro, atual.logradouro);
  assert.equal(salvo.bairro, "Sé");
  assert.equal(salvo.numero, "123");
  assert.equal(salvo.complemento, "Sala 1");
  const outro = { ...atual, cep: "80010000" };
  assert.equal(
    aplicarEnderecoCep(outro, original, endereco, "01001000"),
    outro,
  );
});
test("CEP genérico completa município e UF sem apagar rua já informada", () => {
  const original = { cep: "01001000", logradouro: "Rua manual", numero: "1" };
  assert.equal(
    aplicarEnderecoCep(
      original,
      original,
      { logradouro: "", bairro: "", cidade: "São Paulo", estado: "SP" },
      "01001000",
    ).logradouro,
    "Rua manual",
  );
});

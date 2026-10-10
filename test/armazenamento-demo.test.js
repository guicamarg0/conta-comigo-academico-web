import test from "node:test";
import assert from "node:assert/strict";
import {
  lerDemo,
  gravarDemo,
  limparDemo,
  PREFIXO_DEMO,
} from "../src/demo/armazenamento.js";

function armazenamento() {
  const valores = new Map();
  return {
    get length() {
      return valores.size;
    },
    key: (indice) => [...valores.keys()][indice] ?? null,
    getItem: (chave) => valores.get(chave) ?? null,
    setItem: (chave, valor) => valores.set(chave, valor),
    removeItem: (chave) => valores.delete(chave),
  };
}

test("restaurar demo remove seus cadastros e progresso preservando a sessão real", () => {
  const local = armazenamento();
  local.setItem("ederflexo.token", "sessao-real");
  local.setItem("configuracao.api", "configuracao-real");
  gravarDemo(local, "contratos", [{ id: "CT-1" }]);
  gravarDemo(local, "unidade.clientes", [{ id: "cliente" }]);
  gravarDemo(local, "onboarding", { concluido: true });
  limparDemo(local, ["contratos"]);
  assert.equal(local.length, 2);
  assert.equal(local.getItem("ederflexo.token"), "sessao-real");
  assert.equal(local.getItem("configuracao.api"), "configuracao-real");
});

test("dados inválidos recuperam uma cópia da base sem alterar os exemplos", () => {
  const local = armazenamento();
  const base = [{ id: "CT-1" }];
  for (const valor of ["{", "null", "{}"]) {
    local.setItem(PREFIXO_DEMO + "contratos", valor);
    const recuperado = lerDemo(local, "contratos", base);
    assert.deepEqual(recuperado, base);
    recuperado[0].id = "alterado";
    assert.equal(base[0].id, "CT-1");
  }
});

test("demo persiste apenas no seu namespace", () => {
  const local = armazenamento();
  local.setItem("contratos", JSON.stringify([{ id: "legado" }]));
  gravarDemo(local, "contratos", [{ id: "CT-2" }]);
  assert.deepEqual(lerDemo(local, "contratos", []), [{ id: "CT-2" }]);
  assert.equal(local.getItem("contratos"), '[{"id":"legado"}]');
});

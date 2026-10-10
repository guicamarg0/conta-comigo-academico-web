import test from "node:test";
import assert from "node:assert/strict";
import { resumoOnboarding, combinarEtapas, etapasDemo } from "./onboarding.js";
test("retoma a primeira etapa pendente mesmo com conclusão fora da ordem", () => {
  const r = resumoOnboarding([true, false, true, false, true, true]);
  assert.equal(r.atual, 1);
  assert.equal(r.quantidade, 4);
  assert.equal(r.percentual, 50);
});
test("conclusão não reabre etapas por inativação posterior", () => {
  const etapas = combinarEtapas(Array(8).fill(true), Array(8).fill(false));
  assert.equal(resumoOnboarding(etapas).completo, true);
  assert.equal(resumoOnboarding(etapas).atual, -1);
});
test("rascunho de orçamento conta; modelo exige publicação e cliente exige item", () => {
  const d = {
    modelosContrato: [{ status: "RASCUNHO" }],
    clientes: [{}],
    pecas: [],
    orcamentos: [{ status: "Rascunho" }],
    contratos: [],
    servicos: [],
  };
  const etapas = etapasDemo(d, "unidade", (_, base) => base);
  assert.equal(etapas[3], false);
  assert.equal(etapas[4], false);
  assert.equal(etapas[5], true);
});

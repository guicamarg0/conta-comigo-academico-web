import test from "node:test";
import assert from "node:assert/strict";
import { corDoServico, corDosServicosDoDia } from "./coresAgenda.js";
import { ocupaDia } from "./periodoServico.js";

test("serviço conserva a cor no período, na virada do mês e após edição", () => {
  const servico = {
    id: "servico-1",
    titulo: "Instalação",
    dataInicio: "2026-09-29",
    dataFim: "2026-10-02",
  };
  for (const data of ["2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"]) {
    assert.ok(ocupaDia(servico, data));
    assert.deepEqual(corDosServicosDoDia([servico]), corDoServico(servico));
  }
  assert.deepEqual(
    corDoServico({
      ...servico,
      titulo: "Instalação revisada",
      dataFim: "2026-10-05",
    }),
    corDoServico(servico),
  );
});

test("sobreposição não atribui a cor de um serviço aos outros nem depende da ordem", () => {
  const a = { id: "servico-1" },
    b = { id: "servico-2" };
  assert.notDeepEqual(corDoServico(a), corDoServico(b));
  assert.deepEqual(corDosServicosDoDia([a, b]), corDosServicosDoDia([b, a]));
  assert.notDeepEqual(corDosServicosDoDia([a, b]), corDoServico(a));
  assert.equal(corDosServicosDoDia([]), undefined);
});

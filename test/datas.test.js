import test from "node:test";
import assert from "node:assert/strict";
import {
  diasDoCalendario,
  lerData,
  limitarData,
  moverData,
  moverMes,
  dataIso,
} from "../src/datas.js";

test("calendário inicia na segunda e inclui fevereiro bissexto sem mudar a data", () => {
  const dias = diasDoCalendario("2024-02");
  assert.equal(dias.length, 42);
  assert.equal(dias[0], "2024-01-29");
  assert.ok(dias.includes("2024-02-29"));
  assert.equal(dataIso(lerData("2024-02-29")), "2024-02-29");
  assert.equal(lerData("2023-02-29"), null);
});
test("navegação respeita fim do mês, virada do ano e limites", () => {
  assert.equal(moverMes("2024-01-31", 1), "2024-02-29");
  assert.equal(moverMes("2023-01-31", 1), "2023-02-28");
  assert.equal(moverData("2026-12-31", 1), "2027-01-01");
  assert.equal(
    limitarData("2026-09-30", "2026-10-01", "2026-10-31"),
    "2026-10-01",
  );
  assert.equal(
    limitarData("2026-11-01", "2026-10-01", "2026-10-31"),
    "2026-10-31",
  );
});

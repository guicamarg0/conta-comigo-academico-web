import test from "node:test";
import assert from "node:assert/strict";
import { conviteServico } from "../src/calendario.js";
test("convite tem dia inteiro e término exclusivo na virada do mês", () => {
  const texto = conviteServico(
    {
      id: "abc",
      codigo: "SV-1",
      titulo: "Serviço",
      dataProgramada: "2026-12-31",
    },
    new Date("2026-10-03T12:00:00Z"),
  );
  assert.match(texto, /DTSTART;VALUE=DATE:20261231/);
  assert.match(texto, /DTEND;VALUE=DATE:20270101/);
  assert.doesNotMatch(texto, /DTSTART:[^\r]*T/);
  assert.match(texto, /METHOD:PUBLISH/);
});
test("convite escapa texto e dobra linhas sem separar caracteres unicode", () => {
  const texto = conviteServico({
    id: "abc",
    titulo: "ação".repeat(100) + ", x; y\nBEGIN:VALARM",
    dataProgramada: "2026-10-03",
  });
  for (const linha of texto.split("\r\n"))
    assert.ok(new TextEncoder().encode(linha).length <= 75);
  assert.ok(
    texto.replaceAll("\r\n ", "").includes("\\, x\\; y\\nBEGIN:VALARM"),
  );
  assert.throws(() => conviteServico({ titulo: "Sem dia" }), /Agende/);
});

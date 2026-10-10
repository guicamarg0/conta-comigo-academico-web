import test from "node:test";
import assert from "node:assert/strict";
import { nomePdf } from "../src/documentos.js";
test("nomes PDF curtos preservam prefixo e cliente sem caminhos", () => {
  assert.equal(
    nomePdf("ORC-2026-000052", "Metal Filme LTDA"),
    "ORC-52_Metal-Filme-LTDA.pdf",
  );
  assert.equal(nomePdf("CT-12", "João / Silva"), "CT-12_Joao-Silva.pdf");
  assert.equal(nomePdf("ORC-1", null), "ORC-1_Cliente.pdf");
});

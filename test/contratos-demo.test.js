import test from "node:test";
import assert from "node:assert/strict";
import {
  versionarContrato,
  alterarSituacaoContrato,
  validarOrigemContrato,
} from "../src/demo/contratos.js";

test("cadastro e situação são independentes, edição inativa conserva situação e histórico", () => {
  let c = versionarContrato(
    { id: "CT-1", status: "Aguardando assinatura", ativo: true },
    { rascunho: "Inicial" },
  );
  assert.equal(c.numeroVersao, 1);
  assert.equal(versionarContrato(c, { rascunho: "Inicial" }), c);
  assert.throws(() => alterarSituacaoContrato(c, "encerrar"));
  c = alterarSituacaoContrato(c, "vigente");
  c = alterarSituacaoContrato(c, "inativar");
  c = versionarContrato(c, { rascunho: "Editado" });
  assert.equal(c.status, "Vigente");
  assert.equal(c.ativo, false);
  assert.equal(c.numeroVersao, 2);
  c = versionarContrato(
    c,
    { rascunho: c.versoes[1].conteudo },
    undefined,
    true,
  );
  assert.equal(c.numeroVersao, 3);
  assert.equal(c.rascunho, "Inicial");
  c = alterarSituacaoContrato(c, "encerrar");
  assert.throws(() => versionarContrato(c, { rascunho: "Outro" }));
  assert.throws(() => alterarSituacaoContrato(c, "vigente"));
  c = alterarSituacaoContrato(c, "reativar");
  assert.equal(c.status, "Encerrado");
  assert.equal(c.ativo, true);
  assert.equal(c.atividades.length, 7);
});

test("contrato exige orçamento aprovado e vínculo único inclusive inativados", () => {
  assert.throws(() =>
    versionarContrato({ origem: 1, status: "Vigente" }, { origem: 2 }),
  );
  const existentes = [{ id: "CT-1", origem: 1, ativo: false }];
  assert.throws(() =>
    validarOrigemContrato({ id: 2, status: "Emitido" }, existentes),
  );
  assert.throws(() =>
    validarOrigemContrato({ id: 1, status: "Aprovado" }, existentes),
  );
  assert.doesNotThrow(() =>
    validarOrigemContrato({ id: 1, status: "Aprovado" }, existentes, "CT-1"),
  );
  assert.doesNotThrow(() =>
    validarOrigemContrato({ id: 2, status: "Aprovado" }, existentes),
  );
});

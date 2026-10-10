import test from "node:test";
import assert from "node:assert/strict";
import {
  AtivacaoModeloPendente,
  conteudoModeloVazio,
  mesmoModeloContrato,
  salvarModeloConectado,
} from "../src/modelosContrato.js";

const inicial = {
  nome: "Prestação de serviços",
  descricao: "",
  conteudo: "<p>Serviço acordado.</p>",
};

test("novo modelo é salvo e fica pronto para uso", async () => {
  const chamadas = [];
  const resultado = await salvarModeloConectado({
    modelo: inicial,
    persistido: null,
    servico: {
      criarModeloContrato: async (dados) => {
        chamadas.push("criar");
        return {
          ...dados,
          id: "modelo-1",
          status: "RASCUNHO",
          numeroVersao: 1,
        };
      },
      publicarModeloContrato: async (id) => {
        chamadas.push(`ativar:${id}`);
        return { ...inicial, id, status: "PUBLICADO", numeroVersao: 1 };
      },
    },
    onPersistido: (modelo) => chamadas.push(`persistido:${modelo.status}`),
  });
  assert.deepEqual(chamadas, [
    "criar",
    "persistido:RASCUNHO",
    "ativar:modelo-1",
    "persistido:PUBLICADO",
  ]);
  assert.equal(resultado.modelo.status, "PUBLICADO");
});

test("repetir Salvar após falha de ativação não cria outro modelo nem versão", async () => {
  let persistido;
  let criacoes = 0;
  let ativacoes = 0;
  const servico = {
    criarModeloContrato: async (dados) => {
      criacoes++;
      return { ...dados, id: "modelo-2", status: "RASCUNHO", numeroVersao: 1 };
    },
    atualizarModeloContrato: async () =>
      assert.fail("conteúdo já gravado não deve ser atualizado"),
    publicarModeloContrato: async (id) => {
      if (++ativacoes === 1) throw new Error("Servidor indisponível");
      return { ...persistido, id, status: "PUBLICADO" };
    },
  };
  const salvar = () =>
    salvarModeloConectado({
      modelo: inicial,
      persistido,
      servico,
      onPersistido: (valor) => {
        persistido = valor;
      },
    });
  await assert.rejects(salvar(), AtivacaoModeloPendente);
  assert.equal(persistido.id, "modelo-2");
  const resultado = await salvar();
  assert.equal(criacoes, 1);
  assert.equal(ativacoes, 2);
  assert.equal(resultado.modelo.numeroVersao, 1);
  assert.equal(resultado.modelo.status, "PUBLICADO");
});

test("salvar um modelo ativo sem mudanças não grava nem ativa novamente", async () => {
  const persistido = {
    ...inicial,
    id: "modelo-3",
    status: "PUBLICADO",
    numeroVersao: 8,
  };
  const resultado = await salvarModeloConectado({
    modelo: { ...persistido, nome: ` ${persistido.nome} ` },
    persistido,
    servico: {},
    onPersistido: () => assert.fail("não deve gravar"),
  });
  assert.equal(resultado.alterado, false);
  assert.equal(resultado.ativado, false);
  assert.equal(resultado.modelo.numeroVersao, 8);
});

test("editar conteúdo de um modelo inativo conserva a inativação", async () => {
  const persistido = {
    ...inicial,
    id: "modelo-4",
    status: "ARQUIVADO",
    numeroVersao: 2,
  };
  let salvo;
  const resultado = await salvarModeloConectado({
    modelo: { ...persistido, conteudo: "<p>Novo conteúdo.</p>" },
    persistido,
    servico: {
      atualizarModeloContrato: async (id, dados) => ({
        ...persistido,
        ...dados,
        id,
        numeroVersao: 3,
      }),
      publicarModeloContrato: async () =>
        assert.fail("não deve reativar um modelo inativo"),
    },
    onPersistido: (valor) => {
      salvo = valor;
    },
  });
  assert.equal(salvo.status, "ARQUIVADO");
  assert.equal(resultado.modelo.numeroVersao, 3);
});

test("validação rejeita editor visual vazio e comparação normaliza espaços", () => {
  assert.equal(
    conteudoModeloVazio("<p><br></p><p>&nbsp;&#160;&#xA0;</p>"),
    true,
  );
  assert.equal(conteudoModeloVazio("<p>@RazaoSocialCliente</p>"), false);
  assert.equal(
    mesmoModeloContrato(
      { ...inicial, descricao: "   " },
      { ...inicial, id: "modelo" },
    ),
    true,
  );
});

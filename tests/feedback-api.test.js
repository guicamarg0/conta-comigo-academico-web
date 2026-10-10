import test from "node:test";
import assert from "node:assert/strict";
import { requisicao, api, ErroApi } from "../src/api.js";
import { gerencia, permiteRota } from "../src/permissoes.js";
import { mensagemValidacao } from "../src/validacao.js";

async function ambiente(fn) {
  const chaves = ["fetch", "sessionStorage", "window"],
    anteriores = Object.fromEntries(
      chaves.map((c) => [c, Object.getOwnPropertyDescriptor(globalThis, c)]),
    );
  const sessao = new Map([
    ["ederflexo.token", "token-do-teste"],
    ["ederflexo.unidadeId", "unidade-do-teste"],
  ]);
  const eventos = [];
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: {
      getItem: (c) => sessao.get(c),
      removeItem: (c) => sessao.delete(c),
    },
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { dispatchEvent: (e) => eventos.push(e.type) },
  });
  try {
    await fn({ sessao, eventos });
  } finally {
    for (const [chave, d] of Object.entries(anteriores)) {
      if (d) Object.defineProperty(globalThis, chave, d);
      else delete globalThis[chave];
    }
  }
}
test("convite público não transmite token nem unidade de outra sessão", () =>
  ambiente(async () => {
    let recebido;
    globalThis.fetch = async (url, opcoes) => {
      recebido = { url, opcoes };
      return new Response(JSON.stringify({ perfil: "CONSULTA" }), {
        status: 200,
      });
    };
    await api.consultarConvite("codigo-do-teste");
    assert.equal(recebido.opcoes.headers.Authorization, undefined);
    assert.equal(recebido.opcoes.headers["X-Unidade-Id"], undefined);
    assert.deepEqual(JSON.parse(recebido.opcoes.body), {
      codigo: "codigo-do-teste",
    });
  }));
test("erros de validação conservam campos e status para orientar a correção", () =>
  ambiente(async () => {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          detail: "Confira os campos.",
          campos: { email: "E-mail inválido" },
          code: "VALIDACAO",
        }),
        { status: 400 },
      );
    await assert.rejects(
      requisicao("/teste"),
      (e) =>
        e instanceof ErroApi &&
        e.status === 400 &&
        e.campos.email === "E-mail inválido" &&
        e.codigo === "VALIDACAO",
    );
  }));
test("falha de gravação não repete automaticamente uma operação ambígua", () =>
  ambiente(async () => {
    let chamadas = 0;
    globalThis.fetch = async () => {
      chamadas++;
      throw new TypeError("Failed to fetch");
    };
    await assert.rejects(
      requisicao("/teste", { method: "POST", body: { nome: "Teste" } }),
      /Confira se a operação foi concluída/,
    );
    assert.equal(chamadas, 1);
  }));
test("sessão expirada é removida e informa o aplicativo; permissão negada conserva sessão", () =>
  ambiente(async ({ sessao, eventos }) => {
    globalThis.fetch = async () => new Response("{}", { status: 403 });
    await assert.rejects(requisicao("/teste"), /não tem permissão/);
    assert.ok(sessao.has("ederflexo.token"));
    assert.equal(eventos.length, 0);
    globalThis.fetch = async () => new Response("{}", { status: 401 });
    await assert.rejects(requisicao("/teste"), /Entre novamente/);
    assert.equal(sessao.size, 0);
    assert.deepEqual(eventos, ["ederflexo:autenticacao-expirada"]);
  }));
test("falhas internas usam mensagem amigável sem mostrar diagnóstico do servidor", () =>
  ambiente(async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ detail: "SQL stack trace sensível" }), {
        status: 500,
      });
    await assert.rejects(
      requisicao("/teste"),
      (e) =>
        e.status === 500 &&
        !e.message.includes("SQL") &&
        e.message.includes("indisponível"),
    );
  }));
test("rotas e ações de gestão seguem o perfil e preservam consultas", () => {
  for (const perfil of ["OPERADOR", "CONSULTA"]) {
    assert.equal(gerencia("api", { perfil }), false);
    assert.equal(permiteRota("/cadastros/usuarios", "api", { perfil }), false);
    assert.equal(permiteRota("/contratos/novo", "api", { perfil }), perfil === "OPERADOR");
    assert.equal(permiteRota("/contratos", "api", { perfil }), true);
  }
  for (const perfil of ["ADMIN", "GESTOR"])
    assert.equal(
      permiteRota("/cadastros/modelos-contrato/editar", "api", { perfil }),
      true,
    );
  assert.equal(permiteRota("/cadastros/usuarios", "demo", {}), true);
});
test("validação explica formatos, limites e campos vazios em português", () => {
  assert.equal(
    mensagemValidacao({ validity: { valueMissing: true } }),
    "Preencha este campo.",
  );
  assert.equal(
    mensagemValidacao({ validity: { typeMismatch: true }, type: "email" }),
    "Informe um e-mail válido.",
  );
  assert.equal(
    mensagemValidacao({ validity: { rangeUnderflow: true }, min: "0.01" }),
    "Informe um valor igual ou maior que 0.01.",
  );
});

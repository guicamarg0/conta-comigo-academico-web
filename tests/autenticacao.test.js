import test from "node:test";
import assert from "node:assert/strict";
import { api, requisicao, guardarToken } from "../src/api.js";
import { ouvirSaidaOutraAba } from "../src/sessaoNavegador.js";
import {
  prepararEntrada,
  retornoConvite,
  usuarioAutenticado,
} from "../src/autenticacao.js";

async function ambiente(executar) {
  const chaves = ["fetch", "sessionStorage", "localStorage", "window"];
  const anteriores = Object.fromEntries(
    chaves.map((chave) => [
      chave,
      Object.getOwnPropertyDescriptor(globalThis, chave),
    ]),
  );
  const valores = new Map();
  const eventos = [];
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: {
      getItem: (chave) => valores.get(chave) || null,
      setItem: (chave, valor) => valores.set(chave, valor),
      removeItem: (chave) => valores.delete(chave),
    },
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get: () => {
      throw new Error("A autenticação não deve acessar localStorage.");
    },
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { dispatchEvent: (evento) => eventos.push(evento.type) },
  });
  try {
    await executar({ valores, eventos });
  } finally {
    for (const [chave, anterior] of Object.entries(anteriores)) {
      if (anterior) Object.defineProperty(globalThis, chave, anterior);
      else delete globalThis[chave];
    }
  }
}
const json = (dados, status = 200) =>
  new Response(JSON.stringify(dados), { status });

test("login solicita persistência por cookie sem transmitir uma sessão anterior", () =>
  ambiente(async ({ valores }) => {
    valores.set("ederflexo.token", "acesso-antigo");
    valores.set("ederflexo.unidadeId", "unidade-antiga");
    let enviada;
    globalThis.fetch = async (url, opcoes) => {
      enviada = { url, opcoes };
      return json({ tokenAcesso: "acesso-novo" });
    };
    await api.login({
      email: "pessoa@exemplo.test",
      senha: "senha-ficticia",
      manterConectado: true,
    });
    assert.ok(enviada.url.endsWith("/autenticacao/login"));
    assert.equal(enviada.opcoes.credentials, "include");
    assert.equal(enviada.opcoes.headers.Authorization, undefined);
    assert.equal(enviada.opcoes.headers["X-Unidade-Id"], undefined);
    assert.equal(JSON.parse(enviada.opcoes.body).manterConectado, true);
  }));

test("novo acesso restaura por cookie e valida o usuário na API", () =>
  ambiente(async ({ valores }) => {
    const chamadas = [];
    globalThis.fetch = async (url, opcoes) => {
      chamadas.push({ url, opcoes });
      return url.endsWith("/renovar")
        ? json({ tokenAcesso: "acesso-renovado" })
        : json({ nome: "Pessoa", unidades: [] });
    };
    const me = await api.restaurarSessao();
    assert.equal(me.nome, "Pessoa");
    assert.equal(valores.get("ederflexo.token"), "acesso-renovado");
    assert.equal(chamadas.length, 2);
    assert.equal(chamadas[0].opcoes.method, "POST");
    assert.equal(chamadas[0].opcoes.credentials, "include");
    assert.equal(chamadas[0].opcoes.headers, undefined);
    assert.equal(
      chamadas[1].opcoes.headers.Authorization,
      "Bearer acesso-renovado",
    );
    assert.equal(chamadas[1].opcoes.headers["X-Unidade-Id"], undefined);
  }));

test("consultas simultâneas compartilham uma renovação e repetem apenas o 401", () =>
  ambiente(async ({ valores }) => {
    valores.set("ederflexo.token", "acesso-expirado");
    valores.set("ederflexo.unidadeId", "unidade-autorizada");
    let renovacoes = 0,
      tentativas = 0;
    globalThis.fetch = async (url, opcoes) => {
      if (url.endsWith("/renovar")) {
        renovacoes++;
        await new Promise((resolver) => setTimeout(resolver, 5));
        return json({ tokenAcesso: "acesso-valido" });
      }
      tentativas++;
      assert.equal(opcoes.headers["X-Unidade-Id"], "unidade-autorizada");
      return opcoes.headers.Authorization === "Bearer acesso-expirado"
        ? json({}, 401)
        : json({ sucesso: true });
    };
    const respostas = await Promise.all([requisicao("/a"), requisicao("/b")]);
    assert.deepEqual(respostas, [{ sucesso: true }, { sucesso: true }]);
    assert.equal(renovacoes, 1);
    assert.equal(tentativas, 4);
  }));

test("sessão revogada encerra o contexto após uma renovação rejeitada", () =>
  ambiente(async ({ valores, eventos }) => {
    valores.set("ederflexo.token", "acesso-expirado");
    valores.set("ederflexo.unidadeId", "unidade");
    let chamadas = 0;
    globalThis.fetch = async () => {
      chamadas++;
      return json({}, 401);
    };
    await assert.rejects(requisicao("/clientes"), /Entre novamente/);
    assert.equal(chamadas, 2);
    assert.equal(valores.size, 0);
    assert.deepEqual(eventos, ["ederflexo:autenticacao-expirada"]);
  }));

test("falha de rede na renovação conserva sessão e não repete a gravação", () =>
  ambiente(async ({ valores, eventos }) => {
    valores.set("ederflexo.token", "acesso-expirado");
    let gravacoes = 0;
    globalThis.fetch = async (url) => {
      if (url.endsWith("/renovar")) throw new TypeError("Rede indisponível");
      gravacoes++;
      return json({}, 401);
    };
    await assert.rejects(
      requisicao("/orcamentos", { method: "POST", body: { nome: "Exemplo" } }),
      /Não foi possível conectar/,
    );
    assert.equal(gravacoes, 1);
    assert.equal(valores.get("ederflexo.token"), "acesso-expirado");
    assert.deepEqual(eventos, []);
  }));

test("Sair revoga o cookie pela API antes de apagar o contexto local", () =>
  ambiente(async ({ valores }) => {
    valores.set("ederflexo.token", "acesso-valido");
    valores.set("ederflexo.unidadeId", "unidade");
    globalThis.fetch = async (url, opcoes) => {
      assert.ok(url.endsWith("/autenticacao/sair"));
      assert.equal(opcoes.headers.Authorization, undefined);
      assert.equal(opcoes.headers["X-Unidade-Id"], undefined);
      assert.equal(opcoes.credentials, "include");
      assert.ok(valores.has("ederflexo.token"));
      return new Response(null, { status: 204 });
    };
    await api.sair();
    assert.equal(valores.size, 0);
  }));

test("falha ao revogar não apresenta um logout concluído", () =>
  ambiente(async ({ valores }) => {
    valores.set("ederflexo.token", "acesso-valido");
    globalThis.fetch = async () => json({}, 503);
    await assert.rejects(api.sair(), /indisponível/);
    assert.equal(valores.get("ederflexo.token"), "acesso-valido");
  }));

test("uma unidade autorizada entra diretamente; várias e nenhum vínculo abrem seleção", async () => {
  const selecionados = [];
  const selecionar = async (id) => {
    selecionados.push(id);
    return { id, nome: "Oficina Exemplo", perfil: "GESTOR" };
  };
  const unico = await prepararEntrada(
    { unidades: [{ id: "unidade-1" }] },
    selecionar,
  );
  assert.equal(unico.destino, "/");
  assert.deepEqual(selecionados, ["unidade-1"]);
  const varios = await prepararEntrada(
    { unidades: [{ id: "a" }, { id: "b" }] },
    selecionar,
  );
  const vazio = await prepararEntrada({ unidades: [] }, selecionar);
  assert.equal(varios.destino, "/selecionar-unidade");
  assert.equal(vazio.destino, "/selecionar-unidade");
  assert.equal(selecionados.length, 1);
});

test("convite e administração geral têm prioridade sem selecionar unidade arbitrária", async () => {
  const selecionar = () => {
    throw new Error("Não deve selecionar unidade.");
  };
  const me = { administradorGeral: true, unidades: [{ id: "a" }] };
  assert.equal(
    (await prepararEntrada(me, selecionar, { retorno: "/convite?codigo=abc" }))
      .destino,
    "/convite?codigo=abc",
  );
  assert.equal(
    (await prepararEntrada(me, selecionar)).destino,
    "/administracao-geral",
  );
  assert.equal(retornoConvite("//outro.example/convite?codigo=abc"), null);
  assert.equal(retornoConvite("/convite?codigo="), null);
  assert.equal(retornoConvite("/contratos"), null);
});

test("restauração usa unidade anterior somente quando continua autorizada", async () => {
  const selecionados = [];
  const selecionar = async (id) => {
    selecionados.push(id);
    return { id };
  };
  const me = { unidades: [{ id: "a" }, { id: "b" }] };
  assert.equal(
    (await prepararEntrada(me, selecionar, { unidadeAnterior: "b" })).unidade
      .id,
    "b",
  );
  assert.equal(
    (await prepararEntrada(me, selecionar, { unidadeAnterior: "removida" }))
      .destino,
    "/selecionar-unidade",
  );
  assert.deepEqual(selecionados, ["b"]);
});

test("falha de seleção não retorna um contexto parcial de outra unidade", async () => {
  await assert.rejects(
    prepararEntrada({ unidades: [{ id: "a" }] }, async () => {
      throw new Error("Acesso revogado");
    }),
    /Acesso revogado/,
  );
  assert.equal(
    usuarioAutenticado(
      {
        nome: "Pessoa",
        email: "pessoa@exemplo.test",
        unidades: [{ perfil: "ADMIN" }],
      },
      null,
    ).perfil,
    "CONSULTA",
  );
});

test("Sair aguarda uma renovação pendente e a resposta atrasada não repõe o acesso", () =>
  ambiente(async ({ valores }) => {
    valores.set("ederflexo.token", "acesso-antigo");
    const chamadas = [];
    let iniciou, liberar;
    const inicio = new Promise((resolver) => {
      iniciou = resolver;
    });
    const resposta = new Promise((resolver) => {
      liberar = resolver;
    });
    globalThis.fetch = async (url) => {
      chamadas.push(url);
      if (url.endsWith("/renovar")) {
        iniciou();
        return resposta;
      }
      return new Response(null, { status: 204 });
    };
    const renovacao = api.renovarSessao();
    const rejeicao = assert.rejects(
      renovacao,
      (e) => e.codigo === "SESSAO_ALTERADA",
    );
    await inicio;
    const saida = api.sair();
    assert.equal(chamadas.length, 1);
    liberar(json({ tokenAcesso: "resposta-obsoleta" }));
    await Promise.all([saida, rejeicao]);
    assert.deepEqual(
      chamadas.map((url) => url.split("/").pop()),
      ["renovar", "sair"],
    );
    assert.equal(valores.size, 0);
  }));

test("um novo login invalida a resposta de renovação de outro acesso", () =>
  ambiente(async ({ valores }) => {
    valores.set("ederflexo.token", "acesso-antigo");
    let iniciou, liberar;
    const inicio = new Promise((resolver) => {
      iniciou = resolver;
    });
    const resposta = new Promise((resolver) => {
      liberar = resolver;
    });
    globalThis.fetch = async (url) => {
      if (url.endsWith("/renovar")) {
        iniciou();
        return resposta;
      }
      return json({ tokenAcesso: "acesso-do-login-novo" });
    };
    const renovacao = api.renovarSessao();
    const rejeicao = assert.rejects(
      renovacao,
      (e) => e.codigo === "SESSAO_ALTERADA",
    );
    await inicio;
    const login = api.login({
      email: "pessoa@exemplo.test",
      senha: "senha-ficticia",
    });
    liberar(json({ tokenAcesso: "resposta-obsoleta" }));
    const token = await login;
    guardarToken(token.tokenAcesso);
    await rejeicao;
    assert.equal(valores.get("ederflexo.token"), "acesso-do-login-novo");
  }));

test("resposta protegida recebida depois do logout não repõe dados de outro acesso", () =>
  ambiente(async ({ valores }) => {
    valores.set("ederflexo.token", "acesso-antigo");
    let liberar;
    const resposta = new Promise((resolver) => {
      liberar = resolver;
    });
    globalThis.fetch = async (url) =>
      url.endsWith("/sair") ? new Response(null, { status: 204 }) : resposta;
    const consulta = requisicao("/contratos");
    const rejeicao = assert.rejects(
      consulta,
      (e) => e.codigo === "SESSAO_ALTERADA",
    );
    await api.sair();
    liberar(json({ conteudo: [{ nome: "Dados antigos" }] }));
    await rejeicao;
    assert.equal(valores.size, 0);
  }));

test("duas abas serializam a rotação do cookie usando Web Locks da mesma origem", async () => {
  const anterior = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const bloqueios = [];
  let fila = Promise.resolve(),
    cookie = 0,
    concorrentes = 0,
    maximo = 0;
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      locks: {
        request(nome, opcoes, acao) {
          bloqueios.push({ nome, opcoes });
          const resultado = fila.then(acao);
          fila = resultado.catch(() => {});
          return resultado;
        },
      },
    },
  });
  try {
    const abaA = await import("../src/sessaoNavegador.js?teste-aba-a");
    const abaB = await import("../src/sessaoNavegador.js?teste-aba-b");
    const renovar = async () => {
      const recebido = cookie;
      concorrentes++;
      maximo = Math.max(maximo, concorrentes);
      await new Promise((resolver) => setTimeout(resolver, 5));
      assert.equal(
        recebido,
        cookie,
        "O cookie não pode ser reutilizado por outra aba.",
      );
      cookie++;
      concorrentes--;
    };
    await Promise.all([
      abaA.comBloqueioSessao(renovar),
      abaB.comBloqueioSessao(renovar),
    ]);
    assert.equal(cookie, 2);
    assert.equal(maximo, 1);
    assert.deepEqual(bloqueios, [
      { nome: "conta-comigo-sessao", opcoes: { mode: "exclusive" } },
      { nome: "conta-comigo-sessao", opcoes: { mode: "exclusive" } },
    ]);
  } finally {
    if (anterior) Object.defineProperty(globalThis, "navigator", anterior);
    else delete globalThis.navigator;
  }
});

test("logout comunica somente a intenção para outras abas, sem senha, token ou usuário", () =>
  ambiente(async () => {
    let canal,
      recebido = 0;
    class CanalTeste {
      constructor(nome) {
        canal = this;
        this.nome = nome;
        this.enviadas = [];
      }
      addEventListener(nome, fn) {
        this.ouvir = fn;
      }
      postMessage(dados) {
        this.enviadas.push(dados);
      }
      close() {
        this.fechado = true;
      }
    }
    window.BroadcastChannel = CanalTeste;
    const parar = ouvirSaidaOutraAba(() => recebido++);
    globalThis.fetch = async () => new Response(null, { status: 204 });
    await api.sair();
    assert.equal(canal.nome, "conta-comigo-acesso");
    assert.deepEqual(canal.enviadas, [{ tipo: "sair" }]);
    canal.ouvir({ data: { tipo: "outro" } });
    assert.equal(recebido, 0);
    canal.ouvir({ data: { tipo: "sair" } });
    assert.equal(recebido, 1);
    parar();
    assert.equal(canal.fechado, true);
  }));

test("corpo de resposta protegido que termina após Sair também é descartado", () =>
  ambiente(async ({ valores }) => {
    valores.set("ederflexo.token", "acesso-antigo");
    let iniciou, liberar;
    const inicio = new Promise((resolver) => {
      iniciou = resolver;
    });
    const corpo = new Promise((resolver) => {
      liberar = resolver;
    });
    globalThis.fetch = async (url) => {
      if (url.endsWith("/sair")) return new Response(null, { status: 204 });
      const resposta = json({});
      resposta.json = async () => {
        iniciou();
        return corpo;
      };
      return resposta;
    };
    const consulta = requisicao("/contratos");
    const rejeicao = assert.rejects(
      consulta,
      (e) => e.codigo === "SESSAO_ALTERADA",
    );
    await inicio;
    await api.sair();
    liberar({ conteudo: [{ nome: "Dados antigos" }] });
    await rejeicao;
    assert.equal(valores.size, 0);
  }));

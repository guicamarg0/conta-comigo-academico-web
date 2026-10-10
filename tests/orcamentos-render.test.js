import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import { createServer } from "vite";

test("fluxos atuais renderizam após limpeza dos módulos legados", async () => {
  const anteriores = Object.fromEntries(
    ["sessionStorage", "localStorage", "window"].map((chave) => [
      chave,
      Object.getOwnPropertyDescriptor(globalThis, chave),
    ]),
  );
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: { getItem: () => "sessao-apenas-do-teste" },
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: { getItem: () => null },
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { matchMedia: () => ({ matches: false }) },
  });
  const server = await createServer({
    plugins: [
      {
        name: "calendario-sem-portal-no-teste-de-renderizacao",
        enforce: "pre",
        load(id) {
          // O calendário usa um portal no DOM. Este teste cobre a montagem do formulário.
          if (id.replaceAll("\\", "/").endsWith("/components/CampoData.jsx")) {
            return 'import React from "react"; export function CampoData() { return React.createElement("input", {type: "date"}); }';
          }
        },
      },
    ],
    server: { middlewareMode: true },
    appType: "custom",
  });
  try {
    const { DadosProvider } = await server.ssrLoadModule("/src/context.jsx");
    const { OrcamentosConectados, NovoOrcamentoConectado } =
      await server.ssrLoadModule(
        "/src/funcionalidades/orcamentos/Orcamentos.jsx",
      );
    const { ClientesPage, ServicosPage, PecasPage } =
      await server.ssrLoadModule("/src/pages/operations.jsx");
    const { ServicosConectados } = await server.ssrLoadModule(
      "/src/pages/operationsApi.jsx",
    );
    const { DashboardOperacional } = await server.ssrLoadModule(
      "/src/pages/dashboardOperacional.jsx",
    );
    const { AgendaOperacional } = await server.ssrLoadModule(
      "/src/pages/agendaOperacional.jsx",
    );
    for (const [pagina, rota, texto] of [
      [ClientesPage, "/clientes", "Clientes"],
      [ServicosPage, "/servicos", "Serviços"],
      [ServicosConectados, "/servicos", "Serviços"],
      [PecasPage, "/pecas", "Peças"],
      [DashboardOperacional, "/", "Dashboard"],
      [AgendaOperacional, "/agenda", "Agenda"],
      [OrcamentosConectados, "/orcamentos", "Nenhum registro encontrado"],
      [NovoOrcamentoConectado, "/orcamentos/novo", "Buscar cliente"],
      [
        NovoOrcamentoConectado,
        "/orcamentos/novo?editar=teste",
        "Carregando rascunho",
      ],
    ]) {
      const html = renderToString(
        React.createElement(
          StaticRouter,
          { location: rota },
          React.createElement(DadosProvider, null, React.createElement(pagina)),
        ),
      );
      assert.ok(
        html.includes(texto),
        `A rota ${rota} deve renderizar seu conteúdo`,
      );
    }
  } finally {
    await server.close();
    for (const [chave, descritor] of Object.entries(anteriores)) {
      if (descritor) Object.defineProperty(globalThis, chave, descritor);
      else delete globalThis[chave];
    }
  }
});

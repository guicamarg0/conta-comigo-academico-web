import test from "node:test";
import assert from "node:assert/strict";
import { encaminharApi } from "../functions/api/[[path]].js";

const site = "https://conta-comigo.pages.dev";
const env = { VITE_API_URL: "https://api.example.com/api/v1" };

test("proxy preserva corpo, autorização e cookie de sessão sem transmitir outros cookies", async () => {
  const request = new Request(`${site}/api/v1/autenticacao/renovar`, {
    method: "POST", body: JSON.stringify({ manterConectado: true }),
    headers: { Origin: site, "Content-Type": "application/json", Authorization: "Bearer acesso",
      Cookie: "outro=privado; conta_comigo_renovacao=renovacao", "X-Unidade-Id": "unidade" },
  });
  const resposta = await encaminharApi({ request, env }, async (url, opcoes) => {
    assert.equal(url, "https://api.example.com/api/v1/autenticacao/renovar");
    assert.equal(opcoes.headers.get("Cookie"), "conta_comigo_renovacao=renovacao");
    assert.equal(opcoes.headers.get("Authorization"), "Bearer acesso");
    assert.equal(opcoes.headers.get("Origin"), site);
    assert.deepEqual(await new Response(opcoes.body).json(), { manterConectado: true });
    return new Response('{"tokenAcesso":"novo"}', { headers: {
      "Set-Cookie": "conta_comigo_renovacao=novo; HttpOnly; Secure; SameSite=Lax; Path=/api/v1/autenticacao",
      "Access-Control-Allow-Origin": site,
    } });
  });
  assert.match(resposta.headers.get("Set-Cookie"), /HttpOnly; Secure/);
  assert.equal(resposta.headers.get("Cache-Control"), "no-store");
  assert.equal(resposta.headers.get("Access-Control-Allow-Origin"), null);
  assert.deepEqual(await resposta.json(), { tokenAcesso: "novo" });
});

test("proxy conserva bytes e nome do PDF, status de erro e parâmetros de filtros", async () => {
  const bytes = new Uint8Array([37, 80, 68, 70, 0, 255]);
  const resposta = await encaminharApi({ env, request: new Request(`${site}/api/v1/orcamentos/1/pdf?versao=2`, {
    headers: { Cookie: "conta_comigo_renovacao=privado" },
  }) }, async (url, opcoes) => {
    assert.equal(url, "https://api.example.com/api/v1/orcamentos/1/pdf?versao=2");
    assert.equal(opcoes.headers.get("Cookie"), null);
    return new Response(bytes, { headers: { "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="ORC-1_Cliente.pdf"' } });
  });
  assert.deepEqual(new Uint8Array(await resposta.arrayBuffer()), bytes);
  assert.match(resposta.headers.get("Content-Disposition"), /ORC-1_Cliente.pdf/);
  const erro = await encaminharApi({ env, request: new Request(`${site}/api/v1/clientes`) },
    async () => Response.json({ detail: "Sem acesso" }, { status: 401 }));
  assert.equal(erro.status, 401);
  assert.deepEqual(await erro.json(), { detail: "Sem acesso" });
});

test("proxy rejeita origem externa, caminho inválido, ambiente mal configurado e redirects", async () => {
  let envios = 0;
  const enviar = async () => { envios++; return new Response(null, { status: 302 }); };
  const externo = await encaminharApi({ env, request: new Request(`${site}/api/v1/autenticacao/sair`, {
    method: "POST", headers: { Origin: "https://externo.example" },
  }) }, enviar);
  assert.equal(externo.status, 403);
  assert.equal((await encaminharApi({ env, request: new Request(`${site}/api/outro`) }, enviar)).status, 404);
  for (const alvo of ["", "http://api.example.com", "https://senha@api.example.com", `${site}/api/v1`]) {
    const resposta = await encaminharApi({ env: { VITE_API_URL: alvo }, request: new Request(`${site}/api/v1/clientes`) }, enviar);
    assert.equal(resposta.status, 503);
  }
  assert.equal(envios, 0);
  assert.equal((await encaminharApi({ env, request: new Request(`${site}/api/v1/clientes`) }, enviar)).status, 502);
  assert.equal(envios, 1);
});

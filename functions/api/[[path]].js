const cookieSessao = "conta_comigo_renovacao";
const cabecalhosEntrada = [
  "accept", "content-type", "authorization", "x-unidade-id", "range",
  "if-none-match", "if-modified-since",
];

function falha(status, detalhe) {
  return Response.json({ detail: detalhe, status }, {
    status, headers: { "Cache-Control": "no-store" },
  });
}

// O destino vem do ambiente do Pages; a URL recebida nunca escolhe um servidor.
export async function encaminharApi({ request, env }, enviar = fetch) {
  const origem = new URL(request.url);
  if (!/^\/api\/v1(?:\/|$)/.test(origem.pathname))
    return falha(404, "Endereço da API não encontrado.");
  if (!["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"].includes(request.method))
    return falha(405, "Método não permitido.");
  const origin = request.headers.get("Origin");
  if (origin && origin !== origem.origin)
    return falha(403, "Origem da solicitação não permitida.");
  let destino;
  try {
    destino = new URL(env.API_PROXY_TARGET || env.VITE_API_URL);
    if (destino.protocol !== "https:" || destino.username || destino.password ||
        destino.search || destino.hash || destino.origin === origem.origin ||
        !["", "/", "/api/v1", "/api/v1/"].includes(destino.pathname))
      throw new Error("Destino inválido");
  } catch {
    return falha(503, "A conexão com o sistema ainda não foi configurada.");
  }
  destino.pathname = origem.pathname;
  destino.search = origem.search;
  const headers = new Headers();
  for (const nome of cabecalhosEntrada) {
    const valor = request.headers.get(nome);
    if (valor) headers.set(nome, valor);
  }
  if (origin) headers.set("Origin", origin);
  // Não transmitir cookies de outros recursos hospedados no mesmo domínio.
  if (/^\/api\/v1\/autenticacao(?:\/|$)/.test(origem.pathname)) {
    const cookie = (request.headers.get("Cookie") || "").split(";")
      .map((valor) => valor.trim()).find((valor) => valor.startsWith(`${cookieSessao}=`));
    if (cookie) headers.set("Cookie", cookie);
  }
  try {
    const upstream = await enviar(destino.href, {
      method: request.method, headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
      redirect: "manual", duplex: "half",
      signal: request.signal,
    });
    if (upstream.status >= 300 && upstream.status < 400)
      return falha(502, "O sistema retornou um redirecionamento inesperado.");
    const resposta = new Response(upstream.body, upstream);
    for (const nome of [...resposta.headers.keys()]) {
      if (nome.startsWith("access-control-") ||
          ["connection", "keep-alive", "transfer-encoding", "server"].includes(nome))
        resposta.headers.delete(nome);
    }
    resposta.headers.set("Cache-Control", "no-store");
    resposta.headers.set("X-Content-Type-Options", "nosniff");
    return resposta;
  } catch {
    return falha(502, "Não foi possível conectar ao sistema. Tente novamente.");
  }
}

export const onRequest = (context) => encaminharApi(context);

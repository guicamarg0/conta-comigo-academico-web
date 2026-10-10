let filaLocal = Promise.resolve();
let canal;
const ouvintes = new Set();

// Web Locks coordena abas da mesma origem sem ler ou compartilhar o cookie.
export function comBloqueioSessao(acao) {
  const executar = () =>
    globalThis.navigator?.locks?.request
      ? globalThis.navigator.locks.request(
          "conta-comigo-sessao",
          { mode: "exclusive" },
          acao,
        )
      : acao();
  const resultado = filaLocal.then(executar);
  filaLocal = resultado.catch(() => {});
  return resultado;
}

export function ouvirSaidaOutraAba(ouvinte) {
  if (typeof window === "undefined" || !window.BroadcastChannel)
    return () => {};
  if (!canal) {
    canal = new window.BroadcastChannel("conta-comigo-acesso");
    canal.addEventListener("message", (evento) => {
      if (evento.data?.tipo === "sair") ouvintes.forEach((fn) => fn());
    });
  }
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
    if (!ouvintes.size) {
      canal?.close();
      canal = null;
    }
  };
}

export function avisarSaidaOutraAba() {
  // Apenas a intenção é enviada. Senhas, tokens e identidade nunca passam pelo canal.
  canal?.postMessage({ tipo: "sair" });
}

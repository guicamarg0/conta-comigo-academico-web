const paleta = [
  ["#1557a0", "#eaf3ff", "#c6ddfa"],
  ["#6b36a8", "#f3edff", "#dfcef8"],
  ["#176640", "#eaf7ef", "#c3e7d0"],
  ["#8c4c0c", "#fff5e5", "#f5d9ad"],
  ["#a12e56", "#fff0f5", "#f5cddd"],
];

export function corDoServico(servico) {
  const identidade = String(
    servico.id || servico.codigo || servico.titulo || "servico",
  );
  const indice = [...identidade].reduce(
    (valor, letra) => (valor * 31 + letra.charCodeAt(0)) % paleta.length,
    0,
  );
  const [cor, fundo, borda] = paleta[indice];
  return { "--dia-cor": cor, "--dia-fundo": fundo, "--dia-borda": borda };
}

export function corDosServicosDoDia(servicos) {
  if (!servicos.length) return undefined;
  if (servicos.length === 1) return corDoServico(servicos[0]);
  return {
    "--dia-cor": "#4b6384",
    "--dia-fundo": "#f3f6fa",
    "--dia-borda": "#d4deeb",
  };
}

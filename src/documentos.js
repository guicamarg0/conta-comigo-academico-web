export function nomePdf(numero, cliente) {
  const seguro = (s, limite) =>
    String(s || "Cliente")
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/[^A-Za-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, limite) || "Cliente";
  const codigo = String(numero).replace(/^(ORC)-\d{4}-0*(\d+)$/, "$1-$2");
  return `${seguro(codigo, 30)}_${seguro(cliente, 70)}.pdf`;
}

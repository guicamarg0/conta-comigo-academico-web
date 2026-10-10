export const PREFIXO_DEMO = "conta-comigo.demo.v2.";
export function lerDemo(armazenamento, chave, base) {
  try {
    const valor = armazenamento.getItem(PREFIXO_DEMO + chave);
    const parsed = valor ? JSON.parse(valor) : null;
    return parsed == null || (Array.isArray(base) && !Array.isArray(parsed))
      ? structuredClone(base)
      : parsed;
  } catch {
    return structuredClone(base);
  }
}
export function gravarDemo(armazenamento, chave, valor) {
  armazenamento.setItem(PREFIXO_DEMO + chave, JSON.stringify(valor));
}
export function limparDemo(armazenamento, chaves) {
  chaves.forEach((chave) => armazenamento.removeItem(PREFIXO_DEMO + chave));
  const restantes = Array.from({ length: armazenamento.length }, (_, i) =>
    armazenamento.key(i),
  ).filter((chave) => chave?.startsWith(PREFIXO_DEMO));
  restantes.forEach((chave) => armazenamento.removeItem(chave));
}

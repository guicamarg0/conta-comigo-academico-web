export function proximoCodigo(lista, prefixo) {
  const maior = lista.reduce((max, item) => {
    const codigo = String(item.numero || item.codigo || item.id || "");
    const valor = codigo.startsWith(prefixo + "-")
      ? codigo.slice(prefixo.length + 1)
      : "";
    return /^\d+$/.test(valor) ? Math.max(max, Number(valor)) : max;
  }, 0);
  return prefixo + "-" + (maior + 1);
}

export function periodoServico(s) {
  const legado =
    s.dataProgramada ||
    (s.data?.includes("/") ? s.data.split("/").reverse().join("-") : s.data) ||
    "";
  return {
    inicio: s.dataInicio || legado,
    fim: s.dataFim || s.dataInicio || legado,
  };
}
export function ocupaDia(s, dia) {
  const { inicio, fim } = periodoServico(s);
  return Boolean(inicio && fim && inicio <= dia && fim >= dia);
}
export function cruzaPeriodo(s, inicio, fimExclusivo) {
  const p = periodoServico(s);
  return Boolean(
    p.inicio && p.fim && p.inicio < fimExclusivo && p.fim >= inicio,
  );
}
export function rotuloPeriodo(s) {
  const p = periodoServico(s);
  const br = (d) => d.split("-").reverse().join("/");
  return p.inicio
    ? p.inicio === p.fim
      ? br(p.inicio)
      : br(p.inicio) + " a " + br(p.fim)
    : "—";
}

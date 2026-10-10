// Datas de calendário usam horário local ao meio-dia, sem conversão para UTC.
export function dataIso(data) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
}
export function lerData(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor || "")) return null;
  const data = new Date(`${valor}T12:00:00`);
  return !Number.isNaN(data.getTime()) && dataIso(data) === valor ? data : null;
}
export function diasDoCalendario(mes) {
  const inicio = lerData(`${mes}-01`);
  if (!inicio) return [];
  inicio.setDate(inicio.getDate() - ((inicio.getDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, indice) => {
    const data = new Date(inicio);
    data.setDate(data.getDate() + indice);
    return dataIso(data);
  });
}
export function moverData(valor, dias) {
  const data = lerData(valor);
  if (!data) return "";
  data.setDate(data.getDate() + dias);
  return dataIso(data);
}
export function moverMes(valor, meses) {
  const data = lerData(valor);
  if (!data) return "";
  const dia = data.getDate();
  data.setDate(1);
  data.setMonth(data.getMonth() + meses);
  const ultimo = new Date(
    data.getFullYear(),
    data.getMonth() + 1,
    0,
    12,
  ).getDate();
  data.setDate(Math.min(dia, ultimo));
  return dataIso(data);
}
export function limitarData(valor, min, max) {
  if (lerData(min) && valor < min) return min;
  if (lerData(max) && valor > max) return max;
  return valor;
}

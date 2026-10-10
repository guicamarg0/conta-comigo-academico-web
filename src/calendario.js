import { periodoServico } from "./periodoServico.js";
const escapar = (valor) =>
  String(valor || "")
    .replaceAll("\\", "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,");
function dobrar(linha) {
  const encoder = new TextEncoder();
  let partes = [],
    atual = "";
  for (const letra of linha) {
    if (encoder.encode(atual + letra).length > 75) {
      partes.push(atual);
      atual = " " + letra;
    } else atual += letra;
  }
  return [...partes, atual].join("\r\n");
}
export function conviteServico(servico, agora = new Date()) {
  const { inicio, fim: ultimoDia } = periodoServico(servico);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(inicio) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(ultimoDia) ||
    ultimoDia < inicio
  )
    throw new Error("Agende o serviço antes de gerar o convite.");
  const [ano, mes, dia] = ultimoDia.split("-").map(Number);
  const fim = new Date(Date.UTC(ano, mes - 1, dia + 1))
    .toISOString()
    .slice(0, 10)
    .replaceAll("-", "");
  return (
    [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Gestao de Servicos//Agenda//PT-BR",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${escapar(servico.id)}@gestao-servicos`,
      `DTSTAMP:${agora
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}/, "")}`,
      `DTSTART;VALUE=DATE:${inicio.replaceAll("-", "")}`,
      `DTEND;VALUE=DATE:${fim}`,
      `SUMMARY:${escapar(`${servico.codigo || ""} · ${servico.titulo}`)}`,
      `LOCATION:${escapar(servico.localExecucao)}`,
      `DESCRIPTION:${escapar([servico.cliente, servico.descricao, servico.responsavel && `Responsável: ${servico.responsavel}`].filter(Boolean).join("\n"))}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ]
      .map(dobrar)
      .join("\r\n") + "\r\n"
  );
}
export function baixarConvite(servico) {
  const url = URL.createObjectURL(
    new Blob([conviteServico(servico)], {
      type: "text/calendar;charset=utf-8",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `${servico.codigo || "servico"}.ics`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

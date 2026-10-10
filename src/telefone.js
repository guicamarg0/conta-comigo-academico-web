import { somenteDigitos } from "./documento.js";

function partes(valor) {
  const original = String(valor || "").trim();
  const digitos = somenteDigitos(original);
  const internacional =
    original.startsWith("+") ||
    (digitos.length > 11 && digitos.startsWith("55"));
  const codigoValido = !internacional || digitos.startsWith("55") || !digitos;
  const numeroCompleto = internacional ? digitos.replace(/^55/, "") : digitos;
  return {
    internacional,
    codigoValido,
    numeroCompleto,
    numero: numeroCompleto.slice(0, 11),
  };
}

export function formatarTelefone(valor) {
  if (
    String(valor || "")
      .trim()
      .startsWith("+") &&
    !somenteDigitos(valor).startsWith("55")
  )
    return String(valor).slice(0, 20);
  const { internacional, numero } = partes(valor);
  if (!numero) return internacional ? "+55 " : "";
  const prefixo = internacional ? "+55 " : "";
  if (numero.length < 3) return `${prefixo}(${numero}`;
  const ddd = numero.slice(0, 2);
  const local = numero.slice(2);
  if (local.length <= 4) return `${prefixo}(${ddd}) ${local}`;
  const corte = local.length <= 8 ? 4 : 5;
  return `${prefixo}(${ddd}) ${local.slice(0, corte)}-${local.slice(corte)}`;
}

export function validarTelefone(valor) {
  const { numero, numeroCompleto, codigoValido } = partes(valor);
  return (
    codigoValido &&
    numeroCompleto.length === numero.length &&
    (numero.length === 10 || numero.length === 11) &&
    numero[0] !== "0" &&
    numero[1] !== "0"
  );
}

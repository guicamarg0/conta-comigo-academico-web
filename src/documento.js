export const somenteDigitos = (valor = "") => String(valor).replace(/\D/g, "");

export function formatarDocumento(valor, tipo) {
  const digitos = somenteDigitos(valor);
  const cnpj = tipo === "PJ" || (!tipo && digitos.length > 11);
  const limite = cnpj ? 14 : 11;
  const texto = digitos.slice(0, limite);
  if (cnpj) {
    return texto
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return texto
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/\.(\d{3})(\d)/, ".$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function validarCpf(valor) {
  const digitos = somenteDigitos(valor);
  if (digitos.length !== 11 || /^(\d)\1+$/.test(digitos)) return false;
  for (let posicao = 9; posicao <= 10; posicao++) {
    const soma = [...digitos.slice(0, posicao)].reduce(
      (total, digito, indice) =>
        total + Number(digito) * (posicao + 1 - indice),
      0,
    );
    const verificador = (soma * 10) % 11;
    if (Number(digitos[posicao]) !== (verificador === 10 ? 0 : verificador))
      return false;
  }
  return true;
}

export function validarCnpj(valor) {
  const digitos = somenteDigitos(valor);
  if (digitos.length !== 14 || /^(\d)\1+$/.test(digitos)) return false;
  for (let posicao = 12; posicao <= 13; posicao++) {
    const pesos =
      posicao === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const soma = pesos.reduce(
      (total, peso, indice) => total + Number(digitos[indice]) * peso,
      0,
    );
    const resto = soma % 11;
    if (Number(digitos[posicao]) !== (resto < 2 ? 0 : 11 - resto)) return false;
  }
  return true;
}

export function validarDocumento(valor, tipo) {
  return tipo === "PF"
    ? validarCpf(valor)
    : tipo === "PJ"
      ? validarCnpj(valor)
      : somenteDigitos(valor).length === 11
        ? validarCpf(valor)
        : validarCnpj(valor);
}

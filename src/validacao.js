export function mensagemValidacao(campo) {
  if (campo.validity.valueMissing || (campo.required && !campo.value.trim()))
    return "Preencha este campo.";
  if (campo.validity.typeMismatch)
    return campo.type === "email"
      ? "Informe um e-mail válido."
      : "Informe um valor válido.";
  if (campo.validity.tooShort)
    return `Use pelo menos ${campo.minLength} caracteres.`;
  if (campo.validity.tooLong)
    return `Use no máximo ${campo.maxLength} caracteres.`;
  if (campo.validity.rangeUnderflow)
    return `Informe um valor igual ou maior que ${campo.min}.`;
  if (campo.validity.rangeOverflow)
    return `Informe um valor igual ou menor que ${campo.max}.`;
  if (campo.validity.badInput || campo.validity.stepMismatch)
    return "Informe um número válido.";
  if (campo.validity.patternMismatch)
    return campo.title || "Confira o formato deste campo.";
  return campo.validationMessage || "";
}
export function validarCampos(escopo = document) {
  if (!escopo) return true;
  const invalidos = [
    ...escopo.querySelectorAll("input,select,textarea"),
  ].filter(
    (c) =>
      !c.disabled &&
      c.type !== "hidden" &&
      (!c.validity.valid || (c.required && !c.value.trim())),
  );
  invalidos.forEach((c) =>
    c.dispatchEvent(new Event("invalid", { bubbles: false, cancelable: true })),
  );
  invalidos[0]?.focus();
  invalidos[0]?.scrollIntoView({ block: "nearest" });
  return invalidos.length === 0;
}

export function aplicarErrosCampos(campos) {
  const controles = [...document.querySelectorAll("input,textarea,select")];
  let primeiro;
  Object.entries(campos).forEach(([nome, mensagem]) => {
    const campo = controles.find((c) => c.name === nome);
    if (campo) {
      campo.dispatchEvent(new CustomEvent("campo:erro", { detail: mensagem }));
      primeiro ||= campo;
    }
  });
  primeiro?.focus();
  primeiro?.scrollIntoView({ block: "nearest" });
}
export function nomeCampo(rotulo) {
  const item = rotulo.match(
    /^(Item do orçamento|Quantidade do item|Unidade do item|Valor unitário do item) (\d+)$/,
  );
  if (item)
    return `itens[${Number(item[2]) - 1}].${{ "Item do orçamento": "descricao", "Quantidade do item": "quantidade", "Unidade do item": "unidadeMedida", "Valor unitário do item": "valorUnitario" }[item[1]]}`;
  const nomes = {
    Nome: "nome",
    "Nome completo": "nome",
    "Nome do modelo": "nome",
    "E-mail": "email",
    Senha: "senha",
    "Senha temporária": "senha",
    CNPJ: "cnpj",
    Cliente: "contratanteId",
    "Buscar cliente": "contratanteId",
    Título: "titulo",
    Responsável: "responsavel",
    Descrição: "descricao",
    "Valor unitário": "valorPadrao",
    "Modelo de contrato": "modeloContratoId",
    "Empresa contratada": "empresaId",
    "Empresa emitente": "empresaId",
    "Nome / Razão social": "nomeRazaoSocial",
    "Razão social": "razaoSocial",
    Documento: "documento",
  };
  return nomes[rotulo];
}
export function destacarCampo(rotulo, mensagem, escopo = document) {
  const campo = [
    ...escopo.querySelectorAll("input,textarea,[contenteditable=true]"),
  ].find((c) => c.getAttribute("aria-label") === rotulo);
  if (!campo) return;
  campo.dispatchEvent(new CustomEvent("campo:erro", { detail: mensagem }));
  campo.focus();
  campo.scrollIntoView({ block: "nearest" });
}

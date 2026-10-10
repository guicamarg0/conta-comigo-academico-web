function registrar(contrato, descricao, autor) {
  return {
    ...contrato,
    atividades: [
      {
        id: crypto.randomUUID(),
        descricao,
        autor,
        ocorridoEm: new Date().toISOString(),
      },
      ...(contrato.atividades || []),
    ],
  };
}
export function versionarContrato(
  contrato,
  alteracoes,
  autor = "Usuário de demonstração",
  restauracao = false,
) {
  if (
    contrato.origem != null &&
    alteracoes.origem != null &&
    String(contrato.origem) !== String(alteracoes.origem)
  )
    throw new Error("A origem do contrato não pode mudar.");
  if (contrato.status === "Encerrado")
    throw new Error(
      "Contratos encerrados não podem ser editados ou restaurados.",
    );
  const campos = [
    "origem",
    "modelo",
    "inicio",
    "termino",
    "servico",
    "clausulas",
    "rascunho",
  ];
  const mudou = campos.some(
    (campo) =>
      Object.hasOwn(alteracoes, campo) &&
      (campo === "origem"
        ? String(alteracoes[campo]) !== String(contrato[campo])
        : alteracoes[campo] !== contrato[campo]),
  );
  if (!mudou && !restauracao && contrato.numeroVersao) return contrato;
  const numeroVersao = (contrato.numeroVersao || 0) + 1;
  const atualizado = {
    ...contrato,
    ...alteracoes,
    status: contrato.status,
    ativo: contrato.ativo ?? true,
    numeroVersao,
  };
  atualizado.versoes = [
    {
      id: crypto.randomUUID(),
      numeroVersao,
      conteudo: atualizado.rascunho || "",
      autor,
      criadoEm: new Date().toISOString(),
    },
    ...(contrato.versoes || []),
  ];
  return registrar(
    atualizado,
    restauracao
      ? "Conteúdo restaurado"
      : numeroVersao === 1
        ? "Contrato criado"
        : "Contrato editado",
    autor,
  );
}
export function alterarSituacaoContrato(
  contrato,
  acao,
  autor = "Usuário de demonstração",
) {
  if (acao === "vigente") {
    if (contrato.status !== "Aguardando assinatura")
      throw new Error(
        "Apenas contratos aguardando assinatura podem se tornar vigentes.",
      );
    return registrar(
      { ...contrato, status: "Vigente" },
      "Contrato marcado como vigente",
      autor,
    );
  }
  if (acao === "encerrar") {
    if (contrato.status !== "Vigente")
      throw new Error("Apenas contratos vigentes podem ser encerrados.");
    return registrar(
      { ...contrato, status: "Encerrado" },
      "Contrato encerrado",
      autor,
    );
  }
  if (acao === "inativar" || acao === "reativar") {
    const ativo = acao === "reativar";
    if ((contrato.ativo ?? true) === ativo) return contrato;
    return registrar(
      { ...contrato, ativo },
      ativo ? "Cadastro reativado" : "Cadastro inativado",
      autor,
    );
  }
  throw new Error("Ação desconhecida.");
}
export function validarOrigemContrato(orcamento, contratos, idAtual) {
  if (orcamento?.status !== "Aprovado")
    throw new Error("Selecione um orçamento aprovado.");
  if (
    contratos.some(
      (c) => c.id !== idAtual && String(c.origem) === String(orcamento.id),
    )
  )
    throw new Error("Este orçamento já possui um contrato.");
}

export function dadosModeloContrato(modelo) {
  return {
    nome: (modelo.nome || "").trim(),
    descricao: (modelo.descricao || "").trim() || null,
    conteudo: (modelo.conteudo || "").trim(),
  };
}

export function mesmoModeloContrato(modelo, persistido) {
  return (
    Boolean(persistido?.id) &&
    JSON.stringify(dadosModeloContrato(modelo)) ===
      JSON.stringify(dadosModeloContrato(persistido))
  );
}

export function conteudoModeloVazio(conteudo) {
  return !(conteudo || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;|&#160;|&#x0*a0;/gi, " ")
    .trim();
}

export class AtivacaoModeloPendente extends Error {
  constructor(causa) {
    super(
      "O texto foi salvo, mas não foi possível deixar o modelo pronto para uso. Clique em Salvar para tentar novamente.",
      { cause: causa },
    );
    this.name = "AtivacaoModeloPendente";
  }
}

/** A primeira gravação permanece identificada mesmo se a ativação falhar. */
export async function salvarModeloConectado({
  modelo,
  persistido,
  servico,
  onPersistido,
}) {
  let resultado = persistido;
  const alterado = !mesmoModeloContrato(modelo, persistido);
  if (alterado) {
    const dados = dadosModeloContrato(modelo);
    resultado = persistido?.id
      ? await servico.atualizarModeloContrato(persistido.id, dados)
      : await servico.criarModeloContrato(dados);
    onPersistido(resultado);
  }
  const ativado = resultado.status === "RASCUNHO";
  if (ativado) {
    try {
      resultado = await servico.publicarModeloContrato(resultado.id);
      onPersistido(resultado);
    } catch (causa) {
      throw new AtivacaoModeloPendente(causa);
    }
  }
  return { modelo: resultado, alterado, ativado };
}

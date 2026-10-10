import { medidaApi, medidaUi } from "../../unidadesMedida.js";
export const statusApi = {
  Rascunho: "RASCUNHO",
  Emitido: "EMITIDO",
  Aprovado: "APROVADO",
  Recusado: "RECUSADO",
  Cancelado: "CANCELADO",
};
const statusUi = Object.fromEntries(
  Object.entries(statusApi).map(([ui, api]) => [api, ui]),
);
const tipoApi = {
  Peça: "PECA",
  "Mão de obra": "MAO_DE_OBRA",
  Material: "MATERIAL",
};
const dataBr = (valor) =>
  valor
    ? new Date(`${valor.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR")
    : "—";

export function orcamentoDaApi(o, clientes = []) {
  const rev = o.revisaoAtualDetalhe || {};
  const cliente = clientes.find((c) => c.id === rev.contratanteId);
  return {
    id: o.id,
    numero: o.numero,
    cliente: rev.cliente || cliente?.nome || "—",
    clienteId: rev.contratanteId,
    referencia: rev.referencia || rev.itens?.[0]?.descricao || "—",
    pagamento: rev.condicoesPagamento || "—",
    quantidadeItens: rev.itens?.length || 0,
    valor: Number(rev.totalFinal || 0),
    status: statusUi[o.status] || o.status,
    revisao: o.revisaoAtual,
    data: dataBr(o.historico?.[0]?.ocorridoEm),
    validade: dataBr(rev.validade),
    itens: (rev.itens || []).map((i) => ({
      descricao: i.descricao,
      tipo: i.tipo,
      quantidade: Number(i.quantidade),
      valor: Number(i.valorUnitario),
      total: Number(i.total),
    })),
    historico: (o.historico || []).map((e) => ({
      titulo: e.tipo,
      descricao: e.observacao || "",
      data: dataBr(e.ocorridoEm),
    })),
  };
}
export function orcamentoParaApi(form, clientes, catalogo) {
  const cliente = clientes.find((c) => c.id === form.cliente);
  if (!cliente) throw new Error("Selecione um cliente cadastrado na unidade.");
  if (!form.itens?.length)
    throw new Error("Adicione ao menos um item ao orçamento.");
  const base = form.data ? new Date(`${form.data}T12:00:00`) : new Date();
  const dias = Number.parseInt(form.validade, 10);
  const validade = /^\d{4}-\d{2}-\d{2}$/.test(form.validade)
    ? form.validade
    : Number.isFinite(dias)
      ? new Date(base.getTime() + dias * 86400000).toISOString().slice(0, 10)
      : null;
  return {
    contratanteId: cliente.id,
    empresaId: form.empresaId || null,
    validade,
    condicoesPagamento: [form.pagamento, form.condicao]
      .filter(Boolean)
      .join(" · "),
    observacoesComerciais: form.observacoes || null,
    referencia: form.referencia || null,
    exibirAssinatura: form.exibirAssinatura !== false,
    exibirPagamento: form.exibirPagamento !== false,
    descontoTipo: "VALOR",
    descontoValor: 0,
    acrescimoTipo: "VALOR",
    acrescimoValor: 0,
    itens: form.itens.map((i) => {
      const item = i.importado
        ? null
        : catalogo.find((c) => c.id === i.catalogoId) ||
          catalogo.find((c) => c.nome === i.descricao);
      const unidadeMedida = medidaApi[i.unidade] || "OUTRA";
      return {
        itemCatalogoId: i.catalogoId || item?.id || null,
        tipo: item?.tipoApi || tipoApi[i.tipo] || "MATERIAL",
        descricao:
          i.importado && i.codigo
            ? `${i.codigo} - ${i.descricao.trim()}`
            : i.descricao.trim(),
        unidadeMedida,
        unidadeMedidaPersonalizada:
          unidadeMedida === "OUTRA" ? i.unidade : null,
        quantidade: Number(i.quantidade),
        valorUnitario: Number(i.valor) || 0,
      };
    }),
  };
}

export function orcamentoParaFormulario(orcamento) {
  const revisao = orcamento.revisaoAtualDetalhe;
  const [pagamento = "", ...condicao] = (
    revisao.condicoesPagamento || ""
  ).split(" · ");
  const referencia = revisao.referencia || "";
  const tipos = {
    PECA: "Peça",
    MAO_DE_OBRA: "Mão de obra",
    MATERIAL: "Material",
  };
  return {
    cliente: revisao.contratanteId || "",
    empresaId: revisao.empresaId || "",
    validade: revisao.validade || "30 dias",
    pagamento,
    condicao: condicao.join(" · "),
    referencia,
    observacoes: revisao.observacoesComerciais || "",
    exibirAssinatura: revisao.exibirAssinatura,
    exibirPagamento: revisao.exibirPagamento !== false,
    itens: revisao.itens.map((i) => ({
      tipo: tipos[i.tipo] || "Material",
      catalogoId: i.itemCatalogoId || "",
      descricao: i.descricao,
      quantidade: Number(i.quantidade),
      unidade:
        medidaUi[i.unidadeMedida] || i.unidadeMedidaPersonalizada || "UN",
      valor: Number(i.valorUnitario),
    })),
  };
}

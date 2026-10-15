import {
  orcamentoParaApi,
  orcamentoDaApi,
  orcamentoParaFormulario,
} from "../src/funcionalidades/orcamentos/adaptadores.js";
import test from "node:test";
import assert from "node:assert/strict";
import { catalogoParaApi, clienteParaApi } from "../src/remote.js";

test("cliente envia documento limpo e contato obrigatório", () => {
  const payload = clienteParaApi({
    tipo: "PJ",
    nome: "PrismaPack",
    razao: "PrismaPack LTDA",
    documento: "12.345.678/0001-90",
    contato: "Carlos",
    email: "carlos@example.com",
  });
  assert.equal(payload.documento, "12345678000190");
  assert.deepEqual(payload.contatos, [
    { nome: "Carlos", telefone: null, email: "carlos@example.com" },
  ]);
  assert.throws(
    () => clienteParaApi({ nome: "Sem contato", documento: "12345678901" }),
    /telefone ou e-mail/,
  );
});

test("rascunho reabre com cliente, condições e itens do catálogo", () => {
  const form = orcamentoParaFormulario({
    revisaoAtualDetalhe: {
      contratanteId: "cliente-1",
      empresaId: "empresa-1",
      validade: "2026-10-28",
      condicoesPagamento: "Pix · 30 dias",
      referencia: "Reparo · linha A",
      observacoesComerciais: "Garantia de 6 meses",
      descontoTipo: "PERCENTUAL",
      descontoValor: 12.5,
      exibirAssinatura: false,
      exibirPagamento: false,
      itens: [
        {
          itemCatalogoId: "item-1",
          tipo: "MAO_DE_OBRA",
          descricao: "Técnico",
          unidadeMedida: "HORA",
          quantidade: 2,
          valorUnitario: 150,
        },
      ],
    },
  });
  assert.equal(form.cliente, "cliente-1");
  assert.equal(form.empresaId, "empresa-1");
  assert.equal(form.exibirAssinatura, false);
  assert.equal(form.exibirPagamento, false);
  assert.equal(form.referencia, "Reparo · linha A");
  assert.equal(form.observacoes, "Garantia de 6 meses");
  assert.equal(form.descontoTipo, "PERCENTUAL");
  assert.equal(form.descontoValor, 12.5);
  assert.deepEqual(form.itens[0], {
    tipo: "Mão de obra",
    catalogoId: "item-1",
    descricao: "Técnico",
    unidade: "Hora",
    quantidade: 2,
    valor: 150,
  });
});

test("catálogo converte unidade e valor no contrato da API", () => {
  assert.deepEqual(
    catalogoParaApi(
      { nome: "Técnico", codigo: "MO-1", unidade: "Hora", preco: 150 },
      true,
    ),
    {
      tipo: "MAO_DE_OBRA",
      nome: "Técnico",
      descricao: null,
      unidadeMedida: "HORA",
      unidadeMedidaPersonalizada: null,
      valorPadrao: 150,
      codigoReferencia: "MO-1",
    },
  );
  assert.equal(
    catalogoParaApi({ nome: "Rolamento", preco: 22.5 }, false).unidadeMedida,
    "UNIDADE",
  );
});

test("orçamento usa IDs da unidade e calcula validade", () => {
  const clientes = [{ id: "cliente-1", nome: "PrismaPack" }];
  const catalogo = [{ id: "item-1", nome: "Rolamento", tipoApi: "PECA" }];
  const payload = orcamentoParaApi(
    {
      cliente: "cliente-1",
      empresaId: "empresa-1",
      data: "2026-09-28",
      validade: "30 dias",
      pagamento: "Transferência",
      descontoTipo: "PERCENTUAL",
      descontoValor: 12.5,
      itens: [
        {
          tipo: "Peça",
          catalogoId: "item-1",
          descricao: "Rolamento especial",
          unidade: "UN",
          quantidade: 2,
          valor: 20,
        },
      ],
    },
    clientes,
    catalogo,
  );
  assert.equal(payload.contratanteId, "cliente-1");
  assert.equal(payload.empresaId, "empresa-1");
  assert.equal(payload.validade, "2026-10-28");
  assert.equal(payload.itens[0].itemCatalogoId, "item-1");
  assert.equal(payload.itens[0].descricao, "Rolamento especial");
  assert.equal(payload.itens[0].tipo, "PECA");
  assert.equal(payload.descontoTipo, "PERCENTUAL");
  assert.equal(payload.descontoValor, 12.5);
  assert.throws(
    () =>
      orcamentoParaApi({ cliente: "outro", itens: [{}] }, clientes, catalogo),
    /cliente cadastrado/,
  );
});

test("lista usa cliente da revisão e evento mais recente", () => {
  const item = orcamentoDaApi({
    id: "o1",
    numero: "42",
    revisaoAtual: 2,
    status: "EMITIDO",
    revisaoAtualDetalhe: {
      cliente: "Cliente da API",
      contratanteId: "c1",
      referencia: "Referência da proposta",
      observacoesComerciais: "Observação",
      condicoesPagamento: "Pix",
      totalFinal: 900,
      subtotal: 1000,
      descontoTipo: "VALOR",
      descontoValor: 100,
      descontoTotal: 100,
      itens: [
        { descricao: "Serviço", quantidade: 1, valorUnitario: 900, total: 900 },
      ],
    },
    historico: [
      { ocorridoEm: "2026-10-02T10:00:00" },
      { ocorridoEm: "2026-09-28T10:00:00" },
    ],
  });
  assert.equal(item.cliente, "Cliente da API");
  assert.equal(item.data, "02/10/2026");
  assert.equal(item.referencia, "Referência da proposta");
  assert.equal(item.quantidadeItens, 1);
  assert.equal(item.subtotal, 1000);
  assert.equal(item.descontoTipo, "VALOR");
  assert.equal(item.descontoValor, 100);
  assert.equal(item.descontoTotal, 100);
  assert.equal(item.pagamento, "Pix");
});

import { versionarContrato, validarOrigemContrato } from "../demo/contratos.js";
import { HistoricoContratoDemo } from "../funcionalidades/contratos/HistoricoContratoDemo.jsx";
import { useEdicaoProtegida } from "../components/EdicaoProtegida.jsx";
import { validarCampos, destacarCampo } from "../validacao.js";
import { proximoCodigo } from "../codigoSequencial";
import { CampoData } from "../components/CampoData";
import { BarraFiltros } from "../components/BarraFiltros";
import { SelectPesquisavel } from "../components/SelectPesquisavel";
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  CircleCheck,
  CircleX,
  Clock3,
  Copy,
  Download,
  Eye,
  FileText,
  Plus,
  Send,
} from "lucide-react";
import { useDados } from "../context.jsx";
import {
  OrcamentosConectados,
  NovoOrcamentoConectado,
} from "../funcionalidades/orcamentos/Orcamentos.jsx";
import {
  ClienteRapido,
  ItemRapido,
} from "../funcionalidades/orcamentos/CadastrosRapidos.jsx";
import { api } from "../api.js";
import { useCadastroDados } from "../components/useCadastroDados.js";
import { UnidadeSelect } from "../components/UnidadeSelect.jsx";
import { EditorConteudo, preencherModelo } from "./contractTemplates.jsx";
import { ImportarItens } from "../components/ImportarItens.jsx";
import { moeda } from "../data.js";
import {
  Badge,
  Card,
  DataTable,
  DetailPanel,
  DetailRows,
  Field,
  Modal,
  MobileFlow,
  PageHeading,
  SelectFilter,
  Stat,
  Tabs,
  TextFilter,
  Timeline,
} from "../components.jsx";

const inicial = {
  empresaId: "",
  cliente: "",
  referencia: "",
  data: "2026-09-28",
  validade: "30 dias",
  prazo: "2 semanas",
  pagamento: "Transferência bancária",
  condicao: "30/60 dias",
  observacoes: "",
  itens: [
    {
      tipo: "Peça",
      catalogoId: "",
      descricao: "",
      quantidade: 1,
      unidade: "UN",
      valor: 0,
      desconto: 0,
    },
  ],
};
export function OrcamentosPage() {
  const { modo } = useDados();
  return modo === "api" ? <OrcamentosConectados /> : <OrcamentosDemo />;
}
function OrcamentosDemo() {
  const { orcamentos, clientes, salvar, setToast } = useDados();
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("");
  const [clienteFiltro, setClienteFiltro] = useState(""),
    [periodo, setPeriodo] = useState("");
  const [selecionado, setSelecionado] = useState(() =>
    window.matchMedia("(max-width:720px)").matches ? null : orcamentos[0],
  );
  const [aba, setAba] = useState("Resumo");
  const [decisao, setDecisao] = useState(false);
  const [obs, setObs] = useState("");
  const filtrados = orcamentos.filter(
    (o) =>
      `${o.id} ${o.cliente} ${o.referencia}`
        .toLowerCase()
        .includes(busca.toLowerCase()) &&
      (!status || o.status === status) &&
      (!clienteFiltro || o.cliente === clienteFiltro) &&
      (!periodo ||
        (o.data?.includes("/")
          ? o.data.split("/").reverse().join("-")
          : o.data || ""
        ).startsWith(periodo)),
  );
  function decidir(novoStatus) {
    const item = {
      ...selecionado,
      status: novoStatus,
      historico: [
        ...(selecionado.historico || []),
        {
          titulo: `Orçamento ${novoStatus.toLowerCase()}`,
          descricao: obs,
          data: "28/09/2026",
        },
      ],
    };
    salvar("orcamentos", item);
    setSelecionado(item);
    setDecisao(false);
    setToast(`Decisão registrada: ${novoStatus}.`);
  }
  return (
    <>
      <PageHeading
        title="Orçamentos"
        subtitle="Gerencie todos os orçamentos da sua empresa"
        action={
          <button
            className="btn primary"
            onClick={() => navigate("/orcamentos/novo")}
          >
            <Plus size={17} /> Novo orçamento
          </button>
        }
      />

      <div className="list-detail">
        <div className="list-stack">
          <BarraFiltros className="outside">
            <TextFilter
              value={busca}
              onChange={setBusca}
              placeholder="Buscar por nº, cliente, referência ou serviço..."
            />
            <SelectFilter
              value={status}
              onChange={setStatus}
              options={[
                "Todos",
                "Rascunho",
                "Emitido",
                "Aprovado",
                "Recusado",
                "Expirado",
              ]}
            />
            <input
              type="month"
              aria-label="Período"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
            />
            <SelectFilter
              label="Cliente"
              value={clienteFiltro}
              onChange={setClienteFiltro}
              options={["Todos", ...clientes.map((c) => c.nome)]}
            />
          </BarraFiltros>
          <Card
            title={`${filtrados.length || 0} orçamentos encontrados`}
            action={
              <button
                className="btn outline"
                onClick={() =>
                  setToast("Exportação de orçamentos disponível em Relatórios.")
                }
              >
                <Download size={17} /> Exportar
              </button>
            }
          >
            <DataTable
              rows={filtrados}
              selected={selecionado}
              onSelect={setSelecionado}
              pageSize={15}
              columns={[
                { key: "id", label: "Nº", render: (o) => <a>{o.id}</a> },
                {
                  key: "status",
                  label: "Status",
                  render: (o) => <Badge>{o.status}</Badge>,
                },
                { key: "cliente", label: "Cliente" },
                {
                  key: "valor",
                  label: "Valor total",
                  render: (o) => (
                    <strong className="budget-value">{moeda(o.valor)}</strong>
                  ),
                },
                { key: "referencia", label: "Referência" },
                {
                  key: "revisao",
                  label: "Revisão",
                  render: (o) => `Rev. ${o.revisao}`,
                },
                { key: "data", label: "Data" },
                {
                  key: "acoes",
                  label: "Ações",
                  render: () => <Eye size={16} color="var(--brand-primary)" />,
                },
              ]}
            />
          </Card>
        </div>
        {selecionado && (
          <DetailPanel
            title={`Orçamento #${selecionado.id}`}
            status={selecionado.status}
            onClose={() => setSelecionado(null)}
            tabs={["Resumo", "Itens (4)", "Histórico"]}
            tab={aba}
            setTab={setAba}
            footer={
              <>
                <button
                  className="btn primary full"
                  onClick={() =>
                    setToast(
                      "Conecte à API para baixar o PDF, inclusive de rascunhos.",
                    )
                  }
                >
                  <FileText size={16} /> Visualizar PDF
                </button>
                <div className="button-pair">
                  {selecionado.status === "Rascunho" && (
                    <button
                      className="btn outline"
                      onClick={() =>
                        navigate(`/orcamentos/novo?editar=${selecionado.id}`)
                      }
                    >
                      Editar rascunho
                    </button>
                  )}
                  <button
                    className="btn outline"
                    onClick={() => {
                      const novo = {
                        ...selecionado,
                        id: Math.max(...orcamentos.map((o) => o.id)) + 1,
                        status: "Rascunho",
                        revisao: 0,
                      };
                      salvar("orcamentos", novo);
                      setToast("Orçamento duplicado.");
                    }}
                  >
                    <Copy size={16} /> Duplicar
                  </button>
                  <button
                    className="btn outline"
                    onClick={() => navigate("/contratos/novo")}
                  >
                    <FileText size={16} /> Gerar contrato
                  </button>
                </div>
                <button
                  className="btn danger-outline full"
                  onClick={() => setDecisao(true)}
                >
                  Registrar decisão
                </button>
              </>
            }
          >
            <div className="budget-view-total">
              <span>Valor do orçamento</span>
              <strong>{moeda(selecionado.valor)}</strong>
              <div className="budget-view-status">
                <span>Status do orçamento</span>
                <Badge>{selecionado.status}</Badge>
              </div>
            </div>
            {aba === "Resumo" ? (
              <>
                <h3>Informações gerais</h3>
                <DetailRows
                  rows={[
                    ["Cliente", selecionado.cliente],
                    ["Referência", selecionado.referencia],
                    [
                      "Valor total",
                      <strong>{moeda(selecionado.valor)}</strong>,
                    ],
                    ["Status", <Badge>{selecionado.status}</Badge>],
                    ["Data de criação", selecionado.data],
                    [
                      "Validade",
                      selecionado.validade || "28/10/2026 (30 dias)",
                    ],
                    ["Revisão atual", `Rev. ${selecionado.revisao}`],
                    ["Responsável", "João Silva"],
                    ["Condições de pagamento", "30/60 dias"],
                  ]}
                />
                <h3>Serviços e itens (4)</h3>
                <div className="item-summary">
                  {[
                    ["Recuperação de mandrins", "Serviço", 15800],
                    ["Troca de anéis", "Peça", 6200],
                    ["Mão de obra em campo", "Mão de obra", 4500],
                    ["Deslocamento técnico", "Serviço", 2000],
                  ].map(([n, t, v]) => (
                    <div key={n}>
                      <span>
                        <strong>{n}</strong>
                        <small>{t}</small>
                      </span>
                      <b>{moeda(v)}</b>
                    </div>
                  ))}
                </div>
                <h3>Observações</h3>
                <p className="notice muted-box">
                  Recuperação completa dos mandrins conforme especificações
                  técnicas do cliente.
                </p>
              </>
            ) : aba.startsWith("Itens") ? (
              <div className="item-summary">
                {[
                  ["Recuperação de mandrins", "Serviço", 15800],
                  ["Troca de anéis", "Peça", 6200],
                  ["Mão de obra em campo", "Mão de obra", 4500],
                  ["Deslocamento técnico", "Serviço", 2000],
                ].map(([n, t, v]) => (
                  <div key={n}>
                    <span>
                      <strong>{n}</strong>
                      <small>{t}</small>
                    </span>
                    <b>{moeda(v)}</b>
                  </div>
                ))}
              </div>
            ) : (
              <Timeline
                events={
                  selecionado.historico || [
                    {
                      titulo: "Orçamento enviado",
                      descricao: "Rev. 2 enviada ao cliente.",
                      data: "28/09/2026",
                    },
                    {
                      titulo: "Orçamento criado",
                      descricao: "João Silva criou o rascunho.",
                      data: "27/09/2026",
                    },
                  ]
                }
              />
            )}
          </DetailPanel>
        )}
      </div>
      {decisao && (
        <Modal
          title="Registrar decisão do cliente"
          onClose={() => setDecisao(false)}
          footer={
            <>
              <button className="btn outline" onClick={() => setDecisao(false)}>
                Cancelar
              </button>
              <button
                className="btn success"
                onClick={() => decidir("Aprovado")}
              >
                Registrar aprovação
              </button>
              <button
                className="btn danger-outline"
                onClick={() => decidir("Recusado")}
              >
                Registrar recusa
              </button>
            </>
          }
        >
          <div className="form-grid">
            <Field label="Data da decisão">
              <CampoData defaultValue="2026-09-28" />
            </Field>
            <Field label="Responsável pela confirmação">
              <input defaultValue="João Silva" />
            </Field>
            <Field label="Observações">
              <input
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                placeholder="Aprovação recebida por e-mail."
              />
            </Field>
          </div>
          <p className="notice info">
            A aprovação libera a criação de contrato e fica registrada no
            histórico.
          </p>
        </Modal>
      )}
    </>
  );
}

export function NovoOrcamentoPage() {
  const { modo } = useDados();
  return modo === "api" ? <NovoOrcamentoConectado /> : <NovoOrcamentoDemo />;
}
function NovoOrcamentoDemo() {
  const { dados: empresasCadastradas } = useCadastroDados(
    api.listarEmpresas,
    "empresas",
  );
  const empresas = empresasCadastradas.filter((e) => e.ativo);
  const { clientes, pecas, maoObra, orcamentos, salvar, setToast } = useDados();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editarId = params.get("editar");
  const rascunho = editarId
    ? orcamentos.find(
        (o) => String(o.id) === editarId && o.status === "Rascunho",
      )
    : null;
  const [etapa, setEtapa] = useState(0);
  const [importando, setImportando] = useState(false);
  const [form, setForm] = useState(() =>
    rascunho
      ? {
          ...inicial,
          cliente: rascunho.cliente,
          empresaId: rascunho.empresaId || "",
          exibirAssinatura: rascunho.exibirAssinatura !== false,
          exibirPagamento: rascunho.exibirPagamento !== false,
          pagamento: rascunho.pagamento || inicial.pagamento,
          condicao: rascunho.condicao || inicial.condicao,
          observacoes: rascunho.observacoes || "",
          referencia: rascunho.referencia,
          validade: rascunho.validade || inicial.validade,
          itens: rascunho.itens?.length
            ? rascunho.itens
            : [
                {
                  tipo: "Material",
                  catalogoId: "",
                  descricao: rascunho.referencia,
                  quantidade: 1,
                  unidade: "UN",
                  valor: Number(rascunho.valor || 0),
                  desconto: 0,
                },
              ],
        }
      : inicial,
  );
  const [erro, setErro] = useState("");
  const confirmarSalvo = useEdicaoProtegida(form);
  const listaItensRef = useRef(null);
  const conteudoRef = useRef(null);
  const quantidadeAnterior = useRef(form.itens.length);
  useEffect(() => {
    if (window.matchMedia("(max-width:720px)").matches) {
      if (window.scrollY > 0)
        conteudoRef.current
          ?.closest(".wizard")
          ?.scrollIntoView({ block: "start" });
    } else conteudoRef.current?.scrollTo({ top: 0 });
  }, [etapa]);
  const [modalCliente, setModalCliente] = useState(false);
  const [novoItemIndice, setNovoItemIndice] = useState(null);
  useEffect(() => {
    if (etapa === 1 && listaItensRef.current) {
      if (window.matchMedia("(max-width:720px)").matches) {
        if (form.itens.length > quantidadeAnterior.current)
          listaItensRef.current
            .querySelector("tbody tr:last-child")
            ?.scrollIntoView({ block: "nearest" });
      } else
        listaItensRef.current.scrollTop = listaItensRef.current.scrollHeight;
    }
    quantidadeAnterior.current = form.itens.length;
  }, [form.itens.length, etapa]);
  const total = form.itens.reduce(
    (s, i) =>
      s +
      Number(i.quantidade || 0) *
        Number(i.valor || 0) *
        (1 - Number(i.desconto || 0) / 100),
    0,
  );
  const alterar = (campo, valor) => setForm((v) => ({ ...v, [campo]: valor }));
  const editarItem = (indice, campo, valor) =>
    setForm((v) => ({
      ...v,
      itens: v.itens.map((i, n) =>
        n === indice ? { ...i, [campo]: valor } : i,
      ),
    }));
  const catalogo = [
    ...pecas.map((i) => ({
      ...i,
      tipoItem:
        i.tipoItem || (i.categoria === "Materiais" ? "Material" : "Peça"),
      valorPadrao: Number(i.valor),
    })),
    ...maoObra.map((i) => ({
      ...i,
      tipoItem: "Mão de obra",
      valorPadrao: Number(i.preco),
    })),
  ];
  function selecionarItem(indice, id) {
    const escolhido = catalogo.find((i) => String(i.id) === id);
    if (!escolhido) return;
    setForm((atual) => ({
      ...atual,
      itens: atual.itens.map((linha, n) =>
        n === indice
          ? {
              ...linha,
              catalogoId: id,
              descricao: escolhido.nome,
              descricaoPersonalizada: false,
              unidade: escolhido.unidade || "UN",
              valor: escolhido.valorPadrao,
            }
          : linha,
      ),
    }));
  }
  function criarClienteRapido(dados) {
    if (
      clientes.some(
        (c) =>
          c.documento.replace(/\D/g, "") === dados.documento.replace(/\D/g, ""),
      )
    )
      throw new Error("Já existe um cliente com este documento.");
    const novo = {
      ...dados,
      id: Date.now(),
      status: "Ativo",
      ultimo: "—",
      valor: 0,
    };
    salvar("clientes", novo);
    alterar("cliente", novo.nome || novo.razao);
    setToast("Cliente cadastrado e selecionado.");
  }
  function criarItemRapido(dados) {
    const labor = dados.tipo === "Mão de obra";
    const id = `${labor ? "MO" : "PC"}-${Date.now()}`;
    const novo = {
      id,
      nome: dados.nome.trim(),
      codigo: dados.codigo.trim(),
      unidade: dados.unidade.trim(),
      valor: Number(dados.valor),
      preco: Number(dados.valor),
      tipoItem: dados.tipo,
      categoria: dados.tipo,
      status: "Ativo",
    };
    salvar(labor ? "maoObra" : "pecas", novo);
    setForm((atual) => ({
      ...atual,
      itens: atual.itens.map((linha, n) =>
        n === novoItemIndice
          ? {
              ...linha,
              catalogoId: id,
              descricao: novo.nome,
              descricaoPersonalizada: false,
              unidade: novo.unidade,
              valor: novo.valor,
            }
          : linha,
      ),
    }));
    setToast("Item cadastrado no catálogo e selecionado.");
  }
  function avancar() {
    if (!validarCampos(conteudoRef.current))
      return setErro("Confira os campos destacados.");
    if (etapa === 0 && !form.cliente) {
      setErro("Selecione um cliente.");
      return;
    }
    if (
      etapa === 1 &&
      (!form.itens.length ||
        form.itens.some(
          (i) =>
            !i.descricao?.trim() ||
            Number(i.quantidade) <= 0 ||
            !i.unidade ||
            i.valor === "" ||
            Number(i.valor) < 0,
        ))
    ) {
      setErro("Preencha descrição, quantidade, unidade e valor dos itens.");
      return;
    }
    setErro("");
    setEtapa(Math.min(3, etapa + 1));
  }
  function salvarOrcamento(status) {
    if (!validarCampos(conteudoRef.current))
      return setErro("Confira os campos destacados.");
    const item = {
      id: rascunho?.id || Math.max(...orcamentos.map((o) => o.id)) + 1,
      cliente: form.cliente,
      empresaId: form.empresaId,
      exibirAssinatura: form.exibirAssinatura !== false,
      exibirPagamento: form.exibirPagamento !== false,
      pagamento: form.pagamento,
      condicao: form.condicao,
      observacoes: form.observacoes,
      referencia: form.referencia || form.itens[0].descricao,
      valor: total,
      status,
      revisao: status === "Rascunho" ? rascunho?.revisao || 0 : 1,
      data: new Date().toLocaleDateString("pt-BR"),
      validade: form.validade,
      itens: form.itens,
    };
    salvar("orcamentos", item);
    confirmarSalvo();
    setToast(
      status === "Emitido"
        ? "Orçamento salvo. O documento pode ser gerado em PDF."
        : "Orçamento salvo.",
    );
    navigate("/orcamentos");
  }
  return (
    <>
      <PageHeading
        title={rascunho ? "Editar orçamento" : "Novo orçamento"}
        subtitle={`Criação guiada · Orçamento #${rascunho?.id || Math.max(...orcamentos.map((o) => o.id)) + 1}`}
      />
      <Card className="wizard">
        <div className="wizard-steps">
          {["Cliente", "Itens", "Condições", "Revisar"].map((nome, i) => (
            <button
              key={nome}
              aria-current={etapa === i ? "step" : undefined}
              disabled={i > etapa}
              className={etapa === i ? "current" : i < etapa ? "done" : ""}
              onClick={() => {
                if (i <= etapa) setEtapa(i);
              }}
            >
              <span>{i < etapa ? "✓" : i + 1}</span>
              {nome}
            </button>
          ))}
        </div>
        <div className="wizard-content" ref={conteudoRef}>
          {etapa === 0 && (
            <div className="wizard-grid">
              <div>
                <h3>Emitente e cliente</h3>
                <Field label="Empresa emitente">
                  <SelectPesquisavel
                    value={form.empresaId}
                    onChange={(e) => alterar("empresaId", e.target.value)}
                  >
                    <option value="">Dados das configurações da unidade</option>
                    {empresas.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.nomeFantasia || e.razaoSocial}
                      </option>
                    ))}
                  </SelectPesquisavel>
                </Field>
                <Field label="Buscar cliente *">
                  <SelectPesquisavel
                    value={form.cliente}
                    onChange={(e) => alterar("cliente", e.target.value)}
                  >
                    <option value="">Selecione um cliente</option>
                    {clientes.map((c) => (
                      <option key={c.id}>{c.nome}</option>
                    ))}
                  </SelectPesquisavel>
                </Field>
                <button
                  className="btn outline"
                  onClick={() => setModalCliente(true)}
                >
                  + Novo cliente
                </button>
                {form.cliente && (
                  <div className="notice muted-box">
                    <strong>
                      {clientes.find((c) => c.nome === form.cliente)?.razao}
                    </strong>
                    <p>
                      CNPJ{" "}
                      {clientes.find((c) => c.nome === form.cliente)?.documento}
                    </p>
                    <small>
                      {clientes.find((c) => c.nome === form.cliente)?.cidade}
                    </small>
                  </div>
                )}
              </div>
              <div>
                <h3>Informações do orçamento</h3>
                <div className="form-grid">
                  <Field label="Data">
                    <CampoData
                      value={form.data}
                      onChange={(e) => alterar("data", e.target.value)}
                    />
                  </Field>
                  <Field label="Validade">
                    <input
                      placeholder="Ex.: 30 dias"
                      value={form.validade}
                      onChange={(e) => alterar("validade", e.target.value)}
                    />
                  </Field>
                  <Field label="Prazo de execução">
                    <input
                      placeholder="Ex.: 2 semanas"
                      value={form.prazo}
                      onChange={(e) => alterar("prazo", e.target.value)}
                    />
                  </Field>
                  <Field label="Referência">
                    <input
                      value={form.referencia}
                      onChange={(e) => alterar("referencia", e.target.value)}
                      placeholder="Descrição do serviço"
                    />
                  </Field>
                </div>
              </div>
            </div>
          )}
          {etapa === 1 && (
            <div className="wizard-items">
              <div className="card-heading">
                <h3>Itens do orçamento</h3>
                <button
                  className="btn outline"
                  onClick={() => setImportando(true)}
                >
                  Importar CSV / Excel
                </button>
                <button
                  className="btn primary"
                  onClick={() =>
                    alterar("itens", [
                      ...form.itens,
                      {
                        tipo: "Peça",
                        catalogoId: "",
                        descricao: "",
                        quantidade: 1,
                        unidade: "UN",
                        valor: 0,
                        desconto: 0,
                      },
                    ])
                  }
                >
                  <Plus size={16} /> Adicionar item
                </button>
              </div>
              <div className="table-scroll" ref={listaItensRef}>
                <table className="editable-table budget-items-table">
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>
                        Item do catálogo <b className="required-mark">*</b>
                      </th>
                      <th>
                        Qtd. <b className="required-mark">*</b>
                      </th>
                      <th>
                        Un. <b className="required-mark">*</b>
                      </th>
                      <th>
                        Valor unit. <b className="required-mark">*</b>
                      </th>
                      <th>Desconto</th>
                      <th>Total</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {form.itens.map((item, i) => (
                      <tr key={i}>
                        <td data-label="Tipo">
                          <SelectPesquisavel
                            aria-label={`Tipo do item ${i + 1}`}
                            value={item.tipo}
                            onChange={(e) =>
                              setForm((atual) => ({
                                ...atual,
                                itens: atual.itens.map((linha, n) =>
                                  n === i
                                    ? {
                                        ...linha,
                                        tipo: e.target.value,
                                        catalogoId: "",
                                        descricao:
                                          e.target.value === "Mão de obra"
                                            ? "Mão de obra"
                                            : "",
                                        unidade:
                                          e.target.value === "Mão de obra"
                                            ? "Hora"
                                            : "UN",
                                        valor: 0,
                                      }
                                    : linha,
                                ),
                              }))
                            }
                          >
                            <option>Peça</option>
                            <option>Mão de obra</option>
                            <option>Material</option>
                          </SelectPesquisavel>
                        </td>
                        <td data-label="Descrição do item">
                          <Field
                            className="table-field"
                            label={`Item do orçamento ${i + 1} *`}
                          >
                            <SelectPesquisavel
                              aria-label={`Item do orçamento ${i + 1}`}
                              value={item.catalogoId || ""}
                              textValue={item.descricao || ""}
                              placeholder="Selecione ou escreva um item"
                              onChange={(e) =>
                                e.target.value === "__novo__"
                                  ? setNovoItemIndice(i)
                                  : selecionarItem(i, e.target.value)
                              }
                              onTextChange={(descricao) =>
                                setForm((atual) => ({
                                  ...atual,
                                  itens: atual.itens.map((linha, indice) =>
                                    indice === i
                                      ? {
                                          ...linha,
                                          descricao,
                                          catalogoId: "",
                                          descricaoPersonalizada: true,
                                          importado: true,
                                        }
                                      : linha,
                                  ),
                                }))
                              }
                            >
                              <option value="">Selecione um item</option>
                              <option value="__novo__">
                                + Novo item no catálogo
                              </option>
                              {catalogo
                                .filter((c) => c.tipoItem === item.tipo)
                                .map((c) => (
                                  <option key={c.id} value={String(c.id)}>
                                    {c.nome}
                                  </option>
                                ))}
                            </SelectPesquisavel>
                          </Field>
                        </td>
                        <td data-label="Quantidade">
                          <Field
                            className="table-field"
                            label={`Quantidade do item ${i + 1} *`}
                          >
                            <input
                              type="number"
                              inputMode="decimal"
                              min="0.01"
                              step="0.01"
                              aria-label={`Quantidade do item ${i + 1}`}
                              value={item.quantidade}
                              placeholder="Qtd."
                              onChange={(e) =>
                                editarItem(i, "quantidade", e.target.value)
                              }
                            />
                          </Field>
                        </td>
                        <td data-label="Unidade">
                          <Field
                            className="table-field"
                            label={`Unidade do item ${i + 1} *`}
                          >
                            <UnidadeSelect
                              label={`Unidade do item ${i + 1}`}
                              value={item.unidade}
                              onChange={(valor) =>
                                editarItem(i, "unidade", valor)
                              }
                              required
                            />
                          </Field>
                        </td>
                        <td data-label="Valor unitário">
                          <Field
                            className="table-field"
                            label={`Valor unitário do item ${i + 1} *`}
                          >
                            <input
                              type="number"
                              inputMode="decimal"
                              min="0"
                              step=".01"
                              aria-label={`Valor unitário do item ${i + 1}`}
                              value={item.valor}
                              placeholder="0,00"
                              onChange={(e) =>
                                editarItem(i, "valor", e.target.value)
                              }
                            />
                          </Field>
                        </td>
                        <td data-label="Desconto (%)">
                          <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            max="100"
                            aria-label={`Desconto (%) do item ${i + 1}`}
                            value={item.desconto}
                            placeholder="0%"
                            onChange={(e) =>
                              editarItem(i, "desconto", e.target.value)
                            }
                          />
                        </td>
                        <td data-label="Total do item">
                          {moeda(
                            Number(item.quantidade) *
                              Number(item.valor) *
                              (1 - Number(item.desconto) / 100),
                          )}
                        </td>
                        <td data-label="Ações">
                          <button
                            className="quiet-icon"
                            aria-label={`Remover item ${i + 1}`}
                            onClick={() =>
                              alterar(
                                "itens",
                                form.itens.filter((_, n) => n !== i),
                              )
                            }
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {etapa === 2 && (
            <div className="wizard-grid">
              <div>
                <h3>Condições comerciais</h3>
                <div className="form-grid">
                  <Field label="Forma de pagamento">
                    <SelectPesquisavel
                      value={form.pagamento}
                      onChange={(e) => alterar("pagamento", e.target.value)}
                    >
                      <option>Transferência bancária</option>
                      <option>Pix</option>
                      <option>Boleto</option>
                      <option>Cartão</option>
                    </SelectPesquisavel>
                  </Field>
                  <Field label="Condição">
                    <input
                      placeholder="Ex.: 30/60 dias"
                      value={form.condicao}
                      onChange={(e) => alterar("condicao", e.target.value)}
                    />
                  </Field>
                  <Field label="Validade">
                    <input
                      placeholder="Ex.: 15 dias"
                      value={form.validade}
                      onChange={(e) => alterar("validade", e.target.value)}
                    />
                  </Field>
                  <Field label="Prazo de execução">
                    <input
                      placeholder="Ex.: 2 semanas"
                      value={form.prazo}
                      onChange={(e) => alterar("prazo", e.target.value)}
                    />
                  </Field>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={form.exibirAssinatura !== false}
                      onChange={(e) =>
                        alterar("exibirAssinatura", e.target.checked)
                      }
                    />{" "}
                    Incluir campos de assinatura no PDF
                  </label>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={form.exibirPagamento !== false}
                      onChange={(e) =>
                        alterar("exibirPagamento", e.target.checked)
                      }
                    />{" "}
                    Incluir forma de pagamento no PDF
                  </label>
                  <Field label="Observações">
                    <input
                      value={form.observacoes}
                      onChange={(e) => alterar("observacoes", e.target.value)}
                      placeholder="Serviço com garantia de 6 meses."
                    />
                  </Field>
                </div>
              </div>
              <div>
                <div className="summary-box">
                  <h3>Resumo financeiro</h3>
                  <DetailRows
                    rows={[
                      ["Subtotal", moeda(total)],
                      ["Desconto", moeda(0)],
                      ["Acréscimo", moeda(0)],
                      ["Total", <strong>{moeda(total)}</strong>],
                    ]}
                  />
                </div>
                <p className="notice info">
                  Os cálculos finais serão confirmados pelo sistema ao salvar.
                </p>
              </div>
            </div>
          )}
          {etapa === 3 && (
            <>
              <div className="review-grid">
                <div className="summary-box">
                  <h3>Emitente e cliente</h3>
                  <Field label="Empresa emitente">
                    <SelectPesquisavel
                      value={form.empresaId}
                      onChange={(e) => alterar("empresaId", e.target.value)}
                    >
                      <option value="">
                        Dados das configurações da unidade
                      </option>
                      {empresas.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.nomeFantasia || e.razaoSocial}
                        </option>
                      ))}
                    </SelectPesquisavel>
                  </Field>
                  <strong>{form.cliente}</strong>
                  <p>
                    {clientes.find((c) => c.nome === form.cliente)?.documento}
                  </p>
                  <p>{form.referencia}</p>
                </div>
                <div className="summary-box">
                  <h3>Itens ({form.itens.length})</h3>
                  {form.itens.map((i, n) => (
                    <p key={n}>{i.descricao}</p>
                  ))}
                </div>
                <div className="summary-box">
                  <h3>Condições</h3>
                  <p>{form.pagamento}</p>
                  <p>{form.condicao}</p>
                  <p>Validade: {form.validade}</p>
                </div>
              </div>
              <p className="notice success-box">
                Orçamento pronto para envio. A versão será registrada no
                histórico.
              </p>
              <div className="grand-total">Total: {moeda(total)}</div>
            </>
          )}
        </div>
        {modalCliente && (
          <ClienteRapido
            onClose={() => setModalCliente(false)}
            onSave={criarClienteRapido}
          />
        )}
        {novoItemIndice !== null && (
          <ItemRapido
            tipo={form.itens[novoItemIndice]?.tipo || "Peça"}
            onClose={() => setNovoItemIndice(null)}
            onSave={criarItemRapido}
          />
        )}
        {erro && (
          <p className="inline-error" role="alert">
            {erro}
          </p>
        )}
        {importando && (
          <ImportarItens
            orcamento
            onClose={() => setImportando(false)}
            onImport={async (registros) => {
              setForm((atual) => ({
                ...atual,
                itens: [
                  ...atual.itens.filter(
                    (i) => i.descricao?.trim() || i.catalogoId,
                  ),
                  ...registros.map((r) => ({
                    tipo: "Peça",
                    catalogoId: "",
                    codigo: r.codigo,
                    descricao: r.descricao,
                    unidade: r.unidade,
                    quantidade: 1,
                    valor: r.valor,
                    desconto: 0,
                    descricaoPersonalizada: true,
                    importado: true,
                  })),
                ],
              }));
              setToast(
                `${registros.length} itens adicionados. Ajuste as quantidades.`,
              );
            }}
          />
        )}
        <div className="wizard-footer budget-final-bar">
          <button
            className="btn outline"
            onClick={() =>
              etapa === 0 ? navigate("/orcamentos") : setEtapa(etapa - 1)
            }
          >
            ← Voltar
          </button>
          <div className="wizard-footer-actions">
            <div className="budget-bar-total">
              <small>Total do orçamento</small>
              <strong>{moeda(total)}</strong>
            </div>
            <button
              className="btn primary"
              onClick={() =>
                etapa === 3 ? salvarOrcamento("Emitido") : avancar()
              }
            >
              {etapa === 3 ? "Salvar" : "Continuar →"}
            </button>
          </div>
        </div>
      </Card>
    </>
  );
}

export { ContratosPage } from "../funcionalidades/contratos/ListaContratosDemo.jsx";

export function NovoContratoPage() {
  const { orcamentos, contratos, modelosContrato, salvar, setToast } =
    useDados();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const atual = contratos.find((c) => c.id === params.get("id"));
  const bloqueado = atual?.status === "Encerrado";
  const aprovados = orcamentos.filter(
    (o) =>
      o.status === "Aprovado" &&
      !contratos.some(
        (c) => c.id !== atual?.id && String(c.origem) === String(o.id),
      ),
  );
  const [origem, setOrigem] = useState(atual?.origem || aprovados[0]?.id || "");
  const [modelo, setModelo] = useState(
    atual?.modelo ||
      params.get("modelo") ||
      modelosContrato.find((m) => m.status === "PUBLICADO")?.id ||
      "",
  );
  const [inicio, setInicio] = useState(
    atual?.inicioISO || new Date().toISOString().slice(0, 10),
  );
  const [fim, setFim] = useState(atual?.fimISO || "");
  const [objeto, setObjeto] = useState(
    atual?.servico || aprovados[0]?.referencia || "",
  );
  const [clausulas, setClausulas] = useState(atual?.clausulas || "");
  const [rascunhoEditavel, setRascunhoEditavel] = useState(
    atual?.rascunho || "",
  );
  const [previa, setPrevia] = useState(false);
  const [textoAlterado, setTextoAlterado] = useState(false);
  const orcamento = orcamentos.find((o) => Number(o.id) === Number(origem));
  const modeloAtual = modelosContrato.find((m) => m.id === modelo);
  const dadosContrato = {
    "@RazaoSocialCliente": orcamento?.cliente,
    "@NomeFantasiaCliente": orcamento?.cliente,
    "@DocumentoCliente": "12.345.678/0001-90",
    "@EnderecoCliente": "Rua Exemplo, 100",
    "@CidadeCliente": "São Paulo/SP",
    "@TelefoneCliente": "(11) 3456-7890",
    "@EmailCliente": "cliente@example.com",
    "@RepresentanteCliente": "Representante do cliente",
    "@RazaoSocialContratada": "Prestador Exemplo LTDA",
    "@NomeFantasiaContratada": "Prestador Exemplo",
    "@CNPJContratada": "12.345.678/0001-90",
    "@DocumentoContratada": "12.345.678/0001-90",
    "@TipoDocumentoContratada": "CNPJ",
    "@TipoDocumentoCliente": "CNPJ",
    "@EnderecoContratada": "Avenida Exemplo, 200",
    "@CidadeContratada": "São Paulo/SP",
    "@TelefoneContratada": "(11) 3333-2200",
    "@EmailContratada": "prestador@example.com",
    "@RepresentanteContratada": "Representante do prestador",
    "@Orcamento": `Orçamento #${origem}`,
    "@DataOrcamento": orcamento?.data || "30/09/2026",
    "@DescricaoServico": objeto,
    "@ValorOrcamento": moeda(orcamento?.valor || 0),
    "@NumeroContrato": atual?.id || proximoCodigo(contratos, "CT"),
    "@DataInicio": inicio
      ? new Date(inicio + "T12:00:00").toLocaleDateString("pt-BR")
      : "",
    "@DataFim": fim
      ? new Date(fim + "T12:00:00").toLocaleDateString("pt-BR")
      : "",
    "@CondicoesPagamento": "50% na assinatura e 50% na entrega",
    "@FormaPagamento": "Transferência bancária",
    "@ValorEntrada": moeda((orcamento?.valor || 0) / 2),
    "@ValorSaldo": moeda((orcamento?.valor || 0) / 2),
    "@DadosBancarios": "Banco 001 · Ag. 1234 · C/C 000123-4",
    "@PrazoExecucao": "6 meses",
    "@DataAssinatura": new Date().toLocaleDateString("pt-BR"),
  };
  const rascunho = preencherModelo(modeloAtual?.conteudo, dadosContrato);
  useEffect(() => {
    if (!atual && !textoAlterado && rascunho) setRascunhoEditavel(rascunho);
  }, [rascunho, textoAlterado, atual]);
  const confirmarContratoSalvo = useEdicaoProtegida({
    origem,
    modelo,
    inicio,
    fim,
    objeto,
    clausulas,
    conteudo: rascunhoEditavel || rascunho,
  });
  function salvarContrato() {
    if (bloqueado)
      return setToast({
        tipo: "aviso",
        mensagem: "Contrato encerrado não permite edição.",
      });
    if (
      !validarCampos(document.querySelector(".contract-generator")) ||
      !modeloAtual ||
      !inicio ||
      !fim ||
      fim < inicio
    )
      return setToast({
        tipo: "aviso",
        mensagem: "Informe um modelo publicado e um período válido.",
      });
    try {
      validarOrigemContrato(orcamento, contratos, atual?.id);
      const base = atual || {
        id: proximoCodigo(contratos, "CT"),
        status: "Aguardando assinatura",
        ativo: true,
      };
      const atualizado = versionarContrato(base, {
        cliente: orcamento.cliente,
        origem,
        modelo,
        valor: orcamento.valor,
        inicio: new Date(inicio + "T12:00:00").toLocaleDateString("pt-BR"),
        termino: new Date(fim + "T12:00:00").toLocaleDateString("pt-BR"),
        inicioISO: inicio,
        fimISO: fim,
        servico: objeto,
        clausulas,
        rascunho: rascunhoEditavel || rascunho,
      });
      salvar("contratos", atualizado);
      confirmarContratoSalvo();
      setToast("Contrato salvo.");
      navigate("/contratos");
    } catch (e) {
      setToast({ tipo: "aviso", mensagem: e.message });
    }
  }
  return (
    <>
      <PageHeading
        title={atual ? "Editar contrato" : "Novo contrato"}
        subtitle={`Gerado a partir do orçamento aprovado #${origem}.`}
        action={
          <button
            className="btn primary"
            disabled={bloqueado}
            onClick={salvarContrato}
          >
            Salvar contrato
          </button>
        }
      />
      <MobileFlow>
        <div className="contract-editor contract-generator">
          <Card title="Contexto do contrato">
            <div className="form-grid">
              <Field label="Cliente">
                <input
                  readOnly
                  value={orcamento?.cliente || "Cliente Exemplo"}
                />
              </Field>
              <Field label="Origem">
                <SelectPesquisavel
                  value={origem}
                  onChange={(e) => setOrigem(e.target.value)}
                >
                  {aprovados.map((o) => (
                    <option key={o.id} value={o.id}>
                      Orçamento #{o.id} ·{" "}
                      {o.referencia || "Serviço não informado"}
                    </option>
                  ))}
                </SelectPesquisavel>
              </Field>
              <Field label="Modelo de contrato *">
                <SelectPesquisavel
                  value={modelo}
                  onChange={(e) => setModelo(e.target.value)}
                >
                  <option value="">Selecione um modelo</option>
                  {modelosContrato
                    .filter((m) => m.status === "PUBLICADO")
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nome} · versão {m.numeroVersao}
                      </option>
                    ))}
                </SelectPesquisavel>
              </Field>
              <Field label="Vigência">
                <div className="date-pair">
                  <CampoData
                    value={inicio}
                    onChange={(e) => setInicio(e.target.value)}
                  />
                  <CampoData
                    value={fim}
                    onChange={(e) => setFim(e.target.value)}
                  />
                </div>
              </Field>
              <Field label="Objeto">
                <input
                  value={objeto}
                  onChange={(e) => setObjeto(e.target.value)}
                />
              </Field>
              <Field label="Cláusulas adicionais">
                <input
                  value={clausulas}
                  onChange={(e) => setClausulas(e.target.value)}
                />
              </Field>
            </div>
          </Card>
          <Card title="Documento e histórico">
            <DetailRows
              rows={[
                [
                  "Valor total",
                  <strong>{moeda(orcamento?.valor || 0)}</strong>,
                ],
                ["Pagamento", "50% + 50%"],
                ["Prazo", "6 meses"],
              ]}
            />
            <hr />
            {atual && (
              <HistoricoContratoDemo
                contrato={atual}
                onRestaurado={(c) => {
                  setRascunhoEditavel(c.rascunho);
                  confirmarContratoSalvo();
                }}
              />
            )}
            <p className="notice warning">
              Salve as alterações antes de gerar o documento.
            </p>
            <button className="btn primary" onClick={() => setPrevia(true)}>
              Visualizar documento
            </button>
          </Card>
        </div>
        <Card title="Texto do contrato" className="contract-draft-card">
          <p className="muted">
            O texto já recebeu os dados do cliente e orçamento. Ajuste cláusulas
            antes de salvar o documento.
          </p>
          {bloqueado ? (
            <article
              className="contract-preview"
              dangerouslySetInnerHTML={{ __html: rascunhoEditavel || rascunho }}
            />
          ) : (
            <EditorConteudo
              className="contract-draft"
              value={rascunhoEditavel || rascunho}
              onChange={(valor) => {
                setTextoAlterado(true);
                setRascunhoEditavel(valor);
              }}
              label="Texto do contrato"
            />
          )}
        </Card>
      </MobileFlow>
      {previa && (
        <Modal
          title="Prévia do contrato"
          wide
          onClose={() => setPrevia(false)}
          footer={
            <button className="btn primary" onClick={() => setPrevia(false)}>
              Fechar prévia
            </button>
          }
        >
          <article
            className="contract-preview"
            dangerouslySetInnerHTML={{
              __html: preencherModelo(
                rascunhoEditavel || rascunho,
                dadosContrato,
              ),
            }}
          />
        </Modal>
      )}
    </>
  );
}

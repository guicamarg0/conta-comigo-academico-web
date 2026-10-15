import {
  orcamentoDaApi,
  orcamentoParaApi,
  orcamentoParaFormulario,
  statusApi,
} from "./adaptadores.js";
import { gerencia } from "../../permissoes.js";
import { useEdicaoProtegida } from "../../components/EdicaoProtegida.jsx";
import { useRecursosApi } from "../../components/useRecursosApi.js";
import { RecursosFeedback } from "../../components/RecursosFeedback.jsx";
import { validarCampos, destacarCampo } from "../../validacao.js";
import { CampoData } from "../../components/CampoData";
import { BarraFiltros } from "../../components/BarraFiltros";
import { SelectPesquisavel } from "../../components/SelectPesquisavel";
import { nomePdf } from "../../documentos";
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CircleCheck, CircleX, Copy, FileText, Plus, Send } from "lucide-react";
import { api } from "../../api.js";
import { useDados } from "../../context.jsx";
import { ImportarItens } from "../../components/ImportarItens.jsx";
import { moeda } from "../../data.js";
import { clienteDaApi, clienteParaApi, usePaginaApi } from "../../remote.js";
import {
  Badge,
  Card,
  DataTable,
  DetailPanel,
  DetailRows,
  Field,
  PageHeading,
  SelectFilter,
  TextFilter,
  Timeline,
} from "../../components.jsx";
import { ClienteRapido, ItemRapido } from "./CadastrosRapidos.jsx";
import { UnidadeSelect } from "../../components/UnidadeSelect.jsx";

export function OrcamentosConectados() {
  const { setToast, unidade, usuario } = useDados();
  const podeEditar = usuario.perfil !== "CONSULTA";
  const podeDecidir = gerencia("api", usuario);
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("");
  const [clientes, setClientes] = useState([]);
  const [selecionado, setSelecionado] = useState(null);
  const [aba, setAba] = useState("Resumo");
  const [obs, setObs] = useState("");

  const remoto = usePaginaApi(api.listarOrcamentos, {
    ativo: true,
    unidade,
    busca,
    status: statusApi[status] || "",
    tamanho: 12,
  });
  useEffect(() => {
    api
      .todosClientes()
      .then((v) => setClientes(v.map(clienteDaApi)))
      .catch((e) => setToast(e));
  }, [unidade, setToast]);

  const orcamentos = remoto.conteudo.map((o) => orcamentoDaApi(o, clientes));
  useEffect(
    () => setSelecionado(null),
    [remoto.pagina, busca, status, unidade],
  );
  const [acaoPendente, setAcaoPendente] = useState(false);
  const acaoRef = useRef(false);
  async function acao(nome) {
    if (!selecionado || acaoRef.current) return;
    acaoRef.current = true;
    setAcaoPendente(true);
    try {
      const resposta =
        nome === "duplicar"
          ? await api.duplicarOrcamento(selecionado.id)
          : await api.transicionarOrcamento(selecionado.id, nome, obs);
      setSelecionado(orcamentoDaApi(resposta, clientes));
      remoto.recarregar();

      setObs("");
      setToast(
        nome === "emitir"
          ? "Orçamento emitido. O PDF está disponível."
          : "Orçamento atualizado.",
      );
    } catch (e) {
      setToast(e);
    } finally {
      acaoRef.current = false;
      setAcaoPendente(false);
    }
  }
  async function pdf() {
    if (acaoRef.current) return;
    acaoRef.current = true;
    setAcaoPendente(true);
    try {
      const blob = await api.pdfOrcamento(selecionado.id, selecionado.revisao);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = nomePdf(selecionado.numero, selecionado.cliente);
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (e) {
      setToast(e);
    } finally {
      acaoRef.current = false;
      setAcaoPendente(false);
    }
  }
  return (
    <>
      <PageHeading
        title="Orçamentos"
        subtitle={`Propostas da unidade ${unidade}`}
        action={
          podeEditar && (
            <button
              className="btn primary"
              onClick={() => navigate("/orcamentos/novo")}
            >
              <Plus size={17} /> Novo orçamento
            </button>
          )
        }
      />

      <div className="list-detail">
        <div className="list-stack">
          <BarraFiltros className="outside">
            <TextFilter
              value={busca}
              onChange={setBusca}
              placeholder="Buscar número ou cliente..."
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
                "Cancelado",
              ]}
            />
          </BarraFiltros>
          <Card
            title={`${remoto.totalElementos} ${remoto.totalElementos === 1 ? "orçamento encontrado" : "orçamentos encontrados"}`}
          >
            {remoto.erro && (
              <p className="inline-error" role="alert">
                {remoto.erro}
              </p>
            )}
            {remoto.carregando && (
              <p className="muted">Carregando orçamentos...</p>
            )}
            <DataTable
              rows={orcamentos}
              remote={remoto}
              selected={selecionado}
              onSelect={async (item) => {
                setSelecionado(item);
                try {
                  const atualizado = orcamentoDaApi(
                    await api.consultarOrcamento(item.id),
                    clientes,
                  );
                  setSelecionado((atual) =>
                    atual?.id === item.id ? atualizado : atual,
                  );
                } catch (e) {
                  setToast(e);
                }
              }}
              pageSize={12}
              columns={[
                {
                  key: "numero",
                  label: "Nº",
                  render: (o) => <a>{o.numero}</a>,
                },
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
                { key: "referencia", label: "Serviço / referência" },
                { key: "quantidadeItens", label: "Itens" },
                { key: "pagamento", label: "Pagamento" },
                {
                  key: "revisao",
                  label: "Revisão",
                  render: (o) => `Rev. ${o.revisao}`,
                },
                { key: "validade", label: "Validade" },
                { key: "data", label: "Atualizado" },
              ]}
            />
          </Card>
        </div>
        {selecionado && (
          <DetailPanel
            title={`Orçamento #${selecionado.numero}`}
            status={selecionado.status}
            onClose={() => setSelecionado(null)}
            tabs={[
              "Resumo",
              `Itens (${selecionado.itens.length})`,
              "Histórico",
            ]}
            tab={aba}
            setTab={setAba}
            footer={
              <>
                <button className="btn primary full" onClick={pdf}>
                  <FileText size={16} /> Baixar PDF
                </button>
                {podeDecidir && selecionado.status === "Aprovado" && (
                  <button
                    className="btn outline full"
                    onClick={() =>
                      navigate(`/contratos/novo?orcamento=${selecionado.id}`)
                    }
                  >
                    Criar contrato
                  </button>
                )}
                <div className="button-pair">
                  {podeEditar && selecionado.status === "Rascunho" && (
                    <button
                      className="btn outline"
                      onClick={() =>
                        navigate(`/orcamentos/novo?editar=${selecionado.id}`)
                      }
                    >
                      Editar rascunho
                    </button>
                  )}
                  {podeEditar && (
                    <button
                      className="btn outline"
                      disabled={acaoPendente}
                      onClick={() => acao("duplicar")}
                    >
                      <Copy size={16} /> Duplicar
                    </button>
                  )}
                  {podeDecidir && selecionado.status === "Rascunho" && (
                    <button
                      className="btn primary"
                      disabled={acaoPendente}
                      onClick={() => acao("emitir")}
                    >
                      Emitir orçamento
                    </button>
                  )}
                </div>
                {podeDecidir && selecionado.status === "Emitido" && (
                  <>
                    <Field label="Observação da decisão">
                      <input
                        value={obs}
                        onChange={(e) => setObs(e.target.value)}
                      />
                    </Field>
                    <div className="button-pair">
                      <button
                        className="btn success"
                        disabled={acaoPendente}
                        onClick={() => acao("aprovar")}
                      >
                        Aprovar
                      </button>
                      <button
                        className="btn danger-outline"
                        disabled={acaoPendente}
                        onClick={() => acao("recusar")}
                      >
                        Recusar
                      </button>
                    </div>
                  </>
                )}
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
              <DetailRows
                rows={[
                  ["Cliente", selecionado.cliente],
                  ["Referência", selecionado.referencia],
                  ["Subtotal", moeda(selecionado.subtotal)],
                  ["Desconto aplicado", `− ${moeda(selecionado.descontoTotal)}`],
                  ["Valor total", moeda(selecionado.valor)],
                  ["Status", <Badge>{selecionado.status}</Badge>],
                  ["Validade", selecionado.validade],
                  ["Revisão", `Rev. ${selecionado.revisao}`],
                ]}
              />
            ) : aba.startsWith("Itens") ? (
              <div className="item-summary">
                {selecionado.itens.map((i, n) => (
                  <div key={n}>
                    <span>
                      <strong>{i.descricao}</strong>
                      <small>
                        {i.tipo} · {i.quantidade} × {moeda(i.valor)}
                      </small>
                    </span>
                    <b>{moeda(i.total)}</b>
                  </div>
                ))}
              </div>
            ) : (
              <Timeline events={selecionado.historico} />
            )}
          </DetailPanel>
        )}
      </div>
    </>
  );
}

const itemInicial = {
  tipo: "Peça",
  catalogoId: "",
  descricao: "",
  quantidade: 1,
  unidade: "UN",
  valor: 0,
};
export function NovoOrcamentoConectado() {
  const { setToast, unidade, usuario } = useDados();
  const podeEmitir = gerencia("api", usuario);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editarId = params.get("editar");
  const [clientes, setClientes] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [formasRecebimento, setFormasRecebimento] = useState([]);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [criadoId, setCriadoId] = useState(null);
  const [carregandoEdicao, setCarregandoEdicao] = useState(Boolean(editarId));
  const [modalCliente, setModalCliente] = useState(false);
  const [novoItemIndice, setNovoItemIndice] = useState(null);
  const [etapa, setEtapa] = useState(0);
  const [importando, setImportando] = useState(false);
  const listaItensRef = useRef(null);
  const conteudoRef = useRef(null);
  useEffect(() => {
    if (window.matchMedia("(max-width:720px)").matches) {
      if (window.scrollY > 0)
        conteudoRef.current
          ?.closest(".wizard")
          ?.scrollIntoView({ block: "start" });
    } else conteudoRef.current?.scrollTo({ top: 0 });
  }, [etapa]);
  const [form, setForm] = useState({
    cliente: "",
    empresaId: "",
    referencia: "",
    data: new Date().toISOString().slice(0, 10),
    validade: "30 dias",
    pagamento: "",
    condicao: "",
    observacoes: "",
    descontoTipo: "VALOR",
    descontoValor: 0,
    itens: [{ ...itemInicial }],
  });
  const quantidadeAnterior = useRef(form.itens.length);
  const base = useRecursosApi(
    {
      clientes: () => api.todosClientes(),
      catalogo: () => api.todoCatalogo(),
      pagamentos: () => api.listarFormasRecebimento(),
      empresas: () => api.listarEmpresas(),
    },
    unidade,
  );
  const carregandoBase = Object.values(base.recursos).some((r) => r.carregando);
  const confirmarSalvo = useEdicaoProtegida(
    form,
    !carregandoBase && !carregandoEdicao,
  );
  useEffect(() => {
    const d = base.recursos.clientes.dados;
    if (d) setClientes(d.map(clienteDaApi).filter((c) => c.status === "Ativo"));
  }, [base.recursos.clientes.dados]);
  useEffect(() => {
    const d = base.recursos.catalogo.dados;
    if (d) setCatalogo(d.filter((i) => i.ativo));
  }, [base.recursos.catalogo.dados]);
  useEffect(() => {
    const d = base.recursos.empresas.dados;
    if (d) setEmpresas(d.filter((i) => i.ativo));
  }, [base.recursos.empresas.dados]);
  useEffect(() => {
    const d = base.recursos.pagamentos.dados;
    if (d) setFormasRecebimento(d);
  }, [base.recursos.pagamentos.dados]);

  useEffect(() => {
    if (!editarId) return;
    let ativo = true;
    setCarregandoEdicao(true);
    setCriadoId(null);
    api
      .consultarOrcamento(editarId)
      .then((orcamento) => {
        if (!ativo) return;
        if (orcamento.status !== "RASCUNHO")
          throw new Error("Somente rascunhos podem ser editados.");
        setForm((atual) => ({
          ...atual,
          ...orcamentoParaFormulario(orcamento),
        }));
        setCriadoId(orcamento.id);
        setCarregandoEdicao(false);
      })
      .catch((falha) => {
        if (ativo) {
          setErro(falha.message);
          setCarregandoEdicao(false);
        }
      });
    return () => {
      ativo = false;
    };
  }, [editarId, unidade]);
  const subtotal = Math.round(
    form.itens.reduce(
      (s, i) => s + Number(i.quantidade || 0) * Number(i.valor || 0),
      0,
    ) * 100,
  ) / 100;
  const valorDesconto = Number(form.descontoValor) || 0;
  const brutoDesconto =
    form.descontoTipo === "PERCENTUAL"
      ? (subtotal * Math.min(valorDesconto, 100)) / 100
      : valorDesconto;
  const descontoCalculado = Math.round(brutoDesconto * 100) / 100;
  const descontoAplicado = Math.min(subtotal, descontoCalculado);
  const total = Math.max(0, Math.round((subtotal - descontoAplicado) * 100) / 100);
  const descontoInvalido =
    (form.descontoTipo === "PERCENTUAL" && valorDesconto > 100) ||
    descontoCalculado > subtotal;
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
  const alterar = (chave, valor) => setForm((v) => ({ ...v, [chave]: valor }));
  const editarItem = (n, chave, valor) =>
    setForm((v) => ({
      ...v,
      itens: v.itens.map((i, k) => (k === n ? { ...i, [chave]: valor } : i)),
    }));
  const escolherCatalogo = (indice, id) => {
    const item = catalogo.find((c) => c.id === id);
    if (!item) return;
    setForm((atual) => ({
      ...atual,
      itens: atual.itens.map((linha, n) =>
        n === indice
          ? {
              ...linha,
              catalogoId: item.id,
              importado: false,
              codigo: "",
              descricao: item.nome,
              descricaoPersonalizada: false,
              unidade:
                {
                  UNIDADE: "UN",
                  HORA: "Hora",
                  DIARIA: "Diária",
                  METRO: "MT",
                  QUILOGRAMA: "KG",
                  LITRO: "LT",
                }[item.unidadeMedida] ||
                item.unidadeMedidaPersonalizada ||
                "UN",
              valor: Number(item.valorPadrao),
            }
          : linha,
      ),
    }));
  };
  async function criarClienteRapido(dados) {
    const novo = clienteDaApi(await api.criarCliente(clienteParaApi(dados)));
    setClientes((atual) => [...atual, novo]);
    alterar("cliente", novo.id);
    setToast("Cliente cadastrado e selecionado.");
  }
  async function criarItemRapido(dados) {
    const tipo = {
      Peça: "PECA",
      "Mão de obra": "MAO_DE_OBRA",
      Material: "MATERIAL",
    }[dados.tipo];
    const medida =
      {
        UN: "UNIDADE",
        Hora: "HORA",
        Diária: "DIARIA",
        MT: "METRO",
        KG: "QUILOGRAMA",
        LT: "LITRO",
      }[dados.unidade] || "OUTRA";
    const novo = await api.criarItem({
      tipo,
      nome: dados.nome.trim(),
      codigoReferencia: dados.codigo.trim() || null,
      descricao: null,
      unidadeMedida: medida,
      unidadeMedidaPersonalizada:
        medida === "OUTRA" ? dados.unidade.trim() : null,
      valorPadrao: Number(dados.valor),
    });
    setCatalogo((atual) => [...atual, novo]);
    setForm((atual) => ({
      ...atual,
      itens: atual.itens.map((linha, n) =>
        n === novoItemIndice
          ? {
              ...linha,
              catalogoId: novo.id,
              descricao: novo.nome,
              descricaoPersonalizada: false,
              unidade: dados.unidade,
              valor: Number(novo.valorPadrao),
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
      destacarCampo("Buscar cliente", "Selecione um cliente.");
      return setErro("Selecione um cliente.");
    }
    if (
      etapa === 1 &&
      (!form.itens.length ||
        form.itens.some(
          (i) =>
            !i.descricao.trim() ||
            Number(i.quantidade) <= 0 ||
            !i.unidade ||
            i.valor === "" ||
            Number(i.valor) < 0,
        ))
    )
      return setErro(
        "Preencha descrição, quantidade, unidade e valor dos itens.",
      );
    if (etapa === 2 && descontoInvalido)
      return setErro(
        form.descontoTipo === "PERCENTUAL" && valorDesconto > 100
          ? "O desconto percentual não pode ser maior que 100%."
          : "O desconto não pode deixar o total do orçamento negativo.",
      );
    setErro("");
    setEtapa(Math.min(3, etapa + 1));
  }
  async function salvar(emitir) {
    if (salvando) return;
    if (!validarCampos(conteudoRef.current))
      return setErro("Confira os campos destacados.");
    if (editarId && !criadoId)
      return setErro("Não foi possível carregar o rascunho para edição.");
    setErro("");
    setSalvando(true);
    try {
      const dados = orcamentoParaApi(form, clientes, catalogo);
      const id = criadoId
        ? (await api.atualizarOrcamento(criadoId, dados)).id
        : (await api.criarOrcamento(dados)).id;
      setCriadoId(id);
      confirmarSalvo();
      if (emitir) {
        try {
          await api.transicionarOrcamento(id, "emitir");
        } catch (e) {
          setToast({
            tipo: "aviso",
            mensagem:
              "Os dados foram salvos, mas não foi possível finalizar o orçamento. Tente Salvar novamente.",
          });
          throw e;
        }
      }
      setToast(
        emitir
          ? "Orçamento salvo. O PDF está disponível."
          : "Orçamento salvo.",
      );
      navigate("/orcamentos");
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  }
  return (
    <>
      <PageHeading
        title={editarId ? "Editar orçamento" : "Novo orçamento"}
        subtitle={`Criação guiada · ${unidade}`}
      />
      <RecursosFeedback
        {...base}
        rotulos={{
          clientes: "clientes",
          catalogo: "catálogo",
          pagamentos: "formas de pagamento",
          empresas: "empresas",
        }}
      />
      <Card className="wizard">
        {carregandoEdicao && <p className="muted">Carregando rascunho...</p>}
        <div className="wizard-steps">
          {["Cliente", "Itens", "Condições", "Revisar"].map((nome, i) => (
            <button
              key={nome}
              aria-current={etapa === i ? "step" : undefined}
              disabled={i > etapa}
              className={etapa === i ? "current" : i < etapa ? "done" : ""}
              onClick={() => i <= etapa && setEtapa(i)}
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
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
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
                      {clientes.find((c) => c.id === form.cliente)?.razao}
                    </strong>
                    <p>
                      Documento:{" "}
                      {clientes.find((c) => c.id === form.cliente)?.documento}
                    </p>
                    <small>
                      {clientes.find((c) => c.id === form.cliente)?.email ||
                        clientes.find((c) => c.id === form.cliente)?.telefone}
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
                  <Field label="Referência">
                    <input
                      placeholder="Ex.: Recuperação de mandrins"
                      value={form.referencia}
                      onChange={(e) => alterar("referencia", e.target.value)}
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
                    alterar("itens", [...form.itens, { ...itemInicial }])
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
                      <th>Total</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {form.itens.map((i, n) => (
                      <tr key={n}>
                        <td data-label="Tipo">
                          <SelectPesquisavel
                            aria-label={`Tipo do item ${n + 1}`}
                            value={i.tipo}
                            onChange={(e) =>
                              setForm((atual) => ({
                                ...atual,
                                itens: atual.itens.map((linha, k) =>
                                  k === n
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
                            {["Peça", "Mão de obra", "Material"].map((t) => (
                              <option key={t}>{t}</option>
                            ))}
                          </SelectPesquisavel>
                        </td>
                        <td data-label="Descrição do item">
                          <Field
                            className="table-field"
                            label={`Item do orçamento ${n + 1} *`}
                          >
                            <SelectPesquisavel
                              aria-label={`Item do orçamento ${n + 1}`}
                              value={i.catalogoId || ""}
                              textValue={i.descricao || ""}
                              placeholder="Selecione ou escreva um item"
                              onChange={(e) =>
                                e.target.value === "__novo__"
                                  ? setNovoItemIndice(n)
                                  : escolherCatalogo(n, e.target.value)
                              }
                              onTextChange={(descricao) =>
                                setForm((atual) => ({
                                  ...atual,
                                  itens: atual.itens.map((linha, indice) =>
                                    indice === n
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
                                .filter(
                                  (c) =>
                                    c.tipo ===
                                    {
                                      Peça: "PECA",
                                      Material: "MATERIAL",
                                      "Mão de obra": "MAO_DE_OBRA",
                                    }[i.tipo],
                                )
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
                            label={`Quantidade do item ${n + 1} *`}
                          >
                            <input
                              type="number"
                              inputMode="decimal"
                              min="0.01"
                              step="0.01"
                              aria-label={`Quantidade do item ${n + 1}`}
                              value={i.quantidade}
                              placeholder="Qtd."
                              onChange={(e) =>
                                editarItem(n, "quantidade", e.target.value)
                              }
                            />
                          </Field>
                        </td>
                        <td data-label="Unidade">
                          <Field
                            className="table-field"
                            label={`Unidade do item ${n + 1} *`}
                          >
                            <UnidadeSelect
                              label={`Unidade do item ${n + 1}`}
                              value={i.unidade}
                              onChange={(valor) =>
                                editarItem(n, "unidade", valor)
                              }
                              required
                            />
                          </Field>
                        </td>
                        <td data-label="Valor unitário">
                          <Field
                            className="table-field"
                            label={`Valor unitário do item ${n + 1} *`}
                          >
                            <input
                              type="number"
                              inputMode="decimal"
                              min="0"
                              step="0.01"
                              aria-label={`Valor unitário do item ${n + 1}`}
                              value={i.valor}
                              placeholder="0,00"
                              onChange={(e) =>
                                editarItem(n, "valor", e.target.value)
                              }
                            />
                          </Field>
                        </td>
                        <td data-label="Total do item">
                          {moeda(Number(i.quantidade) * Number(i.valor))}
                        </td>
                        <td data-label="Ações">
                          <button
                            className="quiet-icon"
                            aria-label={`Remover item ${n + 1}`}
                            onClick={() =>
                              alterar(
                                "itens",
                                form.itens.filter((_, k) => k !== n),
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
                  <Field label="Tipo de desconto geral">
                    <select
                      value={form.descontoTipo}
                      onChange={(e) => alterar("descontoTipo", e.target.value)}
                    >
                      <option value="VALOR">Valor fixo (R$)</option>
                      <option value="PERCENTUAL">Percentual (%)</option>
                    </select>
                  </Field>
                  <Field label="Desconto geral">
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      max={form.descontoTipo === "PERCENTUAL" ? "100" : undefined}
                      step="0.01"
                      value={form.descontoValor}
                      onChange={(e) => alterar("descontoValor", e.target.value)}
                    />
                  </Field>
                  <Field label="Forma de pagamento">
                    <SelectPesquisavel
                      value={form.pagamento}
                      onChange={(e) => alterar("pagamento", e.target.value)}
                    >
                      <option value="">Selecione uma forma</option>
                      {formasRecebimento.map((forma) => (
                        <option key={forma.id} value={forma.nomeExibicao}>
                          {forma.nomeExibicao}
                        </option>
                      ))}
                    </SelectPesquisavel>
                  </Field>
                  {form.pagamento && (
                    <p className="notice info">
                      {
                        formasRecebimento.find(
                          (f) => f.nomeExibicao === form.pagamento,
                        )?.instrucoes
                      }
                    </p>
                  )}
                  <Field label="Condição">
                    <input
                      placeholder="Ex.: 30/60 dias"
                      value={form.condicao}
                      onChange={(e) => alterar("condicao", e.target.value)}
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
                      placeholder="Ex.: Serviço com garantia de 6 meses"
                      value={form.observacoes}
                      onChange={(e) => alterar("observacoes", e.target.value)}
                    />
                  </Field>
                </div>
              </div>
              <Card title="Resumo financeiro">
                <DetailRows
                  rows={[
                    ["Subtotal", moeda(subtotal)],
                    ["Desconto aplicado", `− ${moeda(descontoAplicado)}`],
                    ["Total", moeda(total)],
                  ]}
                />
                {descontoInvalido && (
                  <p className="inline-error" role="alert">
                    {form.descontoTipo === "PERCENTUAL" && valorDesconto > 100
                      ? "O desconto percentual não pode ser maior que 100%."
                      : "O desconto não pode deixar o total do orçamento negativo."}
                  </p>
                )}
              </Card>
            </div>
          )}
          {etapa === 3 && (
            <>
              <div className="wizard-grid">
                <Card title="Emitente">
                  {empresas.find((e) => e.id === form.empresaId)?.razaoSocial ||
                    "Dados das configurações da unidade"}
                </Card>
                <Card title="Cliente">
                  {clientes.find((c) => c.id === form.cliente)?.nome}
                </Card>
                <Card title={`Itens (${form.itens.length})`}>
                  {form.itens.map((i, n) => (
                    <p key={n}>
                      {i.descricao} · {i.quantidade} × {moeda(i.valor)}
                    </p>
                  ))}
                </Card>
                <Card title="Condições">
                  {form.pagamento} · {form.condicao}
                </Card>
              </div>
              <p className="notice info">
                O orçamento será emitido pela API e poderá ser baixado em PDF
                após salvar.
              </p>
              <DetailRows
                rows={[
                  ["Subtotal", moeda(subtotal)],
                  ["Desconto aplicado", `− ${moeda(descontoAplicado)}`],
                  ["Total", <strong>{moeda(total)}</strong>],
                ]}
              />
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
              etapa ? setEtapa(etapa - 1) : navigate("/orcamentos")
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
              disabled={
                salvando ||
                carregandoBase ||
                Boolean(editarId && !criadoId) ||
                (etapa === 3 && descontoInvalido)
              }
              onClick={() => (etapa === 3 ? salvar(podeEmitir) : avancar())}
            >
              {salvando ? "Salvando..." : etapa === 3 ? "Salvar" : "Continuar →"}
            </button>
          </div>
        </div>
      </Card>
    </>
  );
}

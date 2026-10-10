import { useEdicaoProtegida } from "../components/EdicaoProtegida.jsx";
import { HistoricoContrato } from "../funcionalidades/contratos/HistoricoContrato.jsx";
import { useRecursosApi } from "../components/useRecursosApi.js";
import { RecursosFeedback } from "../components/RecursosFeedback.jsx";
import { validarCampos } from "../validacao.js";
import { BarraFiltros } from "../components/BarraFiltros";
import { SelectPesquisavel } from "../components/SelectPesquisavel";
import { nomePdf } from "../documentos";
import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FileText } from "lucide-react";
import { api } from "../api.js";
import { useDados } from "../context.jsx";
import { EditorConteudo } from "./contractTemplates.jsx";
import { moeda } from "../data.js";
import { usePaginaApi } from "../remote.js";
import {
  Badge,
  Card,
  DataTable,
  DetailPanel,
  DetailRows,
  Field,
  Modal,
  PageHeading,
  SelectFilter,
  TextFilter,
} from "../components.jsx";
const statusContrato = {
  AGUARDANDO_ASSINATURA: "Aguardando assinatura",
  VIGENTE: "Vigente",
  ENCERRADO: "Encerrado",
};
const hoje = () => {
  const agora = new Date();
  return new Date(agora.getTime() - agora.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
};
function baixar(blob, nome) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export function ContratosConectados() {
  const { usuario, unidade, setToast } = useDados();
  const podeEditar = usuario.perfil !== "CONSULTA";
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("");
  const [cadastro, setCadastro] = useState("ATIVO");
  const [confirmacao, setConfirmacao] = useState(null);
  const [executando, setExecutando] = useState(false);
  const [selecionado, setSelecionado] = useState(null);
  const [aba, setAba] = useState("Visão geral");
  const [erro, setErro] = useState("");
  const remoto = usePaginaApi(api.listarContratos, {
    ativo: true,
    unidade,
    busca,
    status,
    cadastro,
    tamanho: 12,
  });
  useEffect(
    () => setSelecionado(null),
    [busca, status, cadastro, remoto.pagina, unidade],
  );
  async function selecionar(item) {
    setSelecionado(item);
    setErro("");
    try {
      const atualizado = await api.consultarContrato(item.id);
      setSelecionado((atual) => (atual?.id === item.id ? atualizado : atual));
    } catch (e) {
      setErro(e.message);
    }
  }
  async function pdf() {
    try {
      baixar(
        await api.pdfContrato(selecionado.id),
        nomePdf(selecionado.numero, selecionado.cliente),
      );
    } catch (e) {
      setErro(e.message);
    }
  }
  async function executar(acao) {
    if (executando || !selecionado) return;
    const operacoes = {
      vigente: api.marcarContratoVigente,
      encerrar: api.encerrarContrato,
      inativar: api.inativarContrato,
      reativar: api.reativarContrato,
    };
    setExecutando(true);
    setErro("");
    try {
      const atualizado = await operacoes[acao](selecionado.id);
      setSelecionado(atualizado);
      setConfirmacao(null);
      remoto.recarregar();
      setToast("Contrato atualizado.");
    } catch (e) {
      setErro(e.message);
    } finally {
      setExecutando(false);
    }
  }
  return (
    <div className="contracts-page">
      <div className="contracts-left">
        <PageHeading
          title="Contratos"
          subtitle={`Gere, edite e baixe documentos da unidade ${unidade}`}
          action={
            podeEditar && (
              <button
                className="btn primary"
                onClick={() => navigate("/contratos/novo")}
              >
                <FileText size={16} /> Gerar contrato
              </button>
            )
          }
        />
        <Card className="filter-card">
          <BarraFiltros className="" padroes={{ Cadastro: "ATIVO" }}>
            <TextFilter
              value={busca}
              onChange={setBusca}
              placeholder="Número, cliente ou empresa..."
            />
            <SelectFilter
              label="Situação"
              value={status}
              onChange={setStatus}
              options={[
                "Todos",
                ...Object.entries(statusContrato).map(([value, label]) => ({
                  value,
                  label,
                })),
              ]}
            />
            <SelectFilter
              label="Cadastro"
              value={cadastro}
              onChange={setCadastro}
              options={[
                { value: "ATIVO", label: "Ativos" },
                { value: "INATIVO", label: "Inativos" },
                { value: "TODOS", label: "Todos" },
              ]}
            />
          </BarraFiltros>
        </Card>
        <Card
          title="Lista de contratos"
          action={<small>{remoto.totalElementos} contratos</small>}
        >
          <DataTable
            rows={remoto.conteudo}
            remote={remoto}
            pageSize={12}
            selected={selecionado}
            onSelect={selecionar}
            columns={[
              { key: "numero", label: "Contrato" },
              { key: "cliente", label: "Contratante" },
              {
                key: "empresaContratada",
                label: "Empresa contratada",
                render: (c) => c.empresaContratada || "Não informada",
              },
              { key: "numeroOrcamento", label: "Orçamento" },
              { key: "modelo", label: "Modelo" },
              {
                key: "valorTotal",
                label: "Valor",
                render: (c) => moeda(c.valorTotal),
              },
              {
                key: "numeroVersao",
                label: "Versão",
                render: (c) => `v${c.numeroVersao}`,
              },
              {
                key: "status",
                label: "Situação",
                render: (c) => <Badge>{statusContrato[c.status]}</Badge>,
              },
              {
                key: "ativo",
                label: "Cadastro",
                render: (c) => <Badge>{c.ativo ? "Ativo" : "Inativo"}</Badge>,
              },
            ]}
          />
        </Card>
      </div>
      {selecionado && (
        <DetailPanel
          title={selecionado.numero}
          status={statusContrato[selecionado.status]}
          onClose={() => setSelecionado(null)}
          tabs={["Visão geral", "Documento"]}
          tab={aba}
          setTab={setAba}
          footer={
            <>
              <button className="btn primary full" onClick={pdf}>
                Baixar PDF
              </button>
              {podeEditar &&
                ["VIGENTE", "AGUARDANDO_ASSINATURA"].includes(
                  selecionado.status,
                ) && (
                  <button
                    className="btn outline full"
                    onClick={() =>
                      navigate(`/contratos/novo?id=${selecionado.id}`)
                    }
                  >
                    Editar contrato
                  </button>
                )}
              {podeEditar && selecionado.status === "AGUARDANDO_ASSINATURA" && (
                <button
                  className="btn outline full"
                  disabled={executando}
                  onClick={() => executar("vigente")}
                >
                  Marcar como vigente
                </button>
              )}
              {podeEditar && selecionado.status === "VIGENTE" && (
                <button
                  className="btn outline full"
                  disabled={executando}
                  onClick={() => setConfirmacao("encerrar")}
                >
                  Encerrar contrato
                </button>
              )}
              {podeEditar && (
                <button
                  className="btn outline full"
                  disabled={executando}
                  onClick={() =>
                    selecionado.ativo
                      ? setConfirmacao("inativar")
                      : executar("reativar")
                  }
                >
                  {selecionado.ativo
                    ? "Inativar cadastro"
                    : "Reativar cadastro"}
                </button>
              )}
              <HistoricoContrato
                key={selecionado.id}
                contrato={selecionado}
                podeEditar={podeEditar}
                onRestaurado={(c) => {
                  setSelecionado(c);
                  remoto.recarregar();
                }}
              />
            </>
          }
        >
          {aba === "Visão geral" ? (
            <DetailRows
              rows={[
                ["Contratante", selecionado.cliente],
                [
                  "Empresa contratada",
                  selecionado.empresaContratada || "Não informada",
                ],
                ["Orçamento", selecionado.numeroOrcamento],
                ["Valor", moeda(selecionado.valorTotal)],
                ["Modelo", selecionado.modelo],
                ["Versão", selecionado.numeroVersao],
                ["Cadastro", selecionado.ativo ? "Ativo" : "Inativo"],
                ["Pagamento", selecionado.condicoesPagamento || "—"],
              ]}
            />
          ) : (
            <article
              className="contract-preview"
              dangerouslySetInnerHTML={{
                __html: selecionado.conteudoRascunho || "<p>Sem conteúdo.</p>",
              }}
            />
          )}
          {erro && (
            <p className="inline-error" role="alert">
              {erro}
            </p>
          )}
        </DetailPanel>
      )}
      {confirmacao && (
        <Modal
          title={
            confirmacao === "encerrar"
              ? "Encerrar contrato?"
              : "Inativar cadastro?"
          }
          proteger={false}
          onClose={() => !executando && setConfirmacao(null)}
          footer={
            <>
              <button
                className="btn outline"
                disabled={executando}
                onClick={() => setConfirmacao(null)}
              >
                Cancelar
              </button>
              <button
                className="btn primary"
                disabled={executando}
                onClick={() => executar(confirmacao)}
              >
                {executando ? "Salvando..." : "Confirmar"}
              </button>
            </>
          }
        >
          <p>
            {confirmacao === "encerrar"
              ? "O contrato continuará disponível para consulta e PDF, mas não poderá ser editado ou restaurado."
              : "A situação será mantida. O contrato continuará disponível no filtro Inativos e poderá ser editado se não estiver encerrado."}
          </p>
          {erro && (
            <p className="inline-error" role="alert">
              {erro}
            </p>
          )}
        </Modal>
      )}
    </div>
  );
}
export function NovoContratoConectado() {
  const { unidade, setToast, usuario } = useDados();
  const navigate = useNavigate();
  const [parametros] = useSearchParams();
  const id = parametros.get("id");
  const origemInicial = parametros.get("orcamento") || "";
  const [orcamentos, setOrcamentos] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [form, setForm] = useState({
    orcamentoId: origemInicial,
    modelo: "Prestação de serviços",
    modeloContratoId: parametros.get("modelo") || "",
    objeto: "",
    clausulasAdicionais: "",
    conteudoRascunho: "",
    empresaId: "",
    inicioVigencia: hoje(),
    fimVigencia: "",
  });
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [editorAberto, setEditorAberto] = useState(false);
  const [previaAberta, setPreviaAberta] = useState(false);
  const [conteudoPrevia, setConteudoPrevia] = useState("");
  const [conteudoEdicao, setConteudoEdicao] = useState("");
  const [carregandoPrevia, setCarregandoPrevia] = useState(false);
  const base = useRecursosApi(
    {
      orcamentos: () => api.todosOrcamentos("APROVADO"),
      contrato: () => (id ? api.consultarContrato(id) : Promise.resolve(null)),
      modelos: () => api.listarModelosContrato({ status: "PUBLICADO" }),
      empresas: () => api.listarEmpresas(),
    },
    `${unidade}.${id || ""}`,
  );
  const confirmarSalvo = useEdicaoProtegida(
    form,
    !base.recursos.contrato.carregando,
  );
  useEffect(() => {
    const d = base.recursos.orcamentos.dados;
    if (d) setOrcamentos(d);
  }, [base.recursos.orcamentos.dados]);
  useEffect(() => {
    const d = base.recursos.modelos.dados;
    if (d) setModelos(d.conteudo);
  }, [base.recursos.modelos.dados]);
  useEffect(() => {
    const d = base.recursos.empresas.dados;
    if (d) setEmpresas(d.filter((e) => e.ativo));
  }, [base.recursos.empresas.dados]);
  useEffect(() => {
    const atual = base.recursos.contrato.dados;
    if (atual) {
      const novo = {
        orcamentoId: atual.orcamentoId,
        modelo: atual.modelo,
        modeloContratoId: atual.modeloContratoId || "",
        objeto: atual.objeto,
        clausulasAdicionais: atual.clausulasAdicionais || "",
        conteudoRascunho: atual.conteudoRascunho || "",
        empresaId: atual.empresaId || "",
        inicioVigencia: atual.inicioVigencia,
        fimVigencia: atual.fimVigencia,
      };
      setForm(novo);
      confirmarSalvo(novo);
    }
  }, [base.recursos.contrato.dados, confirmarSalvo]);
  const encerrado = base.recursos.contrato.dados?.status === "ENCERRADO";
  const bloqueado =
    encerrado ||
    Object.entries(base.recursos).some(
      ([nome, r]) => nome !== "historico" && (r.carregando || r.erro),
    );

  const editar = (chave, valor) =>
    setForm((atual) => ({ ...atual, [chave]: valor }));
  const orcamento = orcamentos.find((o) => o.id === form.orcamentoId);
  async function abrirPrevia({ abrirEditor = false, conteudo } = {}) {
    if (carregandoPrevia || bloqueado) return;
    if (!validarCampos(document.querySelector(".contract-editor")))
      return setErro("Confira os campos destacados.");
    if (!form.orcamentoId || !form.modeloContratoId || !form.empresaId) {
      setErro(
        "Selecione o orçamento, a empresa contratada e o modelo de contrato.",
      );
      return;
    }
    setCarregandoPrevia(true);
    setErro("");
    try {
      const resposta = await api.previaContrato({
        orcamentoId: form.orcamentoId,
        modeloContratoId: form.modeloContratoId,
        empresaId: form.empresaId,
        conteudoRascunho: (conteudo ?? form.conteudoRascunho) || null,
      });
      setConteudoPrevia(resposta.conteudo + (resposta.assinaturasHtml || ""));
      if (abrirEditor) {
        setConteudoEdicao(form.conteudoRascunho || resposta.conteudo);
        setEditorAberto(true);
      } else setPreviaAberta(true);
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregandoPrevia(false);
    }
  }
  async function salvar() {
    if (salvando || bloqueado) return;
    if (!validarCampos(document.querySelector(".contract-editor")))
      return setErro("Confira os campos destacados.");
    if (!form.orcamentoId || !form.modeloContratoId || !form.empresaId)
      return setErro(
        "Selecione o orçamento, a empresa contratada e o modelo de contrato.",
      );
    setSalvando(true);
    setErro("");
    try {
      const dados = {
        ...form,
        modelo: form.modelo || "Contrato",
        // Mantidos como compatibilidade para a API durante a migração do fluxo.
        objeto: form.objeto?.trim() || "Conforme conteúdo do contrato.",
        clausulasAdicionais: null,
        inicioVigencia: form.inicioVigencia || hoje(),
        fimVigencia: form.fimVigencia || hoje(),
      };
      const contrato = id
        ? await api.atualizarContrato(id, dados)
        : await api.criarContrato(dados);
      confirmarSalvo();
      setToast("Contrato salvo. O PDF está disponível na lista de contratos.");
      navigate("/contratos");
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  }
  return (
    <>
      <PageHeading
        title={id ? "Editar contrato" : "Novo contrato"}
        subtitle={`A partir de um orçamento aprovado · ${unidade}`}
      />
      <RecursosFeedback
        {...base}
        rotulos={{
          orcamentos: "orçamentos aprovados",
          contrato: "contrato",
          modelos: "modelos publicados",
          empresas: "empresas",
          historico: "histórico",
        }}
      />
      <div className="contract-editor" aria-busy={salvando}>
        {encerrado && (
          <p className="notice warning">
            Contrato encerrado: disponível somente para consulta.
          </p>
        )}
        <Card title="Dados do contrato">
          <div className="form-grid">
            <Field label="Orçamento aprovado *">
              <SelectPesquisavel
                value={form.orcamentoId}
                disabled={!!id}
                onChange={(e) => editar("orcamentoId", e.target.value)}
              >
                <option value="">Selecione</option>
                {orcamentos.map((o) => (
                  <option key={o.id} value={o.id}>
                    Orçamento #{o.numero} ·{" "}
                    {o.revisaoAtualDetalhe?.cliente || "Cliente"} ·{" "}
                    {o.revisaoAtualDetalhe?.itens?.[0]?.descricao ||
                      o.referencia ||
                      "Serviço não informado"}
                  </option>
                ))}
                {id && form.orcamentoId && !orcamento && (
                  <option value={form.orcamentoId}>Orçamento vinculado</option>
                )}
              </SelectPesquisavel>
            </Field>
            <Field label="Modelo de contrato *">
              <SelectPesquisavel
                value={form.modeloContratoId}
                onChange={(e) => {
                  const escolhido = modelos.find(
                    (m) => m.id === e.target.value,
                  );
                  setForm((atual) => ({
                    ...atual,
                    modeloContratoId: e.target.value,
                    modelo: escolhido?.nome || atual.modelo,
                    conteudoRascunho: "",
                  }));
                }}
              >
                <option value="">Selecione um modelo</option>
                {modelos.map((modelo) => (
                  <option key={modelo.id} value={modelo.id}>
                    {modelo.nome} · versão {modelo.numeroVersao}
                  </option>
                ))}
                {form.modelo && !form.modeloContratoId && (
                  <option value="">{form.modelo} (modelo legado)</option>
                )}
              </SelectPesquisavel>
            </Field>
            <Field label="Empresa contratada *">
              <SelectPesquisavel
                value={form.empresaId}
                onChange={(e) =>
                  setForm((atual) => ({
                    ...atual,
                    empresaId: e.target.value,
                    conteudoRascunho: "",
                  }))
                }
              >
                <option value="">Selecione a empresa</option>
                {empresas.map((empresa) => (
                  <option key={empresa.id} value={empresa.id}>
                    {empresa.nomeFantasia || empresa.razaoSocial} ·{" "}
                    {empresa.tipo === "MATRIZ" ? "Matriz" : "Filial"}
                  </option>
                ))}
              </SelectPesquisavel>
            </Field>
          </div>
          <div className="button-row contract-content-actions">
            <button
              className="btn outline"
              type="button"
              onClick={() => abrirPrevia({ abrirEditor: true })}
              disabled={carregandoPrevia || bloqueado}
            >
              Editar conteúdo do contrato
            </button>
            <button
              className="btn outline"
              type="button"
              onClick={() => abrirPrevia()}
              disabled={carregandoPrevia || bloqueado}
            >
              {carregandoPrevia ? "Gerando prévia..." : "Visualizar prévia"}
            </button>
          </div>
          {erro && (
            <p className="inline-error" role="alert">
              {erro}
            </p>
          )}
        </Card>
        <Card title="Resumo do contrato">
          <DetailRows
            rows={[
              ["Origem", orcamento?.numero || "—"],
              [
                "Valor total",
                orcamento
                  ? moeda(orcamento.revisaoAtualDetalhe?.totalFinal || 0)
                  : "—",
              ],
              [
                "Pagamento",
                orcamento?.revisaoAtualDetalhe?.condicoesPagamento || "—",
              ],
            ]}
          />
          <p className="notice warning">
            Os campos de assinatura das duas empresas aparecem automaticamente
            no rodapé da última página do PDF.
          </p>
          {base.recursos.contrato.dados && (
            <HistoricoContrato
              contrato={base.recursos.contrato.dados}
              podeEditar={usuario.perfil !== "CONSULTA"}
              onRestaurado={() => base.recarregar("contrato")}
            />
          )}
          <button
            className="btn primary full"
            disabled={salvando || bloqueado}
            onClick={salvar}
          >
            Salvar contrato
          </button>
        </Card>
      </div>
      {editorAberto && (
        <Modal
          title="Editar conteúdo do contrato"
          wide
          onClose={() => setEditorAberto(false)}
          footer={
            <>
              <button
                className="btn outline"
                onClick={() => abrirPrevia({ conteudo: conteudoEdicao })}
              >
                Visualizar prévia
              </button>
              <button
                className="btn primary"
                onClick={() => {
                  editar("conteudoRascunho", conteudoEdicao);
                  setEditorAberto(false);
                }}
              >
                Concluir edição
              </button>
            </>
          }
        >
          <p className="muted">
            O conteúdo salvo será usado para gerar o PDF do contrato.
          </p>
          <EditorConteudo
            className="contract-draft"
            value={conteudoEdicao}
            onChange={setConteudoEdicao}
            label="Conteúdo do contrato"
          />
        </Modal>
      )}
      {previaAberta && (
        <Modal
          proteger={false}
          title="Prévia do contrato"
          wide
          onClose={() => setPreviaAberta(false)}
          footer={
            <button
              className="btn primary"
              onClick={() => setPreviaAberta(false)}
            >
              Fechar prévia
            </button>
          }
        >
          <p className="muted">
            Dados do orçamento, cliente e empresa contratada já estão aplicados.
          </p>
          <article
            className="contract-preview"
            dangerouslySetInnerHTML={{ __html: conteudoPrevia }}
          />
        </Modal>
      )}
    </>
  );
}

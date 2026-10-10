import { validarCampos, destacarCampo } from "../validacao.js";
import { useRecursosApi } from "../components/useRecursosApi.js";
import { RecursosFeedback } from "../components/RecursosFeedback.jsx";
import { periodoServico, rotuloPeriodo } from "../periodoServico";
import { CampoData } from "../components/CampoData";
import { BarraFiltros } from "../components/BarraFiltros";
import { SelectPesquisavel } from "../components/SelectPesquisavel";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { api } from "../api.js";
import { useDados } from "../context.jsx";
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

const horario = (valor) =>
  valor
    ? new Date(valor).toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "—";
const statusServico = {
  RASCUNHO: "Rascunho",
  AGENDADO: "Agendado",
  EM_ANDAMENTO: "Em andamento",
  AGUARDANDO: "Aguardando",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};
const servicoInicial = {
  contratanteId: "",
  orcamentoId: "",
  titulo: "",
  descricao: "",
  responsavel: "",
  localExecucao: "",
  inicio: "",
  fim: "",
};

export function ServicosConectados() {
  const { setToast, unidade, usuario } = useDados();
  const podeEditar = usuario.perfil !== "CONSULTA";
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("");
  const [selecionado, setSelecionado] = useState(null);
  const [modal, setModal] = useState(false);
  const [concluir, setConcluir] = useState(false);
  const [resumo, setResumo] = useState("");
  const [form, setForm] = useState(servicoInicial);
  const [clientes, setClientes] = useState([]);
  const [orcamentos, setOrcamentos] = useState([]);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const remoto = usePaginaApi(api.listarServicos, {
    ativo: true,
    busca,
    status,
    tamanho: 10,
  });
  const base = useRecursosApi(
    {
      clientes: () => api.todosClientes(),
      orcamentos: () => api.todosOrcamentos("APROVADO"),
    },
    unidade,
  );
  useEffect(() => {
    const d = base.recursos.clientes.dados;
    if (d) setClientes(d.filter((c) => c.ativo));
  }, [base.recursos.clientes.dados]);
  useEffect(() => {
    const d = base.recursos.orcamentos.dados;
    if (d) setOrcamentos(d);
  }, [base.recursos.orcamentos.dados]);

  useEffect(() => setSelecionado(null), [busca, status, remoto.pagina]);
  const editar = (chave, valor) =>
    setForm((atual) => ({ ...atual, [chave]: valor }));
  const abrir = (item) => {
    setErro("");
    setForm(
      item
        ? {
            ...item,
            orcamentoId: item.orcamentoId || "",
            inicio: periodoServico(item).inicio,
            fim: periodoServico(item).fim,
          }
        : { ...servicoInicial },
    );
    setModal(true);
  };
  const atualizarSelecao = (item) => {
    setSelecionado(item);
    remoto.recarregar();
  };
  async function salvar() {
    if (salvando) return;
    if (!validarCampos(document.querySelector("dialog.native-modal")))
      return setErro("Confira os campos destacados.");
    if (form.inicio && !form.responsavel?.trim()) {
      destacarCampo(
        "Responsável",
        "Informe o responsável pelo período programado.",
      );
      return setErro("Informe o responsável.");
    }
    if (
      !form.contratanteId ||
      !form.titulo.trim() ||
      (form.inicio && !form.responsavel?.trim())
    )
      return setErro(
        "Informe cliente, título e responsável quando houver período programado.",
      );
    if (
      (form.inicio || form.fim) &&
      (!form.inicio || !form.fim || form.fim < form.inicio)
    )
      return setErro("Informe um período válido com início e fim.");
    setSalvando(true);
    setErro("");
    try {
      const dados = {
        contratanteId: form.contratanteId,
        orcamentoId: form.orcamentoId || null,
        titulo: form.titulo.trim(),
        descricao: form.descricao || null,
        responsavel: form.responsavel || null,
        localExecucao: form.localExecucao || null,
        dataInicio: form.inicio || null,
        dataFim: form.fim || null,
      };
      let item = form.id
        ? await api.atualizarServico(form.id, dados)
        : await api.criarServico(dados);
      atualizarSelecao(item);
      setModal(false);
      setToast("Serviço salvo.");
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  }
  async function executar(acao) {
    if (salvando) return;
    setErro("");
    setSalvando(true);
    try {
      const item =
        acao === "concluir"
          ? await api.concluirServico(selecionado.id, resumo)
          : acao === "iniciar"
            ? await api.iniciarServico(selecionado.id)
            : await api.cancelarServico(selecionado.id);
      atualizarSelecao(item);
      setConcluir(false);
      setResumo("");
      setToast("Serviço atualizado.");
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  }
  return (
    <>
      <PageHeading
        title="Serviços"
        subtitle={`Cadastro e execução · ${unidade}`}
        action={
          podeEditar && (
            <button className="btn primary" onClick={() => abrir(null)}>
              <Plus size={16} /> Novo serviço
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
              placeholder="Código, serviço ou cliente..."
            />
            <SelectFilter
              value={status}
              onChange={setStatus}
              options={[
                "Todos",
                ...Object.entries(statusServico).map(([value, label]) => ({
                  value,
                  label,
                })),
              ]}
            />
          </BarraFiltros>
          <Card title={`${remoto.totalElementos} serviços`}>
            <DataTable
              rows={remoto.conteudo}
              remote={remoto}
              selected={selecionado}
              onSelect={setSelecionado}
              columns={[
                { key: "codigo", label: "Código" },
                { key: "titulo", label: "Serviço" },
                { key: "cliente", label: "Cliente" },
                { key: "responsavel", label: "Responsável" },
                {
                  key: "dataInicio",
                  label: "Período",
                  render: rotuloPeriodo,
                },
                {
                  key: "status",
                  label: "Status",
                  render: (s) => <Badge>{statusServico[s.status]}</Badge>,
                },
              ]}
            />
          </Card>
        </div>
        {selecionado && (
          <DetailPanel
            title={selecionado.codigo}
            status={statusServico[selecionado.status]}
            onClose={() => setSelecionado(null)}
            footer={
              <>
                {podeEditar &&
                  !["CONCLUIDO", "CANCELADO"].includes(selecionado.status) && (
                    <div className="button-pair">
                      <button
                        className="btn outline"
                        onClick={() => abrir(selecionado)}
                      >
                        Editar
                      </button>
                    </div>
                  )}
                {podeEditar &&
                  ["AGENDADO", "AGUARDANDO"].includes(selecionado.status) && (
                    <button
                      className="btn primary full"
                      onClick={() => executar("iniciar")}
                    >
                      Iniciar serviço
                    </button>
                  )}
                {podeEditar &&
                  ["EM_ANDAMENTO", "AGUARDANDO"].includes(
                    selecionado.status,
                  ) && (
                    <button
                      className="btn success full"
                      onClick={() => {
                        setErro("");
                        setConcluir(true);
                      }}
                    >
                      Finalizar serviço
                    </button>
                  )}
              </>
            }
          >
            <DetailRows
              rows={[
                ["Cliente", selecionado.cliente],
                ["Título", selecionado.titulo],
                ["Descrição", selecionado.descricao || "—"],
                ["Responsável", selecionado.responsavel || "—"],
                ["Local", selecionado.localExecucao || "—"],
                ["Período programado", rotuloPeriodo(selecionado)],

                ["Conclusão", horario(selecionado.concluidoEm)],
                ["Resumo", selecionado.resumoConclusao || "—"],
              ]}
            />
            {erro && (
              <p className="inline-error" role="alert">
                {erro}
              </p>
            )}
          </DetailPanel>
        )}
      </div>
      {modal && (
        <Modal
          busy={salvando}
          title={form.id ? `Editar serviço ${form.codigo}` : "Novo serviço"}
          wide
          onClose={() => setModal(false)}
          footer={
            <>
              <button className="btn outline" onClick={() => setModal(false)}>
                Cancelar
              </button>
              <button
                className="btn primary"
                disabled={
                  salvando ||
                  base.recursos.clientes.carregando ||
                  Boolean(base.recursos.clientes.erro)
                }
                onClick={salvar}
              >
                Salvar serviço
              </button>
            </>
          }
        >
          <RecursosFeedback
            {...base}
            rotulos={{ clientes: "clientes", orcamentos: "orçamentos" }}
          />
          <div className="form-grid">
            <Field label="Cliente *">
              <SelectPesquisavel
                value={form.contratanteId}
                onChange={(e) => editar("contratanteId", e.target.value)}
              >
                <option value="">Selecione</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nomeFantasia || c.nomeRazaoSocial}
                  </option>
                ))}
              </SelectPesquisavel>
            </Field>
            <Field label="Título *">
              <input
                value={form.titulo}
                onChange={(e) => editar("titulo", e.target.value)}
              />
            </Field>
            <Field label={form.inicio ? "Responsável *" : "Responsável"}>
              <input
                value={form.responsavel || ""}
                onChange={(e) => editar("responsavel", e.target.value)}
              />
            </Field>
            <Field label="Orçamento relacionado">
              <SelectPesquisavel
                value={form.orcamentoId || ""}
                onChange={(e) => editar("orcamentoId", e.target.value)}
              >
                <option value="">Nenhum</option>
                {orcamentos.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.numero}
                  </option>
                ))}
              </SelectPesquisavel>
            </Field>
            <Field label="Data de início">
              <CampoData
                value={form.inicio || ""}
                onChange={(e) => editar("inicio", e.target.value)}
              />
            </Field>
            <Field label="Data de fim">
              <CampoData
                min={form.inicio}
                value={form.fim || ""}
                onChange={(e) => editar("fim", e.target.value)}
              />
            </Field>

            <Field label="Local">
              <input
                value={form.localExecucao || ""}
                onChange={(e) => editar("localExecucao", e.target.value)}
              />
            </Field>
            <Field label="Descrição">
              <input
                value={form.descricao || ""}
                onChange={(e) => editar("descricao", e.target.value)}
              />
            </Field>
          </div>
          {erro && (
            <p className="inline-error" role="alert">
              {erro}
            </p>
          )}
        </Modal>
      )}
      {concluir && (
        <Modal
          title="Finalizar serviço"
          onClose={() => setConcluir(false)}
          footer={
            <>
              <button
                className="btn outline"
                onClick={() => setConcluir(false)}
              >
                Cancelar
              </button>
              <button
                className="btn success"
                disabled={salvando || !resumo.trim()}
                onClick={() => executar("concluir")}
              >
                Concluir serviço
              </button>
            </>
          }
        >
          <Field label="Resumo da execução">
            <input value={resumo} onChange={(e) => setResumo(e.target.value)} />
          </Field>
          {erro && (
            <p className="inline-error" role="alert">
              {erro}
            </p>
          )}
        </Modal>
      )}
    </>
  );
}

export { AgendaOperacional as AgendaConectada } from "./agendaOperacional";

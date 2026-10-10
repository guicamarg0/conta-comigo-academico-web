import { AvisoErro } from "../components/Feedback.jsx";
import {
  periodoServico,
  ocupaDia,
  cruzaPeriodo,
  rotuloPeriodo,
} from "../periodoServico";
import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Download,
} from "lucide-react";
import { useDados } from "../context";
import { api } from "../api";
import {
  Badge,
  Card,
  DataTable,
  Field,
  Modal,
  PageHeading,
  SelectFilter,
  Stat,
  TextFilter,
} from "../components";
import { CampoData } from "../components/CampoData";
import { BarraFiltros } from "../components/BarraFiltros";
import { SelectPesquisavel } from "../components/SelectPesquisavel";
import { baixarConvite } from "../calendario";
import { useMobile } from "../components/useMobile";
import { corDoServico, corDosServicosDoDia } from "../coresAgenda.js";

const dataLocal = (data) =>
  `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
const rotulos = {
  RASCUNHO: "Rascunho",
  AGENDADO: "Agendado",
  EM_ANDAMENTO: "Em andamento",
  AGUARDANDO: "Aguardando",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};
export function AgendaOperacional() {
  const mobile = useMobile();
  const {
    modo,
    unidade,
    usuario,
    servicos: demonstracao,
    salvar: salvarDemo,
    setToast,
  } = useDados();
  const [dia, setDia] = useState(dataLocal(new Date()));
  const [mes, setMes] = useState(dia.slice(0, 7));
  const [visao, setVisao] = useState(() =>
      window.matchMedia("(max-width:720px)").matches ? "lista" : "mes",
    ),
    [busca, setBusca] = useState(""),
    [responsavel, setResponsavel] = useState(""),
    [status, setStatus] = useState("");
  const [eventos, setEventos] = useState([]),
    [servicos, setServicos] = useState([]),
    [erro, setErro] = useState(""),
    [carregando, setCarregando] = useState(false);
  const [versao, setVersao] = useState(0),
    [form, setForm] = useState(null),
    [salvando, setSalvando] = useState(false);
  const podeEditar = modo !== "api" || usuario.perfil !== "CONSULTA";
  useEffect(() => {
    let ativo = true;
    setErro("");
    setCarregando(true);
    if (modo !== "api") {
      const dados = demonstracao.map((s) => ({
        ...s,
        codigo: s.codigo || s.id,
        titulo: s.titulo || s.servico,
        dataProgramada:
          s.dataProgramada ||
          (s.data?.includes("/")
            ? s.data.split("/").reverse().join("-")
            : s.data) ||
          "",
        status:
          s.status === "Em execução"
            ? "EM_ANDAMENTO"
            : Object.entries(rotulos).find(([k, v]) => v === s.status)?.[0] ||
              s.status,
      }));
      const fimMes = new Date(`${mes}-01T12:00:00`);
      fimMes.setMonth(fimMes.getMonth() + 1);
      setEventos(
        dados.filter((s) => cruzaPeriodo(s, `${mes}-01`, dataLocal(fimMes))),
      );
      setServicos(dados);
      setCarregando(false);
      return;
    }
    const inicio = new Date(`${mes}-01T00:00:00`),
      fim = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 1);
    Promise.all([
      api.todaAgenda(inicio.toISOString(), fim.toISOString()),
      api.todosServicos(),
    ])
      .then(([agenda, todos]) => {
        if (ativo) {
          setEventos(agenda.conteudo);
          setServicos(todos);
        }
      })
      .catch((e) => {
        if (ativo) {
          setErro(e.message);
          setEventos([]);
        }
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [modo, unidade, mes, versao, demonstracao]);
  const filtrados = eventos.filter(
    (s) =>
      (!responsavel || s.responsavel === responsavel) &&
      (!status || s.status === status) &&
      `${s.codigo} ${s.titulo} ${s.cliente}`
        .toLowerCase()
        .includes(busca.toLowerCase()),
  );
  const dias = useMemo(() => {
    const inicio = new Date(`${mes}-01T12:00:00`);
    inicio.setDate(inicio.getDate() - ((inicio.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, i) => {
      const data = new Date(inicio);
      data.setDate(inicio.getDate() + i);
      return dataLocal(data);
    });
  }, [mes]);
  const doDia = filtrados.filter((s) => ocupaDia(s, dia));
  function mudarMes(delta) {
    const data = new Date(`${mes}-01T12:00:00`);
    data.setMonth(data.getMonth() + delta);
    const valor = dataLocal(data);
    setMes(valor.slice(0, 7));
    setDia(valor);
  }
  function abrir(s) {
    setErro("");
    setForm({
      id: s?.id || "",
      dataInicio: s ? periodoServico(s).inicio || dia : dia,
      dataFim: s ? periodoServico(s).fim || dia : dia,
      responsavel: s?.responsavel || "",
    });
  }
  async function gravar(e) {
    e.preventDefault();
    if (salvando) return;
    if (!form.dataInicio || !form.dataFim || form.dataFim < form.dataInicio)
      return setErro("Informe um período válido com início e fim.");
    setErro("");
    setSalvando(true);
    try {
      if (modo === "api")
        await api.agendarServico(form.id, {
          dataInicio: form.dataInicio,
          dataFim: form.dataFim,
          responsavel: form.responsavel.trim(),
        });
      else
        salvarDemo("servicos", {
          ...servicos.find((s) => s.id === form.id),
          ...form,
          data: form.dataInicio,
          dataProgramada: form.dataInicio,
          status: "Agendado",
        });
      setDia(form.dataInicio);
      setMes(form.dataInicio.slice(0, 7));
      setForm(null);
      setVersao((v) => v + 1);
      setToast("Serviço programado.");
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  }
  return (
    <>
      <PageHeading
        title="Agenda"
        subtitle={`Dias programados dos serviços · ${unidade}`}
        action={
          podeEditar && (
            <button className="btn primary" onClick={() => abrir()}>
              <Plus size={16} /> Agendar serviço
            </button>
          )
        }
      />

      <BarraFiltros>
        <TextFilter
          value={busca}
          onChange={setBusca}
          placeholder="Buscar serviço ou cliente..."
        />
        <SelectFilter
          label="Responsável"
          value={responsavel}
          onChange={setResponsavel}
          options={[
            "Todos",
            ...new Set(eventos.map((s) => s.responsavel).filter(Boolean)),
          ]}
        />
        <SelectFilter
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            "Todos",
            ...Object.entries(rotulos).map(([value, label]) => ({
              value,
              label,
            })),
          ]}
        />
      </BarraFiltros>
      {!form && (
        <AvisoErro
          erro={erro}
          anterior={eventos.length > 0}
          onRetry={() => setVersao((v) => v + 1)}
        />
      )}
      <div className="agenda-operacional">
        <Card
          title={new Date(`${mes}-01T12:00:00`).toLocaleDateString("pt-BR", {
            month: "long",
            year: "numeric",
          })}
          action={
            <div className="button-pair">
              <button
                className="btn outline"
                aria-label="Mês anterior"
                onClick={() => mudarMes(-1)}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                className="btn outline"
                onClick={() => {
                  const hoje = dataLocal(new Date());
                  setDia(hoje);
                  setMes(hoje.slice(0, 7));
                }}
              >
                Hoje
              </button>
              <button
                className="btn outline"
                aria-label="Próximo mês"
                onClick={() => mudarMes(1)}
              >
                <ChevronRight size={16} />
              </button>
              <SelectPesquisavel
                aria-label="Visualização da agenda"
                value={visao}
                onChange={(e) => setVisao(e.target.value)}
              >
                <option value="mes">Mês</option>
                <option value="lista">Lista</option>
              </SelectPesquisavel>
            </div>
          }
        >
          {carregando ? (
            <p role="status">Carregando agenda...</p>
          ) : visao === "mes" ? (
            <div className="calendario-dias">
              <div className="calendario-semana">
                {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
              <div className="calendario-grade">
                {dias.map((data) => {
                  const itens = filtrados.filter((s) => ocupaDia(s, data));
                  return (
                    <button
                      key={data}
                      type="button"
                      aria-label={`${data}, ${itens.length} serviços`}
                      aria-pressed={data === dia}
                      style={corDosServicosDoDia(itens)}
                      className={`calendario-dia ${itens.length ? "com-servicos" : ""} ${data === dia ? "selecionado" : ""} ${data.startsWith(mes) ? "" : "outro-mes"}`}
                      onClick={() => {
                        setDia(data);
                        if (!data.startsWith(mes)) setMes(data.slice(0, 7));
                      }}
                    >
                      <span className="calendario-dia-topo">
                        <strong>{Number(data.slice(-2))}</strong>
                        {itens.length > 0 && (
                          <span
                            className="calendario-dia-etiqueta"
                            title={
                              itens.length === 1
                                ? "1 serviço programado"
                                : `${itens.length} serviços programados`
                            }
                          >
                            {itens.length}
                            {!mobile &&
                              (itens.length === 1 ? " serviço" : " serviços")}
                          </span>
                        )}
                      </span>
                      {!mobile &&
                        itens.slice(0, 2).map((s) => (
                          <span
                            className="calendario-evento"
                            key={s.id}
                            style={corDoServico(s)}
                          >
                            {s.titulo}
                          </span>
                        ))}
                      {!mobile && itens.length > 2 && (
                        <small>+{itens.length - 2} serviços</small>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <DataTable
              mobileTitle="titulo"
              mobileActionLabel="Programar serviço"
              rows={filtrados}
              rowStyle={corDoServico}
              rowClassName={() => "agenda-service-row"}
              columns={[
                {
                  key: "dataInicio",
                  label: "Período",
                  render: rotuloPeriodo,
                },
                { key: "titulo", label: "Serviço" },
                { key: "cliente", label: "Cliente" },
                { key: "responsavel", label: "Responsável" },
              ]}
              onSelect={podeEditar ? abrir : undefined}
            />
          )}
        </Card>
        <Card title="Serviços do dia">
          <Field label="Dia">
            <CampoData
              required
              value={dia}
              onChange={(e) => {
                if (e.target.value) {
                  setDia(e.target.value);
                  setMes(e.target.value.slice(0, 7));
                }
              }}
            />
          </Field>
          <div className="agenda-dia-lista">
            {!carregando && doDia.length === 0 && (
              <p>Nenhum serviço programado para este dia.</p>
            )}
            {doDia.map((s) => (
              <article key={s.id} className="agenda-service-row" style={corDoServico(s)}>
                <strong>
                  {s.codigo} · {s.titulo}
                </strong>
                <span>{s.cliente}</span>
                <small>{s.responsavel || "Sem responsável"}</small>
                <Badge>{rotulos[s.status] || s.status}</Badge>
                <div className="button-pair">
                  {podeEditar &&
                    !["CONCLUIDO", "CANCELADO"].includes(s.status) && (
                      <button className="btn outline" onClick={() => abrir(s)}>
                        Reagendar
                      </button>
                    )}
                  <button
                    className="btn outline"
                    onClick={() => baixarConvite(s)}
                  >
                    <Download size={14} /> Convite
                  </button>
                </div>
              </article>
            ))}
          </div>
        </Card>
      </div>
      {form && (
        <Modal
          busy={salvando}
          title="Programar serviço"
          onClose={() => setForm(null)}
          footer={
            <>
              <button className="btn outline" onClick={() => setForm(null)}>
                Cancelar
              </button>
              <button
                className="btn primary"
                form="agendamento-form"
                disabled={salvando}
              >
                {salvando ? "Salvando..." : "Salvar"}
              </button>
            </>
          }
        >
          <form id="agendamento-form" className="form-grid" onSubmit={gravar}>
            <Field label="Serviço *">
              <SelectPesquisavel
                required
                value={form.id}
                onChange={(e) => {
                  const s = servicos.find((s) => s.id === e.target.value);
                  setForm({
                    ...form,
                    id: e.target.value,
                    responsavel: s?.responsavel || form.responsavel,
                  });
                }}
              >
                <option value="">Selecione um serviço</option>
                {servicos
                  .filter(
                    (s) =>
                      ![
                        "CONCLUIDO",
                        "CANCELADO",
                        "Concluído",
                        "Cancelado",
                      ].includes(s.status),
                  )
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.codigo} · {s.titulo}
                    </option>
                  ))}
              </SelectPesquisavel>
            </Field>
            <Field label="Data de início *">
              <CampoData
                required
                value={form.dataInicio}
                onChange={(e) =>
                  setForm({ ...form, dataInicio: e.target.value })
                }
              />
            </Field>
            <Field label="Data de fim *">
              <CampoData
                required
                min={form.dataInicio}
                value={form.dataFim}
                onChange={(e) => setForm({ ...form, dataFim: e.target.value })}
              />
            </Field>
            <Field label="Responsável *">
              <input
                required
                maxLength={120}
                value={form.responsavel}
                onChange={(e) =>
                  setForm({ ...form, responsavel: e.target.value })
                }
              />
            </Field>
            {erro && (
              <p role="alert" className="inline-error">
                {erro}
              </p>
            )}
          </form>
        </Modal>
      )}
    </>
  );
}

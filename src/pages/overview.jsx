import { SelectPesquisavel } from "../components/SelectPesquisavel";
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CalendarDays,
  ChartColumn,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  FileText,
  Plus,
  Settings2,
  TriangleAlert,
  Users,
} from "lucide-react";
import { useDados } from "../context.jsx";
import { moeda } from "../data.js";
import { formatarTelefone } from "../telefone.js";
import {
  Badge,
  Card,
  DataTable,
  Field,
  Modal,
  PageHeading,
  SelectFilter,
  Stat,
  Tabs,
} from "../components.jsx";

const barras = [
  { nome: "Sem 1", criados: 9, enviados: 10, aprovados: 5 },
  { nome: "Sem 2", criados: 14, enviados: 10, aprovados: 7 },
  { nome: "Sem 3", criados: 15, enviados: 10, aprovados: 8 },
  { nome: "Sem 4", criados: 14, enviados: 12, aprovados: 7 },
  { nome: "Sem 5", criados: 16, enviados: 10, aprovados: 8 },
];
const faturamento = [
  { nome: "Jan", faturado: 20, previsto: 18 },
  { nome: "Fev", faturado: 24, previsto: 28 },
  { nome: "Mar", faturado: 27, previsto: 31 },
  { nome: "Abr", faturado: 40, previsto: 48 },
  { nome: "Mai", faturado: 32, previsto: 59 },
  { nome: "Jun", faturado: 52, previsto: 87 },
  { nome: "Jul", faturado: 56, previsto: 84 },
  { nome: "Ago", faturado: 76, previsto: 104 },
  { nome: "Set", faturado: 83, previsto: 109 },
  { nome: "Out", faturado: 115, previsto: 139 },
];
const hora = (valor) =>
  `${String(Math.floor(Number(valor))).padStart(2, "0")}:${Number(valor) % 1 ? "30" : "00"}`;
const tipos = [
  { name: "Recuperação", value: 40, color: "#075dd6" },
  { name: "Manutenção", value: 25, color: "#2580ef" },
  { name: "Peças", value: 20, color: "#70b4ff" },
  { name: "Outros", value: 15, color: "#bfdcff" },
];
export function DashboardPage() {
  const { orcamentos, contratos, agenda, clientes, pecas, setToast } =
    useDados();
  const navigate = useNavigate();
  const [periodo, setPeriodo] = useState("Este mês");
  const [tarefas, setTarefas] = useState([false, false, true, false, false]);
  return (
    <>
      <PageHeading title="Dashboard" subtitle="Visão geral do seu negócio">
        <label className="period-label">
          Período{" "}
          <SelectPesquisavel
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
          >
            <option>Este mês</option>
            <option>Este ano</option>
            <option>Últimos 30 dias</option>
          </SelectPesquisavel>
        </label>
        <input
          type="month"
          aria-label="Período selecionado"
          defaultValue="2026-09"
        />
      </PageHeading>
      <div className="stats-grid four">
        <Stat
          icon={FileText}
          label="Orçamentos"
          value="12"
          detail="7 enviados"
          trend="↑ 20%"
        />
        <Stat
          icon={CircleCheck}
          label="Aprovados"
          value="5"
          detail="R$ 125.400"
          trend="↑ 35%"
          tone="green"
        />
        <Stat
          icon={Settings2}
          label="Em execução"
          value="3"
          detail="contratos ativos"
          trend="↓ 0%"
        />
        <Stat
          icon={ChartColumn}
          label="Receita do mês"
          value="R$ 84.200"
          trend="↑ 28%"
        />
      </div>
      <div className="dashboard-row three">
        <Card
          title="Orçamentos recentes"
          action={
            <button
              className="text-link"
              onClick={() => navigate("/orcamentos")}
            >
              Ver todos →
            </button>
          }
        >
          <DataTable
            rows={orcamentos.slice(0, 5)}
            pageSize={5}
            onSelect={() => navigate("/orcamentos")}
            columns={[
              { key: "id", label: "Nº", render: (o) => <a>{o.id}</a> },
              { key: "cliente", label: "Cliente" },
              { key: "valor", label: "Valor", render: (o) => moeda(o.valor) },
              {
                key: "status",
                label: "Status",
                render: (o) => <Badge>{o.status}</Badge>,
              },
              { key: "data", label: "Data", render: (o) => o.data.slice(0, 5) },
            ]}
          />
        </Card>
        <Card
          title="Agenda da semana"
          action={
            <button className="text-link" onClick={() => navigate("/agenda")}>
              Ver agenda →
            </button>
          }
        >
          <div className="agenda-small">
            {agenda
              .filter((a) => a.dia < 5)
              .slice(0, 5)
              .map((a, i) => (
                <div key={i}>
                  <span>
                    {["Seg", "Ter", "Qua", "Qui", "Sex"][a.dia]}
                    <small>{28 + a.dia}/09</small>
                  </span>
                  <i
                    className={`dot ${a.status === "Planejado" ? "amber" : "blue"}`}
                  />
                  <div>
                    <strong>{a.titulo}</strong>
                    <small>
                      {a.hora || hora(a.inicio)} · {a.cliente}
                    </small>
                  </div>
                </div>
              ))}
          </div>
        </Card>
        <Card
          title="Contratos em andamento"
          action={
            <button
              className="text-link"
              onClick={() => navigate("/contratos")}
            >
              Ver todos →
            </button>
          }
        >
          <DataTable
            rows={contratos.slice(0, 4)}
            pageSize={4}
            onSelect={() => navigate("/contratos")}
            columns={[
              { key: "id", label: "Nº", render: (c) => <a>{c.id}</a> },
              { key: "cliente", label: "Cliente" },
              { key: "servico", label: "Serviço" },
              {
                key: "status",
                label: "Status",
                render: (c) => <Badge>{c.status}</Badge>,
              },
            ]}
          />
        </Card>
      </div>
      <div className="dashboard-row charts">
        <Card
          title="Evolução de orçamentos"
          action={
            <SelectPesquisavel aria-label="Período dos orçamentos">
              <option>Este mês</option>
              <option>Este ano</option>
            </SelectPesquisavel>
          }
        >
          <div className="chart-legend">
            <span className="dot blue" /> Criados <span className="dot light" />{" "}
            Enviados <span className="dot green" /> Aprovados
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={barras}>
              <CartesianGrid stroke="#e9eef7" />
              <XAxis dataKey="nome" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip />
              <Bar dataKey="criados" fill="#0864d9" barSize={16} />
              <Bar dataKey="enviados" fill="#7bb9ff" barSize={16} />
              <Bar dataKey="aprovados" fill="#2cba83" barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card
          title="Faturamento"
          action={
            <SelectPesquisavel aria-label="Período de faturamento">
              <option>Este ano</option>
            </SelectPesquisavel>
          }
        >
          <div className="chart-legend">
            <span className="dot blue" /> Faturado{" "}
            <span className="dot light" /> Previsto
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <LineChart data={faturamento}>
              <CartesianGrid stroke="#e9eef7" />
              <XAxis dataKey="nome" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="faturado"
                stroke="#075dd6"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="previsto"
                stroke="#7bb9ff"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Serviços por tipo">
          <div className="pie-wrap">
            <ResponsiveContainer width="62%" height={190}>
              <PieChart>
                <Pie
                  data={tipos}
                  dataKey="value"
                  innerRadius={48}
                  outerRadius={72}
                  stroke="#fff"
                >
                  {tipos.map((t) => (
                    <Cell key={t.name} fill={t.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pie-center">
              <strong>28</strong>
              <small>serviços</small>
            </div>
            <div className="pie-legend">
              {tipos.map((t) => (
                <div key={t.name}>
                  <i style={{ background: t.color }} />
                  {t.name}
                  <span>{t.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
      <div className="dashboard-row three">
        <Card
          title="Clientes mais ativos"
          action={
            <button className="text-link" onClick={() => navigate("/clientes")}>
              Ver todos →
            </button>
          }
        >
          <DataTable
            rows={clientes.slice(0, 5)}
            pageSize={5}
            columns={[
              {
                key: "nome",
                label: "Cliente",
                render: (c) => <strong>{c.nome}</strong>,
              },
              {
                key: "numero",
                label: "Orçamentos",
                render: (_, i) => [8, 5, 4, 3, 3][i] || 3,
              },
              {
                key: "valor",
                label: "Valor total",
                render: (c) => moeda(c.valor * 3),
              },
            ]}
          />
        </Card>
        <Card
          title="Itens mais utilizados"
          action={
            <button className="text-link" onClick={() => navigate("/pecas")}>
              Ver todos →
            </button>
          }
        >
          <DataTable
            rows={pecas.slice(0, 5)}
            pageSize={5}
            columns={[
              { key: "nome", label: "Descrição" },
              {
                key: "categoria",
                label: "Tipo",
                render: (p) => (
                  <Badge>
                    {p.categoria === "Rolamentos" ? "Peça" : "Serviço"}
                  </Badge>
                ),
              },
              {
                key: "qtd",
                label: "Qtd. (mês)",
                render: (_, i) => [24, 32, 18, 16, 14][i],
              },
            ]}
          />
        </Card>
        <Card
          title="Tarefas e lembretes"
          action={
            <button
              className="text-link"
              onClick={() => setToast("Tarefas atualizadas.")}
            >
              Ver todos →
            </button>
          }
        >
          <div className="task-list">
            {[
              "Enviar orçamento para Cliente Exemplo A",
              "Retorno do cliente Cliente Exemplo B",
              "Separar peças – Pedido #125",
              "Preparar contrato CT-12",
              "Visita técnica GlobalFlex",
            ].map((t, i) => (
              <label key={t}>
                <input
                  type="checkbox"
                  checked={tarefas[i]}
                  onChange={() =>
                    setTarefas((v) => v.map((x, n) => (n === i ? !x : x)))
                  }
                />
                <span>{t}</span>
                <small>{i < 2 ? "Hoje" : i === 2 ? "30/09" : "01/10"}</small>
              </label>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

export function AgendaPage() {
  const { agenda, clientes, salvar, setToast } = useDados();
  const [vista, setVista] = useState("Semana");
  const [tecnico, setTecnico] = useState("");
  const [status, setStatus] = useState("");
  const [cliente, setCliente] = useState("");
  const [semana, setSemana] = useState(0);
  const [modal, setModal] = useState("");
  const [form, setForm] = useState({
    dia: 0,
    inicio: 8,
    duracao: 2,
    status: "Planejado",
  });
  const dias = ["Seg", "Ter", "Qua", "Qui", "Sex"];
  const visiveis = agenda.filter(
    (a) =>
      (!tecnico || a.tecnico === tecnico) &&
      (!status || a.status === status) &&
      (!cliente || a.cliente === cliente),
  );
  function gravar(e) {
    e.preventDefault();
    const conflito = agenda.some(
      (a) =>
        a.dia === Number(form.dia) &&
        a.tecnico === form.tecnico &&
        Number(form.inicio) < a.inicio + a.duracao &&
        Number(form.inicio) + Number(form.duracao) > a.inicio,
    );
    if (conflito) {
      setModal("conflito");
      return;
    }
    salvar("agenda", {
      ...form,
      id: Date.now(),
      dia: Number(form.dia),
      inicio: Number(form.inicio),
      duracao: Number(form.duracao),
    });
    setModal("");
    setToast("Agendamento salvo.");
  }
  return (
    <>
      <PageHeading
        title="Agenda"
        subtitle="Planejamento de serviços e equipe em campo"
        action={
          <button className="btn primary" onClick={() => setModal("novo")}>
            <Plus size={18} /> Novo agendamento
          </button>
        }
      />
      <div className="agenda-layout">
        <div>
          <div className="stats-grid four">
            <Stat
              icon={CalendarDays}
              label="Próximos serviços"
              value="12"
              detail="nos próximos 7 dias"
              trend="↑ 20%"
            />
            <Stat
              icon={TriangleAlert}
              label="Atrasados"
              value="2"
              detail="serviços em atraso"
              trend="↓ 50%"
              tone="red"
            />
            <Stat
              icon={Users}
              label="Em campo hoje"
              value="5"
              detail="técnicos em atendimento"
            />
            <Stat
              icon={CircleCheck}
              label="Concluídos na semana"
              value="18"
              detail="serviços finalizados"
              trend="↑ 38%"
              tone="green"
            />
          </div>
          <Card className="calendar-card">
            <div className="calendar-toolbar">
              <div className="segmented">
                {["Semana", "Mês", "Lista"].map((v) => (
                  <button
                    className={vista === v ? "active" : ""}
                    key={v}
                    onClick={() => setVista(v)}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <div>
                <button
                  className="btn outline"
                  onClick={() => setSemana(semana - 1)}
                >
                  <ChevronLeft size={16} />
                </button>
                <strong>
                  {semana === 0
                    ? "28 de setembro – 02 de outubro de 2026"
                    : `Semana ${semana > 0 ? "+" : ""}${semana}`}
                </strong>
                <button
                  className="btn outline"
                  onClick={() => setSemana(semana + 1)}
                >
                  <ChevronRight size={16} />
                </button>
                <button className="btn outline" onClick={() => setSemana(0)}>
                  Hoje
                </button>
              </div>
            </div>
            <div className="filter-row calendar-filters">
              <SelectFilter
                label="Técnico"
                value={tecnico}
                onChange={setTecnico}
                options={["Todos", "Carlos Lima", "Ana Costa", "Rafael Mendes"]}
              />
              <SelectFilter
                label="Status"
                value={status}
                onChange={setStatus}
                options={[
                  "Todos",
                  "Planejado",
                  "Em andamento",
                  "Concluído",
                  "Atrasado",
                ]}
              />
              <SelectFilter
                label="Cliente"
                value={cliente}
                onChange={setCliente}
                options={["Todos", ...clientes.map((c) => c.nome)]}
              />
              <button
                className="btn outline"
                onClick={() => {
                  setTecnico("");
                  setStatus("");
                  setCliente("");
                }}
              >
                Limpar filtros
              </button>
            </div>
            {vista === "Lista" ? (
              <DataTable
                rows={visiveis.map((v, i) => ({ ...v, id: i }))}
                columns={[
                  {
                    key: "inicio",
                    label: "Horário",
                    render: (a) =>
                      `${String(Math.floor(a.inicio)).padStart(2, "0")}:00`,
                  },
                  { key: "titulo", label: "Serviço" },
                  { key: "cliente", label: "Cliente" },
                  { key: "tecnico", label: "Técnico" },
                  {
                    key: "status",
                    label: "Status",
                    render: (a) => <Badge>{a.status}</Badge>,
                  },
                ]}
              />
            ) : vista === "Mês" ? (
              <div className="month-grid">
                {Array.from({ length: 35 }, (_, i) => (
                  <button key={i} onClick={() => setVista("Semana")}>
                    <strong>{(i % 30) + 1}</strong>
                    {i % 6 === 0 && <i className="dot blue" />}
                  </button>
                ))}
              </div>
            ) : (
              <div className="week-grid">
                <div className="week-head">
                  <span>Horário</span>
                  {dias.map((d, i) => (
                    <span key={d}>
                      <strong>{d}</strong>
                      <small>
                        {28 + i > 30 ? `0${i - 2}/10` : `${28 + i}/09`}
                      </small>
                    </span>
                  ))}
                </div>
                <div className="week-body">
                  <div className="hours">
                    {Array.from({ length: 11 }, (_, i) => (
                      <span key={i}>{String(i + 8).padStart(2, "0")}:00</span>
                    ))}
                  </div>
                  {dias.map((d, dia) => (
                    <div className="day-column" key={d}>
                      {visiveis
                        .filter((a) => a.dia === dia)
                        .map((a, i) => (
                          <button
                            key={i}
                            className={`calendar-event ${a.status === "Concluído" ? "green" : a.status === "Atrasado" ? "red" : a.status === "Planejado" ? "amber" : "blue"}`}
                            style={{
                              top: `${(a.inicio - 8) * 55 + 9}px`,
                              height: `${Math.max(74, a.duracao * 55 - 8)}px`,
                            }}
                            onClick={() => {
                              setForm(a);
                              setModal("novo");
                            }}
                          >
                            <small>
                              {String(Math.floor(a.inicio)).padStart(2, "0")}:
                              {a.inicio % 1 ? "30" : "00"} –{" "}
                              {String(
                                Math.floor(a.inicio + a.duracao),
                              ).padStart(2, "0")}
                              :00
                            </small>
                            <strong>{a.cliente}</strong>
                            <span>{a.titulo}</span>
                            <small>♙ {a.tecnico}</small>
                            <Badge>{a.status}</Badge>
                          </button>
                        ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
        <div className="agenda-rail">
          <Card title="Próximos serviços">
            <div className="next-list">
              {agenda.slice(0, 5).map((a, i) => (
                <div key={i}>
                  <small>
                    {i < 2 ? "Hoje" : "Amanhã"}
                    <br />
                    28/09
                  </small>
                  <span>
                    <strong>{a.cliente}</strong>
                    <small>{a.titulo}</small>
                    <small>
                      {hora(a.inicio)} –{" "}
                      {hora(Number(a.inicio) + Number(a.duracao))}
                    </small>
                  </span>
                  <Badge>{a.status}</Badge>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Setembro 2026">
            <div className="mini-calendar">
              <div>D　S　T　Q　Q　S　S</div>
              {Array.from({ length: 35 }, (_, i) => (
                <button
                  key={i}
                  className={i === 28 ? "active" : ""}
                  onClick={() => setVista("Semana")}
                >
                  {(i % 30) + 1}
                </button>
              ))}
            </div>
          </Card>
          <Card title="Técnicos em campo hoje">
            <div className="team-list">
              {["Carlos Lima", "Ana Costa", "Rafael Mendes"].map((nome, i) => (
                <div key={nome}>
                  <i
                    className={`dot ${i === 0 ? "blue" : i === 1 ? "green" : "red"}`}
                  />
                  <strong>{nome}</strong>
                  <Badge>Em campo</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
      {modal === "novo" && (
        <Modal
          title="Novo agendamento"
          onClose={() => setModal("")}
          footer={
            <>
              <button className="btn outline" onClick={() => setModal("")}>
                Cancelar
              </button>
              <button className="btn primary" form="agenda-form">
                Salvar agendamento
              </button>
            </>
          }
        >
          <form id="agenda-form" className="form-grid" onSubmit={gravar}>
            <Field label="Cliente">
              <SelectPesquisavel
                required
                value={form.cliente || ""}
                onChange={(e) => setForm({ ...form, cliente: e.target.value })}
              >
                <option value="">Selecione</option>
                {clientes.map((c) => (
                  <option key={c.id}>{c.nome}</option>
                ))}
              </SelectPesquisavel>
            </Field>
            <Field label="Serviço">
              <input
                required
                value={form.titulo || ""}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              />
            </Field>
            <Field label="Dia">
              <SelectPesquisavel
                value={form.dia}
                onChange={(e) => setForm({ ...form, dia: e.target.value })}
              >
                {dias.map((d, i) => (
                  <option value={i} key={d}>
                    {d} · {28 + i}/09
                  </option>
                ))}
              </SelectPesquisavel>
            </Field>
            <Field label="Técnico">
              <SelectPesquisavel
                required
                value={form.tecnico || ""}
                onChange={(e) => setForm({ ...form, tecnico: e.target.value })}
              >
                <option value="">Selecione</option>
                {["Carlos Lima", "Ana Costa", "Rafael Mendes"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </SelectPesquisavel>
            </Field>
            <Field label="Início">
              <input
                type="number"
                min="8"
                max="18"
                step=".5"
                value={form.inicio}
                onChange={(e) => setForm({ ...form, inicio: e.target.value })}
              />
            </Field>
            <Field label="Duração (horas)">
              <input
                type="number"
                min=".5"
                max="8"
                step=".5"
                value={form.duracao}
                onChange={(e) => setForm({ ...form, duracao: e.target.value })}
              />
            </Field>
          </form>
        </Modal>
      )}
      {modal === "conflito" && (
        <Modal
          title="Conflito de horário"
          onClose={() => setModal("novo")}
          footer={
            <>
              <button className="btn outline" onClick={() => setModal("novo")}>
                Voltar
              </button>
              <button
                className="btn primary"
                onClick={() => {
                  setForm({ ...form, inicio: Number(form.inicio) + 2 });
                  setModal("novo");
                }}
              >
                Usar horário sugerido
              </button>
            </>
          }
        >
          <p className="notice danger-box">
            {form.tecnico} já está atribuído a outro serviço nesse horário.
          </p>
          <p>Alternativa disponível: duas horas depois do início solicitado.</p>
          <Field label="Motivo do reagendamento">
            <input placeholder="Solicitação do cliente" />
          </Field>
          <small>A alteração será registrada no histórico do serviço.</small>
        </Modal>
      )}
    </>
  );
}

export function ConfiguracoesPage() {
  const { usuario, setUsuario, unidade, setUnidade, setToast } = useDados();
  const [aba, setAba] = useState("Unidade");
  const [modal, setModal] = useState(false);
  const [nome, setNome] = useState(unidade);
  const [email, setEmail] = useState("");
  const [perfil, setPerfil] = useState("Operador");
  const [convites, setConvites] = useState([
    {
      nome: "Rafael Mendes",
      email: "rafael@example.com",
      perfil: "Consulta",
      status: "Pendente",
      ultimo: "—",
    },
  ]);
  return (
    <>
      <PageHeading
        title="Configurações"
        subtitle="Dados, equipe e regras da unidade."
      />
      <Card
        title={
          aba === "Unidade"
            ? "Dados da unidade"
            : aba === "Usuários"
              ? "Usuários e convites"
              : aba === "Permissões"
                ? "Matriz de permissões"
                : aba
        }
      >
        <Tabs
          items={[
            "Unidade",
            "Usuários",
            "Permissões",
            "Documentos",
            "Pagamento",
          ]}
          value={aba}
          onChange={setAba}
        />
        {aba === "Unidade" ? (
          <>
            <div className="form-grid config-grid">
              <Field label="Nome da unidade">
                <input value={nome} onChange={(e) => setNome(e.target.value)} />
              </Field>
              <Field label="Razão social">
                <input defaultValue="Prestador Exemplo LTDA" />
              </Field>
              <Field label="CNPJ">
                <input defaultValue="12.345.678/0001-90" />
              </Field>
              <Field label="Telefone">
                <input
                  type="tel"
                  defaultValue="(11) 3456-7890"
                  placeholder="(00) 00000-0000"
                  onChange={(e) => {
                    e.target.value = formatarTelefone(e.target.value);
                  }}
                />
              </Field>
              <Field label="E-mail">
                <input defaultValue="contato@example.com" />
              </Field>
              <Field label="Fuso horário">
                <input defaultValue="América/São Paulo" />
              </Field>
              <Field label="Endereço">
                <input defaultValue="Rua das Indústrias, 320" />
              </Field>
              <Field label="Cidade / UF">
                <input defaultValue="São Paulo / SP" />
              </Field>
              <Field label="Logotipo">
                <input type="file" accept="image/*" />
              </Field>
            </div>
            <div className="form-actions">
              <button
                className="btn primary"
                onClick={() => {
                  setUnidade(nome);
                  setToast("Dados da unidade salvos.");
                }}
              >
                Salvar alterações
              </button>
            </div>
          </>
        ) : aba === "Usuários" ? (
          <>
            <div className="card-heading">
              <span />
              <button className="btn primary" onClick={() => setModal(true)}>
                <Plus size={16} /> Convidar usuário
              </button>
            </div>
            <div className="stats-grid three">
              <Stat label="Usuários ativos" value="3" detail="Unidade atual" />
              <Stat
                label="Convites pendentes"
                value={convites.length}
                detail="Expira em 7 dias"
                tone="red"
              />
              <Stat label="Unidades" value="2" detail={usuario.nome} />
            </div>
            <DataTable
              rows={[
                {
                  nome: usuario.nome,
                  email: usuario.email,
                  perfil: "Administrador",
                  status: "Ativo",
                  ultimo: "Hoje",
                },
                {
                  nome: "Ana Costa",
                  email: "ana@example.com",
                  perfil: "Gestor",
                  status: "Ativo",
                  ultimo: "Hoje",
                },
                {
                  nome: "Carlos Lima",
                  email: "carlos@example.com",
                  perfil: "Operador",
                  status: "Ativo",
                  ultimo: "Ontem",
                },
                ...convites,
              ]}
              columns={[
                { key: "nome", label: "Nome" },
                { key: "email", label: "E-mail" },
                {
                  key: "perfil",
                  label: "Perfil nesta unidade",
                  render: (u) => (
                    <SelectPesquisavel
                      value={u.perfil}
                      onChange={(e) => {
                        if (u.nome === usuario.nome)
                          setUsuario({ ...usuario, perfil: e.target.value });
                        setToast("Perfil atualizado.");
                      }}
                    >
                      {["Administrador", "Gestor", "Operador", "Consulta"].map(
                        (p) => (
                          <option key={p}>{p}</option>
                        ),
                      )}
                    </SelectPesquisavel>
                  ),
                },
                {
                  key: "status",
                  label: "Status",
                  render: (u) => <Badge>{u.status}</Badge>,
                },
                { key: "ultimo", label: "Último acesso" },
              ]}
            />
          </>
        ) : aba === "Permissões" ? (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    {[
                      "Módulo",
                      "Administrador",
                      "Gestor",
                      "Operador",
                      "Consulta",
                    ].map((t) => (
                      <th key={t}>{t}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Clientes", "Total", "Gerenciar", "Gerenciar", "Ver"],
                    ["Serviços", "Total", "Gerenciar", "Gerenciar", "Ver"],
                    ["Agenda", "Total", "Gerenciar", "Gerenciar", "Ver"],
                    ["Orçamentos", "Total", "Gerenciar", "Criar", "Ver"],
                    ["Contratos", "Total", "Gerenciar", "—", "Ver"],
                    ["Configurações", "Total", "—", "—", "—"],
                  ].map((l) => (
                    <tr key={l[0]}>
                      {l.map((c, i) => (
                        <td key={i}>{c}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="notice info">
              As permissões são definidas para a associação entre o usuário e a
              unidade.
            </p>
          </>
        ) : (
          <div className="settings-placeholder">
            <h3>{aba}</h3>
            <p>Configure {aba.toLowerCase()} da unidade atual.</p>
            <button
              className="btn primary"
              onClick={() => setToast("Configuração salva.")}
            >
              Salvar alterações
            </button>
          </div>
        )}
      </Card>
      {modal && (
        <Modal
          title="Convidar usuário"
          onClose={() => setModal(false)}
          footer={
            <>
              <button className="btn outline" onClick={() => setModal(false)}>
                Cancelar
              </button>
              <button
                className="btn primary"
                onClick={() => {
                  if (!email.includes("@")) return;
                  setConvites([
                    ...convites,
                    {
                      nome: email.split("@")[0],
                      email,
                      perfil,
                      status: "Pendente",
                      ultimo: "—",
                    },
                  ]);
                  setModal(false);
                  setToast("Convite enviado.");
                }}
              >
                Enviar convite
              </button>
            </>
          }
        >
          <div className="form-grid">
            <Field label="E-mail *">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Perfil nesta unidade *">
              <SelectPesquisavel
                value={perfil}
                onChange={(e) => setPerfil(e.target.value)}
              >
                {["Administrador", "Gestor", "Operador", "Consulta"].map(
                  (p) => (
                    <option key={p}>{p}</option>
                  ),
                )}
              </SelectPesquisavel>
            </Field>
          </div>
          <p className="notice info">
            O convite dá acesso apenas à unidade {unidade}. O perfil pode ser
            diferente em outra unidade.
          </p>
          <div className="notice muted-box">
            <strong>Permissões do {perfil.toLowerCase()}</strong>
            <p>O acesso respeita a matriz de permissões desta unidade.</p>
          </div>
        </Modal>
      )}
    </>
  );
}

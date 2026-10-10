import { useRecursosApi } from "../components/useRecursosApi.js";
import { AvisoErro } from "../components/Feedback.jsx";
import { cruzaPeriodo, periodoServico } from "../periodoServico.js";
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileText, Wrench, CircleCheck, Receipt } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";
import { api } from "../api";
import { useDados } from "../context";
import { moeda } from "../data";
import {
  Badge,
  Card,
  DataTable,
  Field,
  PageHeading,
  Stat,
} from "../components";
import { CampoData } from "../components/CampoData";
import { BarraFiltros } from "../components/BarraFiltros";
const local = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export function DashboardOperacional() {
  const {
    unidade,
    usuario,
    modo,
    orcamentos,
    servicos,
    contratos: contratosDemo,
    clientes,
    pecas,
    maoObra,
  } = useDados();
  const navigate = useNavigate();
  const [de, setDe] = useState(
      local(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
    ),
    [ate, setAte] = useState(local(new Date()));
  const demonstracao = () => {
    const iso = (o) =>
      o.data?.includes("/")
        ? o.data.split("/").reverse().join("-")
        : o.data || "";
    const os = orcamentos.filter((o) => iso(o) >= de && iso(o) <= ate),
      aprovados = os.filter((o) => o.status === "Aprovado");
    const grupos = {};
    os.forEach((o) => {
      const dia = iso(o);
      grupos[dia] ||= { dia, quantidade: 0, proposto: 0, aprovado: 0 };
      grupos[dia].quantidade++;
      grupos[dia].proposto += Number(o.valor) || 0;
      if (o.status === "Aprovado") grupos[dia].aprovado += Number(o.valor) || 0;
    });
    const cs = {};
    os.forEach((o) => {
      cs[o.cliente] ||= { nome: o.cliente, quantidade: 0, valor: 0 };
      cs[o.cliente].quantidade++;
      cs[o.cliente].valor += Number(o.valor) || 0;
    });
    return {
      orcamentos: os.length,
      valorOrcamentos: os.reduce((v, o) => v + Number(o.valor || 0), 0),
      aprovados: aprovados.length,
      valorAprovados: aprovados.reduce((v, o) => v + Number(o.valor || 0), 0),
      servicosEmAndamento: servicos.filter((s) => s.status === "Em execução")
        .length,
      recentes: os
        .slice(0, 5)
        .map((o) => ({
          ...o,
          numero: o.numero || `ORC-${o.id}`,
          status: o.status === "Enviado" ? "Emitido" : o.status,
        })),
      evolucao: Object.values(grupos).sort((a, b) =>
        a.dia.localeCompare(b.dia),
      ),
      clientesAtivos: Object.values(cs).sort((a, b) => b.valor - a.valor),
      clientes: clientes.filter((c) => c.status === "Ativo").length,
      itensCatalogo: pecas.length + maoObra.length,
      contratosAtivos: contratosDemo.filter((c) =>
        c.status === "Vigente" && c.ativo !== false,
      ).length,
    };
  };
  const inicio = local(new Date()),
    fim = new Date();
  fim.setDate(fim.getDate() + 7);
  const base = useRecursosApi(
    {
      painel: () =>
        modo === "api" ? api.painel(de, ate) : Promise.resolve(demonstracao()),
      agenda: () =>
        modo === "api"
          ? api.todaAgenda(`${inicio}T03:00:00Z`, `${local(fim)}T03:00:00Z`)
          : Promise.resolve({
              conteudo: servicos
                .filter((s) => cruzaPeriodo(s, inicio, local(fim)))
                .map((s) => ({
                  ...s,
                  titulo: s.titulo || s.servico,
                  dataProgramada: periodoServico(s).inicio,
                })),
            }),
      contratos: () =>
        modo === "api"
          ? api.listarContratos({ tamanho: 5, status: "VIGENTE", cadastro: "ATIVO" })
          : Promise.resolve({
              conteudo: contratosDemo
                .filter((c) => c.status === "Vigente" && c.ativo !== false)
                .map((c) => ({
                  ...c,
                  numero: c.numero || c.id,
                  objeto: c.objeto || c.servico,
                })),
            }),
    },
    `${modo}.${unidade}.${de}.${ate}.${modo === "demo" ? JSON.stringify([orcamentos, servicos, contratosDemo]) : ""}`,
  );
  const dados = base.recursos.painel.dados,
    agenda = base.recursos.agenda.dados?.conteudo || [],
    contratos = base.recursos.contratos.dados?.conteudo || [];
  const evolucao =
    dados?.evolucao.map((p) => ({
      ...p,
      nome: new Date(`${p.dia}T12:00:00`).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      }),
    })) || [];
  return (
    <>
      <PageHeading
        title="Dashboard"
        subtitle={`Visão geral · ${unidade}`}
        action={
          usuario.perfil !== "CONSULTA" && (
            <Link className="btn primary" to="/orcamentos/novo">
              Novo orçamento
            </Link>
          )
        }
      />
      <BarraFiltros
        padroes={{
          De: local(
            new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          ),
          Até: local(new Date()),
        }}
        onLimpar={() => {
          setDe(
            local(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
          );
          setAte(local(new Date()));
        }}
      >
        <Field label="De">
          <CampoData
            value={de}
            max={ate}
            onChange={(e) => setDe(e.target.value)}
          />
        </Field>
        <Field label="Até">
          <CampoData
            value={ate}
            min={de}
            onChange={(e) => setAte(e.target.value)}
          />
        </Field>
        <button
          className="btn outline"
          onClick={() => {
            setDe(
              local(
                new Date(new Date().getFullYear(), new Date().getMonth(), 1),
              ),
            );
            setAte(local(new Date()));
          }}
        >
          Este mês
        </button>
      </BarraFiltros>
      <AvisoErro
        erro={base.recursos.painel.erro}
        anterior={Boolean(dados)}
        onRetry={() => base.recarregar("painel")}
      />
      {base.recursos.painel.carregando && (
        <p role="status">Carregando indicadores...</p>
      )}
      <div className="stats-grid three">
        <Stat
          icon={FileText}
          label="Orçamentos criados"
          value={dados?.orcamentos ?? "—"}
          detail={dados ? moeda(dados.valorOrcamentos) : "Período selecionado"}
        />
        <Stat
          icon={CircleCheck}
          label="Aprovados desses orçamentos"
          value={dados?.aprovados ?? "—"}
          detail={dados ? moeda(dados.valorAprovados) : "Período selecionado"}
          tone="green"
        />
        <Stat
          icon={Wrench}
          label="Serviços em andamento"
          value={dados?.servicosEmAndamento ?? "—"}
          detail="Situação atual"
        />
      </div>
      <div className="dashboard-conteudo">
        <div className="dashboard-row three">
          <Card
            title="Orçamentos recentes"
            action={
              <Link className="text-link" to="/orcamentos">
                Ver todos →
              </Link>
            }
          >
            <DataTable
              rows={dados?.recentes || []}
              remote={
                base.recursos.painel.erro || base.recursos.painel.carregando
                  ? {
                      erro: base.recursos.painel.erro,
                      carregando: base.recursos.painel.carregando,
                      recarregar: () => base.recarregar("painel"),
                      pagina: 0,
                      totalPaginas: 1,
                      totalElementos: dados?.recentes?.length || 0,
                    }
                  : undefined
              }
              pageSize={5}
              onSelect={() => navigate("/orcamentos")}
              columns={[
                { key: "numero", label: "Nº" },
                { key: "cliente", label: "Cliente" },
                { key: "valor", label: "Valor", render: (o) => moeda(o.valor) },
                {
                  key: "status",
                  label: "Status",
                  render: (o) => <Badge>{o.status}</Badge>,
                },
              ]}
            />
          </Card>
          <Card
            title="Agenda dos próximos 7 dias"
            action={
              <Link className="text-link" to="/agenda">
                Ver agenda →
              </Link>
            }
          >
            <AvisoErro
              erro={base.recursos.agenda.erro}
              anterior={Boolean(agenda.length)}
              onRetry={() => base.recarregar("agenda")}
            />
            {base.recursos.agenda.carregando && (
              <p role="status">Carregando agenda...</p>
            )}
            <div className="agenda-small">
              {agenda.slice(0, 7).map((s) => (
                <div key={s.id}>
                  <span>
                    {new Date(
                      `${s.dataProgramada}T12:00:00`,
                    ).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                    })}
                  </span>
                  <i className="dot blue" />
                  <div>
                    <strong>{s.titulo}</strong>
                    <small>
                      {s.cliente} · {s.responsavel}
                    </small>
                  </div>
                </div>
              ))}
              {agenda.length === 0 &&
                !base.recursos.agenda.erro &&
                !base.recursos.agenda.carregando && (
                  <p>Nenhum serviço programado.</p>
                )}
            </div>
          </Card>
          <Card
            title="Contratos vigentes"
            action={
              <Link className="text-link" to="/contratos">
                Ver todos →
              </Link>
            }
          >
            <AvisoErro
              erro={base.recursos.contratos.erro}
              onRetry={() => base.recarregar("contratos")}
            />
            <DataTable
              rows={contratos}
              remote={
                base.recursos.contratos.erro ||
                base.recursos.contratos.carregando
                  ? {
                      erro: base.recursos.contratos.erro,
                      carregando: base.recursos.contratos.carregando,
                      recarregar: () => base.recarregar("contratos"),
                      pagina: 0,
                      totalPaginas: 1,
                      totalElementos: contratos.length,
                    }
                  : undefined
              }
              pageSize={5}
              columns={[
                { key: "numero", label: "Código" },
                { key: "cliente", label: "Cliente" },
                { key: "objeto", label: "Objeto" },
              ]}
              onSelect={() => navigate("/contratos")}
            />
          </Card>
        </div>
        <div className="dashboard-row two">
          <Card title="Evolução dos valores propostos">
            <p className="muted">
              Valores das revisões atuais, agrupados pelo dia de criação.
              Aprovação não representa recebimento.
            </p>
            <div className="painel-grafico">
              {evolucao.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={evolucao}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nome" />
                    <YAxis />
                    <Tooltip formatter={(v) => moeda(v)} />
                    <Line dataKey="proposto" name="Proposto" stroke="#155B57" />
                    <Line dataKey="aprovado" name="Aprovado" stroke="#62a99c" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p>Sem orçamentos no período.</p>
              )}
            </div>
          </Card>
          <Card title="Orçamentos por dia">
            <div className="painel-grafico">
              {evolucao.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={evolucao}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nome" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar
                      dataKey="quantidade"
                      name="Orçamentos"
                      fill="#155B57"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p>Sem orçamentos no período.</p>
              )}
            </div>
          </Card>
        </div>
        <div className="dashboard-row three">
          <Card title="Clientes com mais orçamentos">
            <DataTable
              rows={dados?.clientesAtivos || []}
              pageSize={5}
              columns={[
                { key: "nome", label: "Cliente" },
                { key: "quantidade", label: "Orçamentos" },
                {
                  key: "valor",
                  label: "Valor proposto",
                  render: (c) => moeda(c.valor),
                },
              ]}
            />
          </Card>
          <Card title="Cadastros da unidade">
            <p>{dados?.clientes ?? "—"} clientes ativos</p>
            <p>{dados?.itensCatalogo ?? "—"} itens ativos no catálogo</p>
            <p>{dados?.contratosAtivos ?? "—"} contratos vigentes</p>
            <Link className="btn outline" to="/cadastros">
              Abrir cadastros
            </Link>
          </Card>
          <Card title="Ações rápidas">
            <div className="button-pair">
              <Link className="btn outline" to="/orcamentos">
                Orçamentos
              </Link>
              <Link className="btn outline" to="/servicos">
                Serviços
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

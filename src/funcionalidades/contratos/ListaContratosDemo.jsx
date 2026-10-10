import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDados } from "../../context.jsx";
import { moeda } from "../../data.js";
import {
  Badge,
  Card,
  DataTable,
  DetailPanel,
  DetailRows,
  Modal,
  PageHeading,
  SelectFilter,
  TextFilter,
} from "../../components.jsx";
import { BarraFiltros } from "../../components/BarraFiltros.jsx";
import { alterarSituacaoContrato } from "../../demo/contratos.js";
import { HistoricoContratoDemo } from "./HistoricoContratoDemo.jsx";

export function ContratosPage() {
  const { contratos, salvar, setToast, usuario } = useDados();
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("");
  const [cadastro, setCadastro] = useState("Ativo");
  const [id, setId] = useState(null);
  const [confirmacao, setConfirmacao] = useState(null);
  const [previa, setPrevia] = useState(false);
  const selecionado = contratos.find((c) => c.id === id);
  const editar = !["CONSULTA", "Consulta"].includes(usuario.perfil);
  const filtrados = contratos.filter(
    (c) =>
      `${c.id} ${c.cliente} ${c.origem}`
        .toLowerCase()
        .includes(busca.toLowerCase()) &&
      (!status || c.status === status) &&
      (!cadastro || (c.ativo !== false) === (cadastro === "Ativo")),
  );
  function executar(acao) {
    try {
      salvar(
        "contratos",
        alterarSituacaoContrato(selecionado, acao, usuario.nome),
      );
      setConfirmacao(null);
      setToast("Contrato atualizado.");
    } catch (e) {
      setToast({ tipo: "erro", mensagem: e.message });
    }
  }
  return (
    <div className="contracts-page">
      <div className="contracts-left">
        <PageHeading
          title="Contratos"
          subtitle="Documentos vinculados a orçamentos aprovados."
          action={
            editar && (
              <button
                className="btn primary"
                onClick={() => navigate("/contratos/novo")}
              >
                Gerar contrato
              </button>
            )
          }
        />
        <Card className="filter-card">
          <BarraFiltros padroes={{ Cadastro: "Ativo" }}>
            <TextFilter
              value={busca}
              onChange={setBusca}
              placeholder="Número, cliente ou orçamento..."
            />
            <SelectFilter
              label="Situação"
              value={status}
              onChange={setStatus}
              options={[
                "Todos",
                "Aguardando assinatura",
                "Vigente",
                "Encerrado",
              ]}
            />
            <SelectFilter
              label="Cadastro"
              value={cadastro}
              onChange={setCadastro}
              options={["Todos", "Ativo", "Inativo"]}
            />
          </BarraFiltros>
        </Card>
        <Card
          title="Lista de contratos"
          action={<small>{filtrados.length} contratos</small>}
        >
          <DataTable
            rows={filtrados}
            selected={selecionado}
            onSelect={(c) => setId(c.id)}
            pageSize={12}
            columns={[
              { key: "id", label: "Número" },
              { key: "cliente", label: "Cliente" },
              {
                key: "origem",
                label: "Orçamento",
                render: (c) => `ORC-${c.origem}`,
              },
              { key: "valor", label: "Valor", render: (c) => moeda(c.valor) },
              {
                key: "status",
                label: "Situação",
                render: (c) => <Badge>{c.status}</Badge>,
              },
              {
                key: "ativo",
                label: "Cadastro",
                render: (c) => (c.ativo !== false ? "Ativo" : "Inativo"),
              },
            ]}
          />
        </Card>
      </div>
      {selecionado && (
        <DetailPanel
          title={selecionado.id}
          status={selecionado.status}
          onClose={() => setId(null)}
          footer={
            <>
              <button
                className="btn primary full"
                onClick={() => setPrevia(true)}
              >
                Visualizar contrato
              </button>
              <HistoricoContratoDemo contrato={selecionado} />
              {editar && (
                <>
                  {selecionado.status !== "Encerrado" && (
                    <button
                      className="btn outline full"
                      onClick={() =>
                        navigate(`/contratos/novo?id=${selecionado.id}`)
                      }
                    >
                      Editar
                    </button>
                  )}
                  {selecionado.status === "Aguardando assinatura" && (
                    <button
                      className="btn outline full"
                      onClick={() => executar("vigente")}
                    >
                      Marcar como vigente
                    </button>
                  )}
                  {selecionado.status === "Vigente" && (
                    <button
                      className="btn outline full"
                      onClick={() => setConfirmacao("encerrar")}
                    >
                      Encerrar
                    </button>
                  )}
                  <button
                    className="btn outline full"
                    onClick={() =>
                      selecionado.ativo !== false
                        ? setConfirmacao("inativar")
                        : executar("reativar")
                    }
                  >
                    {selecionado.ativo !== false
                      ? "Inativar cadastro"
                      : "Reativar cadastro"}
                  </button>
                </>
              )}
            </>
          }
        >
          <DetailRows
            rows={[
              ["Cliente", selecionado.cliente],
              ["Orçamento", `ORC-${selecionado.origem}`],
              ["Valor", moeda(selecionado.valor)],
              ["Início", selecionado.inicio],
              ["Término", selecionado.termino],
              ["Versão", selecionado.numeroVersao || 1],
              ["Objeto", selecionado.servico],
            ]}
          />
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
          onClose={() => setConfirmacao(null)}
          footer={
            <button
              className="btn primary"
              onClick={() => executar(confirmacao)}
            >
              Confirmar
            </button>
          }
        >
          <p>
            {confirmacao === "encerrar"
              ? "Após encerrar, o conteúdo não poderá ser editado ou restaurado. A consulta e o histórico continuam disponíveis."
              : "O cadastro ficará inativo. A situação, a edição e o histórico serão preservados."}
          </p>
        </Modal>
      )}
      {previa && selecionado && (
        <Modal
          title={selecionado.id}
          wide
          proteger={false}
          onClose={() => setPrevia(false)}
        >
          <article
            className="contract-preview"
            dangerouslySetInnerHTML={{
              __html:
                selecionado.rascunho || "<p>Contrato de demonstração.</p>",
            }}
          />
        </Modal>
      )}
    </div>
  );
}

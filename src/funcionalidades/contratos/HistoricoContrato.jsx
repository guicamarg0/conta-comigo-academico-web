import React, { useCallback, useState } from "react";
import { api } from "../../api.js";
import { usePaginaApi } from "../../remote.js";
import { useDados } from "../../context.jsx";
import { DataTable, Modal } from "../../components.jsx";

const dataHora = (data) =>
  data ? new Date(data).toLocaleString("pt-BR") : "—";
export function HistoricoContrato({ contrato, podeEditar, onRestaurado }) {
  const { setToast, unidade } = useDados();
  const [aberto, setAberto] = useState(false);
  const [aba, setAba] = useState("versoes");
  const [previa, setPrevia] = useState(null);
  const [confirmacao, setConfirmacao] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const carregar = useCallback(
    (p) =>
      aba === "versoes"
        ? api.versoesContrato(contrato.id, p)
        : api.atividadesContrato(contrato.id, p),
    [contrato.id, aba],
  );
  const remoto = usePaginaApi(carregar, {
    ativo: aberto,
    unidade,
    status: aba,
    tamanho: 10,
  });
  async function restaurar() {
    if (salvando) return;
    setSalvando(true);
    setErro("");
    try {
      const atualizado = await api.restaurarContrato(contrato.id, previa.id);
      setConfirmacao(false);
      setPrevia(null);
      remoto.recarregar();
      onRestaurado?.(atualizado);
      setToast(`Conteúdo restaurado como versão ${atualizado.numeroVersao}.`);
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  }
  return (
    <>
      <button
        className="btn outline full"
        type="button"
        onClick={() => setAberto(true)}
      >
        Histórico do contrato
      </button>
      {aberto && (
        <Modal
          title={`Histórico · ${contrato.numero}`}
          wide
          proteger={false}
          onClose={() => !salvando && setAberto(false)}
        >
          <div
            className="button-row"
            role="tablist"
            aria-label="Histórico do contrato"
          >
            <button
              className="btn outline"
              role="tab"
              aria-selected={aba === "versoes"}
              onClick={() => setAba("versoes")}
            >
              Versões do conteúdo
            </button>
            <button
              className="btn outline"
              role="tab"
              aria-selected={aba === "atividades"}
              onClick={() => setAba("atividades")}
            >
              Atividades
            </button>
          </div>
          <DataTable
            rows={remoto.conteudo}
            remote={remoto}
            pageSize={10}
            onSelect={aba === "versoes" ? setPrevia : undefined}
            columns={
              aba === "versoes"
                ? [
                    { key: "numeroVersao", label: "Versão" },
                    { key: "autor", label: "Autor" },
                    {
                      key: "criadoEm",
                      label: "Data e hora",
                      render: (v) => dataHora(v.criadoEm),
                    },
                  ]
                : [
                    { key: "descricao", label: "Atividade" },
                    { key: "autor", label: "Autor" },
                    {
                      key: "ocorridoEm",
                      label: "Data e hora",
                      render: (v) => dataHora(v.ocorridoEm),
                    },
                  ]
            }
          />
          {erro && (
            <p className="inline-error" role="alert">
              {erro}
            </p>
          )}
        </Modal>
      )}
      {previa && (
        <Modal
          title={`Prévia · versão ${previa.numeroVersao}`}
          wide
          proteger={false}
          onClose={() => !salvando && setPrevia(null)}
          footer={
            <>
              <button
                className="btn outline"
                onClick={() => setPrevia(null)}
                disabled={salvando}
              >
                Fechar
              </button>
              {podeEditar && contrato.status !== "ENCERRADO" && (
                <button
                  className="btn primary"
                  onClick={() => setConfirmacao(true)}
                  disabled={salvando}
                >
                  Restaurar esta versão
                </button>
              )}
            </>
          }
        >
          <p className="muted">
            {previa.autor} · {dataHora(previa.criadoEm)}
          </p>
          <article
            className="contract-preview"
            dangerouslySetInnerHTML={{ __html: previa.conteudo }}
          />
        </Modal>
      )}
      {confirmacao && (
        <Modal
          title="Restaurar conteúdo?"
          proteger={false}
          onClose={() => !salvando && setConfirmacao(false)}
          footer={
            <>
              <button
                className="btn outline"
                disabled={salvando}
                onClick={() => setConfirmacao(false)}
              >
                Cancelar
              </button>
              <button
                className="btn primary"
                disabled={salvando}
                onClick={restaurar}
              >
                {salvando ? "Restaurando..." : "Confirmar restauração"}
              </button>
            </>
          }
        >
          <p>
            O texto da versão {previa.numeroVersao} será salvo em uma nova
            versão. Situação, cadastro e vínculos atuais serão preservados.
            Alterações ainda não salvas no editor serão substituídas.
          </p>
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

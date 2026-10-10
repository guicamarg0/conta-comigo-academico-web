import React, { useState } from "react";
import { DataTable, Modal } from "../../components.jsx";
import { useDados } from "../../context.jsx";
import { versionarContrato } from "../../demo/contratos.js";

export function HistoricoContratoDemo({ contrato, onRestaurado }) {
  const { salvar, setToast, usuario } = useDados();
  const [aberto, setAberto] = useState(false);
  const [aba, setAba] = useState("versoes");
  const [previa, setPrevia] = useState(null);
  const [confirmar, setConfirmar] = useState(false);
  const data = (valor) => new Date(valor).toLocaleString("pt-BR");
  return (
    <>
      <button
        className="btn outline"
        type="button"
        onClick={() => setAberto(true)}
      >
        Histórico do contrato
      </button>
      {aberto && (
        <Modal
          title={`Histórico · ${contrato.id}`}
          wide
          proteger={false}
          onClose={() => setAberto(false)}
        >
          <div className="button-pair">
            <button
              className={`btn ${aba === "versoes" ? "primary" : "outline"}`}
              onClick={() => setAba("versoes")}
            >
              Versões do conteúdo
            </button>
            <button
              className={`btn ${aba === "atividades" ? "primary" : "outline"}`}
              onClick={() => setAba("atividades")}
            >
              Atividades
            </button>
          </div>
          {aba === "versoes" ? (
            <DataTable
              rows={contrato.versoes || []}
              pageSize={10}
              onSelect={setPrevia}
              columns={[
                { key: "numeroVersao", label: "Versão" },
                { key: "autor", label: "Autor" },
                {
                  key: "criadoEm",
                  label: "Data",
                  render: (v) => data(v.criadoEm),
                },
              ]}
            />
          ) : (
            <DataTable
              rows={contrato.atividades || []}
              pageSize={10}
              columns={[
                { key: "descricao", label: "Atividade" },
                { key: "autor", label: "Autor" },
                {
                  key: "ocorridoEm",
                  label: "Data",
                  render: (v) => data(v.ocorridoEm),
                },
              ]}
            />
          )}
        </Modal>
      )}
      {previa && (
        <Modal
          title={`Versão ${previa.numeroVersao}`}
          wide
          proteger={false}
          onClose={() => setPrevia(null)}
          footer={
            !["CONSULTA", "Consulta"].includes(usuario.perfil) &&
            contrato.status !== "Encerrado" && (
              <button
                className="btn primary"
                onClick={() => setConfirmar(true)}
              >
                Restaurar conteúdo
              </button>
            )
          }
        >
          <article
            className="contract-preview"
            dangerouslySetInnerHTML={{ __html: previa.conteudo }}
          />
        </Modal>
      )}
      {confirmar && (
        <Modal
          title="Restaurar conteúdo?"
          proteger={false}
          onClose={() => setConfirmar(false)}
          footer={
            <button
              className="btn primary"
              onClick={() => {
                try {
                  const atualizado = versionarContrato(
                    contrato,
                    { rascunho: previa.conteudo },
                    usuario.nome,
                    true,
                  );
                  salvar("contratos", atualizado);
                  onRestaurado?.(atualizado);
                  setConfirmar(false);
                  setPrevia(null);
                  setToast("Conteúdo restaurado como uma nova versão.");
                } catch (e) {
                  setToast({ tipo: "erro", mensagem: e.message });
                }
              }}
            >
              Restaurar
            </button>
          }
        >
          <p>
            O texto escolhido será salvo em uma nova versão. Situação, cadastro
            e vínculos atuais serão preservados. Alterações ainda não salvas no
            editor serão substituídas.
          </p>
        </Modal>
      )}
    </>
  );
}

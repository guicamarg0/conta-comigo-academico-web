import React, { useState } from "react";
import { Modal, DataTable } from "../components.jsx";
import { lerPlanilha, baixarModelo } from "../importacaoPlanilha.js";
import { moeda } from "../data.js";
export function ImportarItens({ onClose, onImport, orcamento = false }) {
  const [registros, setRegistros] = useState([]),
    [erros, setErros] = useState([]),
    [ocupado, setOcupado] = useState(false),
    [resultado, setResultado] = useState("");
  async function arquivo(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setOcupado(true);
    setErros([]);
    setRegistros([]);
    setResultado("");
    try {
      const r = await lerPlanilha(file);
      setRegistros(r.registros);
      setErros(r.erros);
    } catch (e) {
      setErros([e.message]);
    } finally {
      setOcupado(false);
    }
  }
  async function importar() {
    setOcupado(true);
    try {
      const r = await onImport(registros);
      if (r?.falhas?.length) {
        setRegistros(r.falhas.map((f) => f.registro));
        setErros(r.falhas.map((f) => `Linha ${f.registro.linha}: ${f.erro}`));
        setResultado(
          `${r.sucessos} itens importados. Somente as linhas que falharam permanecem para tentar novamente.`,
        );
      } else {
        onClose();
      }
    } catch (e) {
      setErros([e.message]);
    } finally {
      setOcupado(false);
    }
  }
  return (
    <Modal
      wide
      title={orcamento ? "Importar itens do orçamento" : "Importar catálogo"}
      onClose={() => !ocupado && onClose()}
      footer={
        <>
          <button className="btn outline" disabled={ocupado} onClick={onClose}>
            Fechar
          </button>
          <button
            className="btn primary"
            disabled={
              ocupado || !registros.length || (erros.length > 0 && !resultado)
            }
            onClick={importar}
          >
            {ocupado ? "Processando..." : `Importar ${registros.length} itens`}
          </button>
        </>
      }
    >
      <p>
        Colunas nesta ordem:{" "}
        <strong>CODIGO | DESC | UNIDADE DE MEDIDA | VALOR UNITARIO</strong>.
      </p>
      <p>
        {orcamento
          ? "Os itens serão adicionados na ordem da planilha, com quantidade 1. Ajuste as quantidades depois."
          : "Serão criados novos itens. Códigos já cadastrados serão informados como erros."}
      </p>
      <div className="importar-toolbar">
        <button
          className="btn outline"
          disabled={ocupado}
          onClick={() => baixarModelo("csv")}
        >
          Baixar modelo CSV
        </button>
        <button
          className="btn outline"
          disabled={ocupado}
          onClick={() => baixarModelo("xlsx")}
        >
          Baixar modelo Excel
        </button>
        <label className="field">
          Selecionar planilha
          <input
            type="file"
            accept=".csv,.xlsx"
            disabled={ocupado}
            onChange={arquivo}
          />
        </label>
      </div>
      <small>
        CSV ou Excel .xlsx, primeira aba, até 500 itens e 5 MB. O modelo contém
        uma linha de exemplo: substitua pelos seus itens.
      </small>
      {resultado && <p role="status">{resultado}</p>}
      {erros.length > 0 && (
        <div className="inline-error" role="alert">
          {erros.map((e, n) => (
            <p key={n}>{e}</p>
          ))}
        </div>
      )}
      {registros.length > 0 && (
        <DataTable
          rows={registros.map((r, n) => ({ ...r, id: n }))}
          columns={[
            { key: "codigo", label: "Código" },
            { key: "descricao", label: "Descrição" },
            { key: "unidade", label: "Unidade" },
            {
              key: "valor",
              label: "Valor unitário",
              render: (r) => moeda(r.valor),
            },
          ]}
        />
      )}
    </Modal>
  );
}

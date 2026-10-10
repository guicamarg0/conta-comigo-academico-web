import { gerencia } from "../permissoes.js";
import { SelectPesquisavel } from "../components/SelectPesquisavel";
import React, { useState } from "react";
import { CreditCard } from "lucide-react";
import { api } from "../api.js";
import { useDados } from "../context.jsx";
import { Badge, Field, Modal, SelectFilter } from "../components.jsx";
import { CadastroLista } from "../components/CadastroLista.jsx";
import { useCadastroDados } from "../components/useCadastroDados.js";
const vazio = {
  tipo: "PIX",
  nomeExibicao: "",
  instrucoes: "",
  ativa: true,
  padrao: false,
};
const inicial = { formasRecebimento: [] };
const tipos = {
  PIX: "Pix",
  CONTA_BANCARIA: "Transferência bancária",
  OUTRO: "Outro",
};
async function carregarFormasPagamento() {
  try {
    return await api.consultarFormasPagamento();
  } catch (erro) {
    if (erro.status === 400 || erro.status === 404)
      throw new Error(
        "Não foi possível carregar as formas de pagamento. Confira se a API está atualizada e tente novamente.",
      );
    throw erro;
  }
}
export function FormasPagamentoPage() {
  const { usuario, setToast } = useDados();
  const dados = useCadastroDados(
    carregarFormasPagamento,
    "formasPagamento",
    inicial,
  );
  const podeEditar = gerencia(dados.apiMode ? "api" : "demo", usuario);
  const [busca, setBusca] = useState(""),
    [status, setStatus] = useState("");
  const [selecionado, setSelecionado] = useState(null),
    [modal, setModal] = useState(false),
    [form, setForm] = useState(vazio),
    [indice, setIndice] = useState(-1),
    [salvando, setSalvando] = useState(false);
  const formas = (dados.dados?.formasRecebimento || []).map((f, i) => ({
    ...f,
    id: String(i),
    indice: i,
  }));
  const visiveis = formas.filter(
    (f) =>
      `${f.nomeExibicao} ${f.instrucoes} ${tipos[f.tipo]}`
        .toLowerCase()
        .includes(busca.toLowerCase()) &&
      (!status || (f.ativa ? "ATIVO" : "INATIVO") === status),
  );
  const abrir = (item) => {
    dados.setErro("");
    setIndice(item?.indice ?? -1);
    setForm(
      item
        ? { ...item }
        : { ...vazio, padrao: !formas.some((f) => f.ativa && f.padrao) },
    );
    setModal(true);
  };
  async function gravar(novas, selecionada) {
    const resposta = dados.apiMode
      ? await api.salvarFormasPagamento(novas)
      : { ...dados.dados, formasRecebimento: novas };
    if (dados.apiMode) dados.setDados(resposta);
    else dados.salvarDemo(resposta);
    const referencia = novas[selecionada];
    const posicao = resposta.formasRecebimento.findIndex(
      (f) =>
        f.nomeExibicao?.trim() === referencia?.nomeExibicao?.trim() &&
        f.tipo === referencia?.tipo &&
        (f.instrucoes || "").trim() === (referencia?.instrucoes || "").trim(),
    );
    const atual = resposta.formasRecebimento[posicao];
    setSelecionado(
      atual ? { ...atual, id: String(posicao), indice: posicao } : null,
    );
  }
  async function salvar(e) {
    e.preventDefault();
    if (salvando) return;
    setSalvando(true);
    dados.setErro("");
    const novas = (dados.dados.formasRecebimento || []).map((f) => ({ ...f }));
    const { id, indice: removido, ...valor } = form;
    const posicao = indice < 0 ? novas.length : indice;
    novas[posicao] = { ...valor, ativa: valor.padrao || valor.ativa };
    if (valor.padrao)
      novas.forEach((f, i) => {
        f.padrao = i === posicao;
      });
    try {
      await gravar(novas, posicao);
      setModal(false);
      setToast("Forma de pagamento salva.");
    } catch (f) {
      dados.setErro(f.message);
    } finally {
      setSalvando(false);
    }
  }
  async function alterarStatus() {
    if (selecionado.padrao)
      return dados.setErro(
        "Escolha outra forma padrão antes de inativar esta opção.",
      );
    setSalvando(true);
    dados.setErro("");
    try {
      const novas = dados.dados.formasRecebimento.map((f, i) => ({
        ...f,
        ativa: i === selecionado.indice ? !f.ativa : f.ativa,
      }));
      await gravar(novas, selecionado.indice);
      setToast("Forma de pagamento atualizada.");
    } catch (e) {
      dados.setErro(e.message);
    } finally {
      setSalvando(false);
    }
  }
  return (
    <>
      <CadastroLista
        onRetry={dados.recarregar}
        titulo="Formas de pagamento"
        descricao="Cadastre opções disponíveis em orçamentos e contratos."
        novoTexto="Nova forma de pagamento"
        onNovo={podeEditar && !dados.carregando ? () => abrir() : undefined}
        icone={CreditCard}
        indicadores={[
          { label: "Formas cadastradas", value: formas.length },
          {
            label: "Ativas",
            value: formas.filter((f) => f.ativa).length,
            tone: "green",
          },
          {
            label: "Inativas",
            value: formas.filter((f) => !f.ativa).length,
            tone: "red",
          },
        ]}
        rows={visiveis}
        busca={busca}
        setBusca={setBusca}
        placeholder="Buscar nome, tipo ou instruções..."
        filtros={
          <SelectFilter
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              "Todos",
              { value: "ATIVO", label: "Ativo" },
              { value: "INATIVO", label: "Inativo" },
            ]}
          />
        }
        columns={[
          {
            key: "nomeExibicao",
            label: "Nome",
            render: (f) => <strong>{f.nomeExibicao}</strong>,
          },
          { key: "tipo", label: "Tipo", render: (f) => tipos[f.tipo] },
          { key: "instrucoes", label: "Instruções" },
          {
            key: "padrao",
            label: "Padrão",
            render: (f) => (f.padrao ? "Sim" : "—"),
          },
          {
            key: "ativa",
            label: "Status",
            render: (f) => <Badge>{f.ativa ? "Ativo" : "Inativo"}</Badge>,
          },
        ]}
        selecionado={selecionado}
        setSelecionado={setSelecionado}
        nome={selecionado?.nomeExibicao}
        status={selecionado?.ativa ? "Ativo" : "Inativo"}
        detalhes={
          selecionado
            ? [
                ["Nome", selecionado.nomeExibicao],
                ["Tipo", tipos[selecionado.tipo]],
                ["Instruções", selecionado.instrucoes],
                ["Forma padrão", selecionado.padrao ? "Sim" : "Não"],
              ]
            : []
        }
        rodape={
          podeEditar && (
            <>
              <button
                className="btn danger-outline"
                disabled={salvando || selecionado?.padrao}
                onClick={alterarStatus}
              >
                {selecionado?.ativa ? "Inativar" : "Reativar"} forma
              </button>
              <button
                className="btn primary"
                disabled={salvando}
                data-salvando={salvando || undefined}
                onClick={() => abrir(selecionado)}
              >
                Editar forma
              </button>
            </>
          )
        }
        erro={!modal ? dados.erro : ""}
        carregando={dados.carregando}
      />
      {modal && (
        <Modal
          busy={salvando}
          title={
            indice < 0 ? "Nova forma de pagamento" : "Editar forma de pagamento"
          }
          onClose={() => setModal(false)}
          footer={
            <>
              <button
                className="btn outline"
                disabled={salvando}
                data-salvando={salvando || undefined}
                onClick={() => setModal(false)}
              >
                Cancelar
              </button>
              <button
                className="btn primary"
                form="forma-form"
                disabled={salvando}
                data-salvando={salvando || undefined}
              >
                {salvando ? "Salvando..." : "Salvar forma"}
              </button>
            </>
          }
        >
          <form id="forma-form" className="form-grid" onSubmit={salvar}>
            <Field label="Nome *">
              <input
                required
                value={form.nomeExibicao}
                onChange={(e) =>
                  setForm({ ...form, nomeExibicao: e.target.value })
                }
              />
            </Field>
            <Field label="Tipo *">
              <SelectPesquisavel
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              >
                {Object.entries(tipos).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </SelectPesquisavel>
            </Field>
            <Field label="Instruções *" className="wide">
              <textarea
                rows={5}
                maxLength={1000}
                required
                value={form.instrucoes}
                onChange={(e) =>
                  setForm({ ...form, instrucoes: e.target.value })
                }
              />
            </Field>
            <label>
              <input
                type="checkbox"
                checked={form.ativa}
                disabled={form.padrao}
                onChange={(e) => setForm({ ...form, ativa: e.target.checked })}
              />{" "}
              Ativa
            </label>
            <label>
              <input
                type="checkbox"
                checked={form.padrao}
                onChange={(e) =>
                  setForm({
                    ...form,
                    padrao: e.target.checked,
                    ativa: e.target.checked || form.ativa,
                  })
                }
              />{" "}
              Forma padrão
            </label>
            {dados.erro && (
              <p className="inline-error" role="alert">
                {dados.erro}
              </p>
            )}
          </form>
        </Modal>
      )}
    </>
  );
}

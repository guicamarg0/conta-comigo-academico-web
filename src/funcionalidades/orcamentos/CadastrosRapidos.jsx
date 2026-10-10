import { SelectPesquisavel } from "../../components/SelectPesquisavel";
import React, { useState } from "react";
import { Field, Modal } from "../../components.jsx";
import { UnidadeSelect } from "../../components/UnidadeSelect.jsx";
import { CampoCep } from "../../components/CampoCep.jsx";
import { formatarDocumento, validarDocumento } from "../../documento.js";
import { formatarTelefone, validarTelefone } from "../../telefone.js";

const clienteInicial = {
  tipo: "PJ",
  razao: "",
  nome: "",
  documento: "",
  contato: "",
  telefone: "",
  email: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
};

export function ClienteRapido({ onClose, onSave }) {
  const [form, setForm] = useState(clienteInicial);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [documentoTocado, setDocumentoTocado] = useState(false);
  const [telefoneTocado, setTelefoneTocado] = useState(false);
  const set = (chave, valor) =>
    setForm((atual) => ({ ...atual, [chave]: valor }));
  async function submit(evento) {
    evento.preventDefault();
    if (salvando) return;
    setErro("");
    setDocumentoTocado(true);
    setTelefoneTocado(true);
    if (!validarDocumento(form.documento, form.tipo)) {
      setErro(`Informe um ${form.tipo === "PJ" ? "CNPJ" : "CPF"} válido.`);
      return;
    }
    if (form.telefone.trim() && !validarTelefone(form.telefone)) {
      setErro("Informe um telefone válido com DDD e 8 ou 9 dígitos.");
      return;
    }
    if (!form.telefone.trim() && !form.email.trim()) {
      setErro("Informe telefone ou e-mail para o contato.");
      return;
    }
    setSalvando(true);
    try {
      await onSave(form);
      onClose();
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setSalvando(false);
    }
  }
  return (
    <Modal
      busy={salvando}
      title="Cadastro rápido de cliente"
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn outline" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn primary"
            form="cliente-rapido-form"
            disabled={salvando}
          >
            Salvar e selecionar
          </button>
        </>
      }
    >
      <form id="cliente-rapido-form" className="form-grid" onSubmit={submit}>
        <Field label="Tipo de pessoa">
          <SelectPesquisavel
            value={form.tipo}
            onChange={(e) => {
              setForm((atual) => ({
                ...atual,
                tipo: e.target.value,
                documento: "",
              }));
              setDocumentoTocado(false);
            }}
          >
            <option value="PJ">Pessoa jurídica</option>
            <option value="PF">Pessoa física</option>
          </SelectPesquisavel>
        </Field>
        <Field
          label={form.tipo === "PJ" ? "Razão social *" : "Nome completo *"}
        >
          <input
            required
            value={form.razao}
            onChange={(e) => set("razao", e.target.value)}
            placeholder={
              form.tipo === "PJ"
                ? "Razão social do cliente"
                : "Nome completo do cliente"
            }
          />
        </Field>
        <Field
          label={form.tipo === "PJ" ? "Nome fantasia" : "Nome de exibição"}
        >
          <input
            value={form.nome}
            onChange={(e) => set("nome", e.target.value)}
            placeholder="Nome de exibição do cliente"
          />
        </Field>
        <Field
          label={form.tipo === "PJ" ? "CNPJ *" : "CPF *"}
          error={
            documentoTocado &&
            form.documento &&
            !validarDocumento(form.documento, form.tipo)
              ? `Confira os dígitos do ${form.tipo === "PJ" ? "CNPJ" : "CPF"}.`
              : undefined
          }
        >
          <input
            required
            inputMode="numeric"
            maxLength={form.tipo === "PJ" ? 18 : 14}
            value={form.documento}
            onChange={(e) =>
              set("documento", formatarDocumento(e.target.value, form.tipo))
            }
            onBlur={() => setDocumentoTocado(true)}
            placeholder={
              form.tipo === "PJ" ? "00.000.000/0000-00" : "000.000.000-00"
            }
          />
        </Field>
        <Field label="Nome do contato">
          <input
            value={form.contato}
            onChange={(e) => set("contato", e.target.value)}
            placeholder="Nome do contato"
          />
        </Field>
        <Field
          label="Telefone"
          error={
            telefoneTocado && form.telefone && !validarTelefone(form.telefone)
              ? "Use DDD e 8 ou 9 dígitos; +55 é opcional."
              : undefined
          }
        >
          <input
            type="tel"
            value={form.telefone}
            onChange={(e) => set("telefone", formatarTelefone(e.target.value))}
            onBlur={() => setTelefoneTocado(true)}
            placeholder="(00) 00000-0000"
          />
        </Field>
        <Field label="E-mail">
          <input
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="contato@example.com"
          />
        </Field>
        <CampoCep form={form} setForm={setForm} />
        {[
          ["logradouro", "Logradouro"],
          ["numero", "Número"],
          ["complemento", "Complemento"],
          ["bairro", "Bairro"],
          ["cidade", "Cidade"],
          ["estado", "UF"],
        ].map(([chave, label]) => (
          <Field key={chave} label={label}>
            <input
              value={form[chave]}
              maxLength={chave === "estado" ? 2 : undefined}
              onChange={(e) =>
                set(
                  chave,
                  chave === "estado"
                    ? e.target.value.toUpperCase()
                    : e.target.value,
                )
              }
            />
          </Field>
        ))}
        <p className="notice info">
          Informe telefone ou e-mail para o contato.
        </p>
        {erro && (
          <p className="inline-error" role="alert">
            {erro}
          </p>
        )}
      </form>
    </Modal>
  );
}

export function ItemRapido({ tipo, onClose, onSave }) {
  const [form, setForm] = useState({
    nome: "",
    unidade: tipo === "Mão de obra" ? "Hora" : "UN",
    valor: "",
    codigo: "",
  });
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const set = (chave, valor) =>
    setForm((atual) => ({ ...atual, [chave]: valor }));
  async function submit(evento) {
    evento.preventDefault();
    if (salvando) return;
    setErro("");
    setSalvando(true);
    try {
      await onSave({ ...form, tipo });
      onClose();
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setSalvando(false);
    }
  }
  return (
    <Modal
      busy={salvando}
      title={`Novo item · ${tipo}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn outline" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn primary"
            form="item-rapido-form"
            disabled={salvando}
          >
            Salvar no catálogo e selecionar
          </button>
        </>
      }
    >
      <form id="item-rapido-form" className="form-grid" onSubmit={submit}>
        <Field label="Descrição *">
          <input
            required
            value={form.nome}
            onChange={(e) => set("nome", e.target.value)}
            placeholder="Ex.: Rolamento 6205 ZZ"
          />
        </Field>
        <Field label="Código">
          <input
            value={form.codigo}
            onChange={(e) => set("codigo", e.target.value)}
            placeholder="Ex.: PC-001"
          />
        </Field>
        <Field label="Unidade de medida *">
          <UnidadeSelect
            value={form.unidade}
            onChange={(valor) => set("unidade", valor)}
            required
          />
        </Field>
        <Field label="Valor unitário (R$) *">
          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={form.valor}
            onChange={(e) => set("valor", e.target.value)}
            placeholder="0,00"
          />
        </Field>
        {erro && (
          <p className="inline-error" role="alert" role="alert">
            {erro}
          </p>
        )}
      </form>
    </Modal>
  );
}

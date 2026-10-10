import { gerencia } from "../permissoes.js";
import { CampoCep } from "../components/CampoCep.jsx";
import { destacarCampo } from "../validacao.js";
import { SelectPesquisavel } from "../components/SelectPesquisavel";
import React, { useState } from "react";
import { Building2 } from "lucide-react";
import { api } from "../api.js";
import { useDados } from "../context.jsx";
import { Badge, Field, Modal, SelectFilter } from "../components.jsx";
import { CadastroLista } from "../components/CadastroLista.jsx";
import { useCadastroDados } from "../components/useCadastroDados.js";
import {
  formatarDocumento,
  somenteDigitos,
  validarDocumento,
} from "../documento.js";
const vazio = {
  tipo: "MATRIZ",
  matrizId: "",
  razaoSocial: "",
  nomeFantasia: "",
  cnpj: "",
  tipoDocumento: "PJ",
  inscricaoEstadual: "",
  telefone: "",
  email: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
  ativo: true,
  logoUrl: null,
};
export function EmpresasPage() {
  const dados = useCadastroDados(api.listarEmpresas, "empresas");
  const { usuario, setToast } = useDados();
  const podeEditar = gerencia(dados.apiMode ? "api" : "demo", usuario);
  const lista = dados.dados;
  const [carregandoLogo, setCarregandoLogo] = useState(false);
  const [busca, setBusca] = useState(""),
    [status, setStatus] = useState(""),
    [tipo, setTipo] = useState(""),
    [selecionado, setSelecionado] = useState(null),
    [modal, setModal] = useState(false),
    [form, setForm] = useState(vazio),
    [salvando, setSalvando] = useState(false);
  const erro = dados.erro,
    setErro = dados.setErro;
  const editar = (chave, valor) =>
    setForm((atual) => ({ ...atual, [chave]: valor }));
  async function salvar(e) {
    e.preventDefault();
    if (salvando || carregandoLogo) return;
    const valor = {
      ...form,
      cnpj: somenteDigitos(form.cnpj),
      matrizId: form.tipo === "FILIAL" ? form.matrizId || null : null,
    };
    if (!validarDocumento(valor.cnpj, form.tipoDocumento)) {
      const nome = form.tipoDocumento === "PF" ? "CPF" : "CNPJ";
      destacarCampo(nome, `Informe um ${nome} válido.`);
      return setErro(`Informe um ${nome} válido.`);
    }
    setSalvando(true);
    setErro("");
    try {
      const salvo = dados.apiMode
        ? await (form.id
            ? api.atualizarEmpresa(form.id, valor)
            : api.criarEmpresa(valor))
        : {
            ...valor,
            id: form.id || crypto.randomUUID(),
            matrizNome: lista.find((e) => e.id === valor.matrizId)?.razaoSocial,
          };
      const novas = form.id
        ? lista.map((e) => (e.id === salvo.id ? salvo : e))
        : [...lista, salvo];
      if (dados.apiMode) dados.setDados(novas);
      else dados.salvarDemo(novas);
      setSelecionado(salvo);
      setModal(false);
      setToast("Empresa salva com sucesso.");
    } catch (f) {
      setErro(f.message);
    } finally {
      setSalvando(false);
    }
  }
  async function carregarLogo(event) {
    const arquivo = event.target.files?.[0];
    event.target.value = "";
    if (!arquivo) return;
    if (
      !["image/png", "image/jpeg"].includes(arquivo.type) ||
      arquivo.size > 5 * 1024 * 1024
    )
      return setErro("Escolha uma imagem PNG ou JPG de até 5 MB.");
    setCarregandoLogo(true);
    setErro("");
    try {
      const imagem = await createImageBitmap(arquivo);
      const escala = Math.min(1, 800 / Math.max(imagem.width, imagem.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(imagem.width * escala));
      canvas.height = Math.max(1, Math.round(imagem.height * escala));
      canvas
        .getContext("2d")
        .drawImage(imagem, 0, 0, canvas.width, canvas.height);
      imagem.close();
      const logo = canvas.toDataURL("image/png");
      if (logo.length > 700000)
        throw new Error(
          "A imagem ficou muito grande. Escolha uma logo mais simples.",
        );
      editar("logoUrl", logo);
    } catch (e) {
      setErro(e.message || "Não foi possível ler a imagem.");
    } finally {
      setCarregandoLogo(false);
    }
  }
  const abrir = (empresa = vazio) => {
    setErro("");
    setForm({
      ...vazio,
      ...empresa,
      tipoDocumento: somenteDigitos(empresa.cnpj).length === 11 ? "PF" : "PJ",
      cnpj: empresa.cnpj ? formatarDocumento(empresa.cnpj) : "",
    });
    setModal(true);
  };
  async function alterarStatus() {
    setSalvando(true);
    setErro("");
    try {
      if (dados.apiMode)
        await (selecionado.ativo
          ? api.inativarEmpresa(selecionado.id)
          : api.reativarEmpresa(selecionado.id));
      const salvo = { ...selecionado, ativo: !selecionado.ativo },
        novas = lista.map((e) => (e.id === salvo.id ? salvo : e));
      if (dados.apiMode) dados.setDados(novas);
      else dados.salvarDemo(novas);
      setSelecionado(salvo);
      setToast("Empresa atualizada.");
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  }
  const visiveis = lista.filter(
    (e) =>
      `${e.razaoSocial} ${e.nomeFantasia} ${e.cnpj}`
        .toLowerCase()
        .includes(busca.toLowerCase()) &&
      (!status || (e.ativo ? "ATIVO" : "INATIVO") === status) &&
      (!tipo || e.tipo === tipo),
  );
  return (
    <>
      <CadastroLista
        onRetry={dados.recarregar}
        titulo="Empresas"
        descricao="Cadastre a matriz e as filiais que emitem orçamentos e contratos."
        novoTexto="Nova empresa"
        onNovo={podeEditar ? () => abrir() : undefined}
        icone={Building2}
        indicadores={[
          { label: "Empresas cadastradas", value: lista.length },
          {
            label: "Ativas",
            value: lista.filter((e) => e.ativo).length,
            tone: "green",
          },
          {
            label: "Filiais",
            value: lista.filter((e) => e.tipo === "FILIAL").length,
          },
        ]}
        rows={visiveis}
        busca={busca}
        setBusca={setBusca}
        placeholder="Buscar empresa, CPF ou CNPJ..."
        filtros={
          <>
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
            <SelectFilter
              label="Tipo"
              value={tipo}
              onChange={setTipo}
              options={[
                "Todos",
                { value: "MATRIZ", label: "Matriz" },
                { value: "FILIAL", label: "Filial" },
              ]}
            />
          </>
        }
        columns={[
          {
            key: "razaoSocial",
            label: "Empresa",
            render: (e) => (
              <>
                <strong>{e.razaoSocial}</strong>
                <br />
                <small>{e.nomeFantasia}</small>
              </>
            ),
          },
          {
            key: "tipo",
            label: "Tipo",
            render: (e) => (e.tipo === "MATRIZ" ? "Matriz" : "Filial"),
          },
          {
            key: "cnpj",
            label: "CPF / CNPJ",
            render: (e) => formatarDocumento(e.cnpj),
          },
          {
            key: "cidade",
            label: "Cidade",
            render: (e) =>
              [e.cidade, e.estado].filter(Boolean).join("/") || "—",
          },
          {
            key: "ativo",
            label: "Status",
            render: (e) => <Badge>{e.ativo ? "Ativo" : "Inativo"}</Badge>,
          },
        ]}
        selecionado={selecionado}
        setSelecionado={setSelecionado}
        nome={selecionado?.razaoSocial}
        status={selecionado?.ativo ? "Ativo" : "Inativo"}
        detalheExtra={
          selecionado?.logoUrl ? (
            <div className="empresa-logo-preview">
              <img src={selecionado.logoUrl} alt="Logo da empresa" />
            </div>
          ) : null
        }
        detalhes={
          selecionado
            ? [
                ["Nome fantasia", selecionado.nomeFantasia || "—"],
                ["CPF / CNPJ", formatarDocumento(selecionado.cnpj)],
                ["Tipo", selecionado.tipo === "MATRIZ" ? "Matriz" : "Filial"],
                ["Matriz", selecionado.matrizNome || "—"],
                ["Telefone", selecionado.telefone || "—"],
                ["E-mail", selecionado.email || "—"],
                [
                  "Endereço",
                  [
                    selecionado.logradouro,
                    selecionado.numero,
                    selecionado.complemento,
                    selecionado.bairro,
                  ]
                    .filter(Boolean)
                    .join(", ") || "—",
                ],
                [
                  "Cidade/UF",
                  [selecionado.cidade, selecionado.estado]
                    .filter(Boolean)
                    .join("/") || "—",
                ],
                ["CEP", selecionado.cep || "—"],
              ]
            : []
        }
        rodape={
          podeEditar && (
            <>
              <button
                className="btn danger-outline"
                disabled={salvando || carregandoLogo}
                onClick={alterarStatus}
              >
                {selecionado?.ativo ? "Inativar" : "Reativar"} empresa
              </button>
              <button
                className="btn primary"
                disabled={salvando || carregandoLogo}
                onClick={() => abrir(selecionado)}
              >
                Editar empresa
              </button>
            </>
          )
        }
        erro={!modal ? erro : ""}
        carregando={dados.carregando}
      />
      {modal && (
        <Modal
          busy={salvando}
          title={form.id ? "Editar empresa" : "Nova empresa"}
          wide
          onClose={() => setModal(false)}
          footer={
            <>
              <button className="btn outline" onClick={() => setModal(false)}>
                Cancelar
              </button>
              <button
                className="btn primary"
                form="empresa-form"
                disabled={salvando || carregandoLogo}
              >
                {salvando ? "Salvando..." : "Salvar empresa"}
              </button>
            </>
          }
        >
          <form id="empresa-form" onSubmit={salvar}>
            <div className="empresa-logo-cadastro">
              <Field label="Logo da empresa">
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  disabled={carregandoLogo || salvando}
                  onChange={carregarLogo}
                />
              </Field>
              <small>
                Aparece pequena no canto superior esquerdo do orçamento. PNG ou
                JPG, até 5 MB.
              </small>
              {carregandoLogo && <p>Preparando imagem...</p>}
              {form.logoUrl && (
                <div className="empresa-logo-preview">
                  <img src={form.logoUrl} alt="Logo da empresa" />
                  <button
                    className="btn outline"
                    type="button"
                    onClick={() => editar("logoUrl", null)}
                  >
                    Remover logo
                  </button>
                </div>
              )}
            </div>
            <div className="form-grid">
              <Field label="Tipo *">
                <SelectPesquisavel
                  value={form.tipo}
                  onChange={(e) => editar("tipo", e.target.value)}
                >
                  <option value="MATRIZ">Matriz</option>
                  <option value="FILIAL">Filial</option>
                </SelectPesquisavel>
              </Field>
              {form.tipo === "FILIAL" && (
                <Field label="Matriz *">
                  <SelectPesquisavel
                    required
                    value={form.matrizId}
                    onChange={(e) => editar("matrizId", e.target.value)}
                  >
                    <option value="">Selecione a matriz</option>
                    {lista
                      .filter((e) => e.tipo === "MATRIZ" && e.ativo)
                      .map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.nomeFantasia || e.razaoSocial}
                        </option>
                      ))}
                  </SelectPesquisavel>
                </Field>
              )}
              <Field label="Nome / Razão social *">
                <input
                  required
                  value={form.razaoSocial}
                  placeholder="Razão social da empresa"
                  onChange={(e) => editar("razaoSocial", e.target.value)}
                />
              </Field>
              <Field label="Nome fantasia">
                <input
                  value={form.nomeFantasia || ""}
                  placeholder="Nome exibido"
                  onChange={(e) => editar("nomeFantasia", e.target.value)}
                />
              </Field>
              <Field label="Tipo de documento">
                <SelectPesquisavel
                  value={form.tipoDocumento}
                  onChange={(e) =>
                    setForm((v) => ({
                      ...v,
                      tipoDocumento: e.target.value,
                      cnpj: "",
                    }))
                  }
                >
                  <option value="PJ">CNPJ · Pessoa jurídica</option>
                  <option value="PF">CPF · Prestador autônomo</option>
                </SelectPesquisavel>
              </Field>
              <Field
                label={`${form.tipoDocumento === "PF" ? "CPF" : "CNPJ"} *`}
              >
                <input
                  required
                  value={form.cnpj}
                  inputMode="numeric"
                  placeholder={
                    form.tipoDocumento === "PF"
                      ? "000.000.000-00"
                      : "00.000.000/0000-00"
                  }
                  onChange={(e) =>
                    editar(
                      "cnpj",
                      formatarDocumento(e.target.value, form.tipoDocumento),
                    )
                  }
                />
              </Field>
              <Field label="Inscrição estadual">
                <input
                  value={form.inscricaoEstadual || ""}
                  placeholder="Inscrição estadual"
                  onChange={(e) => editar("inscricaoEstadual", e.target.value)}
                />
              </Field>
              <Field label="Telefone">
                <input
                  value={form.telefone || ""}
                  placeholder="(00) 00000-0000"
                  onChange={(e) => editar("telefone", e.target.value)}
                />
              </Field>
              <Field label="E-mail">
                <input
                  type="email"
                  value={form.email || ""}
                  placeholder="contato@example.com"
                  onChange={(e) => editar("email", e.target.value)}
                />
              </Field>
              <CampoCep form={form} setForm={setForm} />
              <Field label="Logradouro">
                <input
                  value={form.logradouro || ""}
                  placeholder="Rua, avenida..."
                  onChange={(e) => editar("logradouro", e.target.value)}
                />
              </Field>
              <Field label="Número">
                <input
                  value={form.numero || ""}
                  placeholder="Número"
                  onChange={(e) => editar("numero", e.target.value)}
                />
              </Field>
              <Field label="Complemento">
                <input
                  value={form.complemento || ""}
                  placeholder="Sala, bloco..."
                  onChange={(e) => editar("complemento", e.target.value)}
                />
              </Field>
              <Field label="Bairro">
                <input
                  value={form.bairro || ""}
                  placeholder="Bairro"
                  onChange={(e) => editar("bairro", e.target.value)}
                />
              </Field>
              <Field label="Cidade">
                <input
                  value={form.cidade || ""}
                  placeholder="Cidade"
                  onChange={(e) => editar("cidade", e.target.value)}
                />
              </Field>
              <Field label="UF">
                <input
                  maxLength="2"
                  value={form.estado || ""}
                  placeholder="UF"
                  onChange={(e) =>
                    editar("estado", e.target.value.toUpperCase())
                  }
                />
              </Field>
            </div>
            {erro && (
              <p className="inline-error" role="alert">
                {erro}
              </p>
            )}
          </form>
        </Modal>
      )}
    </>
  );
}

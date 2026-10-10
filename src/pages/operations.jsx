import { proximoCodigo } from "../codigoSequencial";
import { CampoCep } from "../components/CampoCep.jsx";
import { periodoServico, rotuloPeriodo } from "../periodoServico";
import { CampoData } from "../components/CampoData";
import { BarraFiltros } from "../components/BarraFiltros";
import { SelectPesquisavel } from "../components/SelectPesquisavel";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMobile } from "../components/useMobile";
import { useSearchParams } from "react-router-dom";
import { Download, Plus, Users } from "lucide-react";
import { useDados } from "../context.jsx";
import { UnidadeSelect } from "../components/UnidadeSelect.jsx";
import { ImportarItens } from "../components/ImportarItens.jsx";
import { moeda } from "../data.js";
import { api } from "../api.js";
import {
  formatarDocumento,
  somenteDigitos,
  validarDocumento,
} from "../documento.js";
import { formatarTelefone, validarTelefone } from "../telefone.js";
import {
  catalogoDaApi,
  catalogoParaApi,
  clienteDaApi,
  clienteParaApi,
  usePaginaApi,
} from "../remote.js";
import {
  Badge,
  Card,
  DataTable,
  DetailPanel,
  DetailRows,
  Field,
  Modal,
  PageHeading,
  SelectFilter,
  Tabs,
  TextFilter,
  Timeline,
} from "../components.jsx";

const formClienteInicial = {
  tipo: "PJ",
  razao: "",
  nome: "",
  documento: "",
  contato: "",
  telefone: "",
  email: "",
  endereco: "",
  cidade: "",
  status: "Ativo",
  observacoes: "",
  contatos: [],
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  estado: "",
};
const novoFormCliente = () => ({ ...formClienteInicial, contatos: [] });
export function ClientesPage() {
  const {
    clientes: clientesDemo,
    salvar,
    setToast,
    modo,
    usuario,
  } = useDados();
  const apiMode = modo === "api";
  const podeEditar = !apiMode || usuario.perfil !== "CONSULTA";
  const podeInativar = !apiMode || ["ADMIN", "GESTOR"].includes(usuario.perfil);
  const [params] = useSearchParams();
  const [busca, setBusca] = useState(params.get("busca") || "");
  const [status, setStatus] = useState("");
  const [selecionado, setSelecionado] = useState(
    apiMode || window.matchMedia("(max-width:720px)").matches
      ? null
      : clientesDemo[0],
  );
  const [aba, setAba] = useState("Dados gerais");
  const [abaFormulario, setAbaFormulario] = useState("Dados principais");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(novoFormCliente);
  const [salvandoCliente, setSalvandoCliente] = useState(false);
  const envioCliente = useRef(false);
  const [erro, setErro] = useState("");
  const [documentoTocado, setDocumentoTocado] = useState(false);
  const [telefoneTocado, setTelefoneTocado] = useState(false);
  const [novoContato, setNovoContato] = useState({
    nome: "",
    cargo: "",
    email: "",
    telefone: "",
  });
  const remoto = usePaginaApi(api.listarClientes, {
    ativo: apiMode,
    busca,
    clienteAtivo: status ? status === "Ativo" : undefined,
    tamanho: 10,
  });
  const clientes = apiMode ? remoto.conteudo.map(clienteDaApi) : clientesDemo;
  useEffect(() => {
    if (apiMode) setSelecionado(clientes[0] || null);
  }, [apiMode, remoto.conteudo]);
  const filtrados = apiMode
    ? clientes
    : clientes.filter(
        (c) =>
          `${c.nome} ${c.razao} ${c.documento} ${c.cidade}`
            .toLowerCase()
            .includes(busca.toLowerCase()) &&
          (!status || c.status === status),
      );
  async function salvarCliente(e) {
    e.preventDefault();
    if (envioCliente.current) return;
    setDocumentoTocado(true);
    setTelefoneTocado(true);
    if (!validarDocumento(form.documento, form.tipo)) {
      setErro(`Informe um ${form.tipo === "PF" ? "CPF" : "CNPJ"} válido.`);
      return;
    }
    if (form.telefone && !validarTelefone(form.telefone)) {
      setErro("Informe um telefone válido com DDD e 8 ou 9 dígitos.");
      return;
    }
    if (!form.telefone?.trim() && !form.email?.trim()) {
      setErro("Informe telefone ou e-mail para o contato.");
      return;
    }
    if (
      !apiMode &&
      clientes.some(
        (c) =>
          somenteDigitos(c.documento) === somenteDigitos(form.documento) &&
          c.id !== form.id,
      )
    ) {
      setErro("Este documento já está cadastrado nesta unidade.");
      return;
    }
    envioCliente.current = true;
    setSalvandoCliente(true);
    setErro("");
    try {
      const item = apiMode
        ? clienteDaApi(
            await (form.id
              ? api.atualizarCliente(form.id, clienteParaApi(form))
              : api.criarCliente(clienteParaApi(form))),
          )
        : { ...form, id: form.id || Date.now(), ultimo: "—", valor: 0 };
      if (apiMode) remoto.recarregar();
      else salvar("clientes", item);
      setSelecionado(item);
      setModal(false);
      setToast("Cliente salvo com sucesso.");
    } catch (falha) {
      setErro(falha.message);
      setToast(falha);
    } finally {
      envioCliente.current = false;
      setSalvandoCliente(false);
    }
  }
  const editar = () => {
    setAbaFormulario("Dados principais");
    setDocumentoTocado(false);
    setTelefoneTocado(false);
    setErro("");
    setForm({
      ...novoFormCliente(),
      ...selecionado,
      documento: formatarDocumento(selecionado.documento, selecionado.tipo),
      telefone: formatarTelefone(selecionado.telefone),
      contatos: selecionado.contatos || [],
    });
    setModal(true);
  };
  return (
    <>
      <PageHeading
        title="Clientes"
        subtitle="Cadastre e gerencie seus clientes"
        action={
          podeEditar && (
            <button
              className="btn primary"
              onClick={() => {
                setDocumentoTocado(false);
                setTelefoneTocado(false);
                setErro("");
                setForm(novoFormCliente());
                setAbaFormulario("Dados principais");
                setModal(true);
              }}
            >
              <Plus size={18} /> Novo cliente
            </button>
          )
        }
      />

      <div className="list-detail">
        <Card title="Lista de clientes" className="list-card">
          <BarraFiltros className="">
            <TextFilter
              value={busca}
              onChange={setBusca}
              placeholder={
                apiMode
                  ? "Buscar por nome ou CNPJ/CPF..."
                  : "Buscar por nome, CNPJ/CPF, cidade..."
              }
            />
            <button className="btn outline" onClick={() => setBusca("")}>
              Filtros
            </button>
            {!apiMode && (
              <SelectFilter
                value={status}
                onChange={setStatus}
                options={["Todos", "Ativo", "Inativo"]}
              />
            )}
          </BarraFiltros>
          {remoto.erro && apiMode && (
            <p className="inline-error" role="alert">
              {remoto.erro}
            </p>
          )}
          {remoto.carregando && apiMode && (
            <p className="muted">Carregando clientes...</p>
          )}
          <DataTable
            rows={filtrados}
            remote={apiMode ? remoto : undefined}
            selected={selecionado}
            onSelect={setSelecionado}
            columns={[
              {
                key: "nome",
                label: "Cliente",
                render: (c) => <strong>{c.razao || c.nome}</strong>,
              },
              { key: "documento", label: "Documento" },
              {
                key: "contato",
                label: "Contato",
                render: (c) => (
                  <>
                    {c.contato}
                    <br />
                    <small>{c.telefone}</small>
                  </>
                ),
              },
              ...(!apiMode ? [{ key: "cidade", label: "Cidade" }] : []),
              ...(!apiMode
                ? [
                    {
                      key: "ultimo",
                      label: "Último orçamento",
                      render: (c) => (
                        <>
                          {c.ultimo}
                          <br />
                          <small>{moeda(c.valor)}</small>
                        </>
                      ),
                    },
                  ]
                : []),
              {
                key: "status",
                label: "Status",
                render: (c) => <Badge>{c.status}</Badge>,
              },
            ]}
          />
        </Card>
        {selecionado && (
          <DetailPanel
            title="Detalhes do cliente"
            onClose={() => setSelecionado(null)}
            tabs={["Dados gerais", "Contatos", "Endereços", "Histórico"]}
            tab={aba}
            setTab={setAba}
            footer={
              <>
                {podeInativar && (
                  <button
                    className="btn danger-outline"
                    onClick={async () => {
                      try {
                        if (apiMode) {
                          await (selecionado.status === "Inativo"
                            ? api.reativarCliente(selecionado.id)
                            : api.inativarCliente(selecionado.id));
                          remoto.recarregar();
                        } else
                          salvar("clientes", {
                            ...selecionado,
                            status:
                              selecionado.status === "Inativo"
                                ? "Ativo"
                                : "Inativo",
                          });
                        setSelecionado({
                          ...selecionado,
                          status:
                            selecionado.status === "Inativo"
                              ? "Ativo"
                              : "Inativo",
                        });
                        setToast("Status do cliente atualizado.");
                      } catch (falha) {
                        setToast(falha);
                      }
                    }}
                  >
                    {selecionado.status === "Inativo"
                      ? "Reativar cliente"
                      : "Inativar cliente"}
                  </button>
                )}
                {podeEditar && (
                  <button className="btn primary" onClick={editar}>
                    Editar cliente
                  </button>
                )}
              </>
            }
          >
            <div className="entity-title">
              <span className="entity-icon">
                <Users />
              </span>
              <div>
                <h3>{selecionado.razao || selecionado.nome}</h3>
                <small>CNPJ {selecionado.documento}</small>
              </div>
              <Badge>{selecionado.status}</Badge>
            </div>
            {aba === "Dados gerais" ? (
              <DetailRows
                rows={[
                  [
                    "Tipo de pessoa",
                    selecionado.tipo === "PF"
                      ? "Pessoa Física"
                      : "Pessoa Jurídica",
                  ],
                  ["Razão social", selecionado.razao],
                  ["Nome fantasia", selecionado.nome],
                  ["Documento", selecionado.documento],
                  ["Telefone principal", selecionado.telefone || "—"],
                  ["E-mail", selecionado.email || "—"],
                  ["Endereço", selecionado.endereco || "—"],
                  ...(!apiMode ? [["Cidade", selecionado.cidade || "—"]] : []),
                  ["Observações", selecionado.observacoes || "—"],
                ]}
              />
            ) : aba === "Histórico" && !apiMode ? (
              <Timeline
                events={[
                  {
                    titulo: "Orçamento #52 aprovado",
                    descricao: moeda(selecionado.valor),
                    data: "28/09/2026",
                  },
                  {
                    titulo: "Serviço SV-0125 criado",
                    descricao: "Recuperação de mandrins",
                    data: "27/09/2026",
                  },
                  {
                    titulo: "Contrato CT-012 assinado",
                    descricao: "6 meses",
                    data: "01/09/2026",
                  },
                ]}
              />
            ) : (
              <p className="muted">
                {aba === "Histórico"
                  ? "Histórico de operações ainda não disponível na API."
                  : aba === "Contatos"
                    ? `${selecionado.contato || "Sem contato"} · ${selecionado.telefone || "Sem telefone"}`
                    : selecionado.endereco ||
                      "Nenhum endereço adicional cadastrado."}
              </p>
            )}
          </DetailPanel>
        )}
      </div>
      {modal && (
        <Modal
          title={form.id ? "Editar cliente" : "Novo cliente"}
          onClose={() => !salvandoCliente && setModal(false)}
          wide
          footer={
            <>
              <button className="btn outline" disabled={salvandoCliente} onClick={() => setModal(false)}>
                Cancelar
              </button>
              <button form="cliente-form" className="btn primary" disabled={salvandoCliente}>
                {salvandoCliente ? "Salvando…" : "Salvar cliente"}
              </button>
            </>
          }
        >
          <Tabs
            items={["Dados principais", "Contatos", "Endereços"]}
            value={abaFormulario}
            onChange={setAbaFormulario}
          />
          <form
            id="cliente-form"
            className="form-grid"
            onSubmit={salvarCliente}
          >
            {abaFormulario === "Dados principais" && (
              <>
                <Field label="Tipo de pessoa">
                  <SelectPesquisavel
                    value={form.tipo}
                    onChange={(e) => {
                      setForm({ ...form, tipo: e.target.value, documento: "" });
                      setDocumentoTocado(false);
                    }}
                  >
                    <option value="PJ">Pessoa Jurídica</option>
                    <option value="PF">Pessoa Física</option>
                  </SelectPesquisavel>
                </Field>
                {!apiMode && (
                  <Field label="Status">
                    <SelectPesquisavel
                      value={form.status}
                      onChange={(e) =>
                        setForm({ ...form, status: e.target.value })
                      }
                    >
                      <option>Ativo</option>
                      <option>Inativo</option>
                    </SelectPesquisavel>
                  </Field>
                )}
                <Field
                  label={
                    form.tipo === "PF" ? "Nome completo *" : "Razão social *"
                  }
                >
                  <input
                    required
                    value={form.razao}
                    onChange={(e) =>
                      setForm({ ...form, razao: e.target.value })
                    }
                  />
                </Field>
                <Field label="Nome fantasia">
                  <input
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  />
                </Field>
                <Field
                  label={form.tipo === "PF" ? "CPF *" : "CNPJ *"}
                  error={
                    documentoTocado &&
                    form.documento &&
                    !validarDocumento(form.documento, form.tipo)
                      ? "Confira os dígitos do documento."
                      : undefined
                  }
                >
                  <input
                    required
                    inputMode="numeric"
                    maxLength={form.tipo === "PF" ? 14 : 18}
                    value={form.documento}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        documento: formatarDocumento(e.target.value, form.tipo),
                      })
                    }
                    onBlur={() => setDocumentoTocado(true)}
                  />
                </Field>
                <Field label="Contato">
                  <input
                    value={form.contato}
                    onChange={(e) =>
                      setForm({ ...form, contato: e.target.value })
                    }
                  />
                </Field>
                <Field
                  label="Telefone"
                  error={
                    telefoneTocado &&
                    form.telefone &&
                    !validarTelefone(form.telefone)
                      ? "Use DDD e 8 ou 9 dígitos; +55 é opcional."
                      : undefined
                  }
                >
                  <input
                    type="tel"
                    value={form.telefone}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        telefone: formatarTelefone(e.target.value),
                      })
                    }
                    onBlur={() => setTelefoneTocado(true)}
                    placeholder="(00) 00000-0000"
                  />
                </Field>
                <Field label="E-mail">
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                </Field>
                <CampoCep form={form} setForm={setForm} />
                <Field label="Endereço">
                  <input
                    value={form.endereco}
                    onChange={(e) =>
                      setForm({ ...form, endereco: e.target.value })
                    }
                  />
                </Field>
                {!apiMode && (
                  <Field label="Cidade / UF">
                    <input
                      value={form.cidade}
                      onChange={(e) =>
                        setForm({ ...form, cidade: e.target.value })
                      }
                    />
                  </Field>
                )}
                <Field label="Observações">
                  <input
                    value={form.observacoes}
                    onChange={(e) =>
                      setForm({ ...form, observacoes: e.target.value })
                    }
                  />
                </Field>
              </>
            )}
            {abaFormulario === "Contatos" && (
              <div className="contacts-editor">
                <div className="contacts-list">
                  {[
                    {
                      nome: form.contato,
                      cargo: "Principal",
                      email: form.email,
                      telefone: form.telefone,
                    },
                    ...(form.contatos || []),
                  ]
                    .filter(
                      (contato) =>
                        contato.nome || contato.email || contato.telefone,
                    )
                    .map((contato, indice) => (
                      <div
                        className="contact-row"
                        key={`${contato.email}-${indice}`}
                      >
                        <div>
                          <strong>{contato.nome || "Contato"}</strong>
                          <small>
                            {contato.cargo || ""} ·{" "}
                            {contato.email || contato.telefone || "Sem contato"}
                          </small>
                        </div>
                        {indice > 0 && (
                          <button
                            type="button"
                            className="btn quiet"
                            onClick={() =>
                              setForm((atual) => ({
                                ...atual,
                                contatos: atual.contatos.filter(
                                  (_, i) => i !== indice - 1,
                                ),
                              }))
                            }
                          >
                            Remover
                          </button>
                        )}
                      </div>
                    ))}
                </div>
                <div className="form-grid">
                  <Field label="Nome">
                    <input
                      placeholder="Nome do contato"
                      value={novoContato.nome}
                      onChange={(e) =>
                        setNovoContato({ ...novoContato, nome: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Cargo / função">
                    <input
                      placeholder="Ex.: Comprador"
                      value={novoContato.cargo}
                      onChange={(e) =>
                        setNovoContato({
                          ...novoContato,
                          cargo: e.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="E-mail">
                    <input
                      placeholder="contato@example.com"
                      type="email"
                      value={novoContato.email}
                      onChange={(e) =>
                        setNovoContato({
                          ...novoContato,
                          email: e.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="Telefone">
                    <input
                      placeholder="(00) 00000-0000"
                      value={novoContato.telefone}
                      onChange={(e) =>
                        setNovoContato({
                          ...novoContato,
                          telefone: formatarTelefone(e.target.value),
                        })
                      }
                    />
                  </Field>
                </div>
                <button
                  type="button"
                  className="btn outline"
                  onClick={() => {
                    if (!novoContato.nome.trim())
                      return setErro("Informe o nome do contato.");
                    setForm((atual) => ({
                      ...atual,
                      contatos: [...(atual.contatos || []), novoContato],
                    }));
                    setNovoContato({
                      nome: "",
                      cargo: "",
                      email: "",
                      telefone: "",
                    });
                  }}
                >
                  + Adicionar contato
                </button>
              </div>
            )}
            {abaFormulario === "Endereços" && (
              <div className="form-grid">
                <CampoCep form={form} setForm={setForm} />
                <Field label="Logradouro">
                  <input
                    placeholder="Rua, avenida..."
                    value={form.logradouro || form.endereco || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        logradouro: e.target.value,
                        endereco: e.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="Número">
                  <input
                    placeholder="Número"
                    value={form.numero || ""}
                    onChange={(e) =>
                      setForm({ ...form, numero: e.target.value })
                    }
                  />
                </Field>
                <Field label="Complemento">
                  <input
                    placeholder="Sala, bloco..."
                    value={form.complemento || ""}
                    onChange={(e) =>
                      setForm({ ...form, complemento: e.target.value })
                    }
                  />
                </Field>
                <Field label="Bairro">
                  <input
                    placeholder="Bairro"
                    value={form.bairro || ""}
                    onChange={(e) =>
                      setForm({ ...form, bairro: e.target.value })
                    }
                  />
                </Field>
                <Field label="Cidade">
                  <input
                    placeholder="Cidade"
                    value={form.cidade || ""}
                    onChange={(e) =>
                      setForm({ ...form, cidade: e.target.value })
                    }
                  />
                </Field>
                <Field label="Estado">
                  <input
                    placeholder="UF"
                    maxLength="2"
                    value={form.estado || ""}
                    onChange={(e) =>
                      setForm({ ...form, estado: e.target.value.toUpperCase() })
                    }
                  />
                </Field>
              </div>
            )}
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

export function ServicosPage() {
  const { servicos, clientes, orcamentos, salvar, setToast } = useDados();
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("");
  const [selecionado, setSelecionado] = useState(() =>
    window.matchMedia("(max-width:720px)").matches ? null : servicos[1],
  );
  const [aba, setAba] = useState("Dados do serviço");
  const [modal, setModal] = useState("");
  const [form, setForm] = useState({});
  const [check, setCheck] = useState([true, true, false]);
  const filtrados = servicos.filter(
    (s) =>
      `${s.id} ${s.titulo} ${s.cliente}`
        .toLowerCase()
        .includes(busca.toLowerCase()) &&
      (!status || s.status === status),
  );
  function salvarServico(e) {
    e.preventDefault();
    if (
      form.orcamentoId &&
      !orcamentos.some(
        (o) =>
          String(o.id) === String(form.orcamentoId) && o.status === "Aprovado",
      )
    )
      return setToast({
        tipo: "aviso",
        mensagem: "O serviço deve estar vinculado a um orçamento aprovado.",
      });
    if (
      (form.dataInicio || form.dataFim) &&
      (!form.dataInicio || !form.dataFim || form.dataFim < form.dataInicio)
    )
      return setToast({
        tipo: "aviso",
        mensagem: "Informe um período válido com início e fim.",
      });
    const item = {
      ...form,
      id: form.id || proximoCodigo(servicos, "SV"),
      data: periodoServico(form).inicio,
      dataInicio: periodoServico(form).inicio,
      dataFim: periodoServico(form).fim,
      prazo: form.prazo || "12/10",
      status: form.status || "Agendado",
      valor: Number(form.valor || 0),
    };
    salvar("servicos", item);
    setSelecionado(item);
    setModal("");
    setToast("Serviço salvo com sucesso.");
  }
  return (
    <>
      <PageHeading
        title="Serviços"
        subtitle="Cadastre e acompanhe os serviços realizados pela empresa."
        action={
          <button
            className="btn primary"
            onClick={() => {
              setForm({ status: "Rascunho" });
              setModal("novo");
            }}
          >
            <Plus size={18} /> Novo serviço
          </button>
        }
      />

      <div className="list-detail">
        <Card title="Lista de serviços" className="list-card">
          <BarraFiltros className="">
            <TextFilter
              value={busca}
              onChange={setBusca}
              placeholder="Buscar por código, serviço ou cliente..."
            />
            <SelectFilter
              value={status}
              onChange={setStatus}
              options={[
                "Todos",
                "Em execução",
                "Em andamento",
                "Concluído",
                "Atrasado",
                "Agendado",
              ]}
            />
          </BarraFiltros>
          <DataTable
            rows={filtrados}
            selected={selecionado}
            onSelect={setSelecionado}
            columns={[
              { key: "id", label: "Código", render: (s) => <a>{s.id}</a> },
              { key: "titulo", label: "Serviço" },
              { key: "cliente", label: "Cliente" },
              { key: "responsavel", label: "Responsável" },
              { key: "dataInicio", label: "Período", render: rotuloPeriodo },
              {
                key: "status",
                label: "Status",
                render: (s) => <Badge>{s.status}</Badge>,
              },
              { key: "valor", label: "Valor", render: (s) => moeda(s.valor) },
            ]}
          />
        </Card>
        {selecionado && (
          <DetailPanel
            title={selecionado.id}
            status={selecionado.status}
            onClose={() => setSelecionado(null)}
            tabs={["Dados do serviço", "Itens e peças", "Histórico"]}
            tab={aba}
            setTab={setAba}
            footer={
              <>
                <button
                  className="btn outline"
                  onClick={() => {
                    setForm(selecionado);
                    setModal("novo");
                  }}
                >
                  Editar serviço
                </button>
                <button
                  className="btn primary"
                  onClick={() => setModal("finalizar")}
                >
                  Finalizar serviço
                </button>
              </>
            }
          >
            {aba === "Dados do serviço" ? (
              <>
                <div className="two-cols">
                  <DetailRows
                    rows={[
                      ["Código", selecionado.id],
                      ["Serviço", selecionado.titulo],
                      ["Cliente", selecionado.cliente],
                      ["Referência / Descrição", selecionado.titulo],
                      ["Técnico responsável", selecionado.responsavel],
                    ]}
                  />
                  <DetailRows
                    rows={[
                      ["Período programado", rotuloPeriodo(selecionado)],

                      ["Valor total", moeda(selecionado.valor)],
                    ]}
                  />
                </div>
                <div className="notice muted-box">
                  Realizar verificação completa dos sistemas e registrar
                  condições dos principais componentes.
                </div>
              </>
            ) : aba === "Histórico" ? (
              <Timeline
                events={[
                  {
                    titulo: "Serviço iniciado",
                    descricao: "Responsável iniciou o serviço.",
                    data: "27/09/2026 08:15",
                  },
                  {
                    titulo: "Peças separadas",
                    descricao: "Peças e materiais separados.",
                    data: "27/09/2026 10:30",
                  },
                  {
                    titulo: "Manutenção em andamento",
                    descricao: "Serviço em execução conforme planejado.",
                    data: "28/09/2026 14:20",
                  },
                ]}
              />
            ) : aba === "Itens e peças" ? (
              <p className="muted">
                Peças separadas e equipamento inspecionado.
              </p>
            ) : null}
            <div className="checklist">
              <h3>Checklist de execução</h3>
              {[
                "Peças separadas",
                "Equipamento inspecionado",
                "Testes finais",
              ].map((nome, i) => (
                <label key={nome}>
                  <input
                    type="checkbox"
                    checked={check[i]}
                    onChange={() =>
                      setCheck(check.map((v, n) => (n === i ? !v : v)))
                    }
                  />
                  {nome}
                </label>
              ))}
            </div>
          </DetailPanel>
        )}
      </div>
      {modal === "novo" && (
        <Modal
          title={form.id ? "Editar serviço" : "Novo serviço"}
          onClose={() => setModal("")}
          wide
          footer={
            <>
              <button className="btn outline" onClick={() => setModal("")}>
                Cancelar
              </button>
              <button className="btn primary" form="servico-form">
                Salvar serviço
              </button>
            </>
          }
        >
          <form
            id="servico-form"
            className="form-grid"
            onSubmit={salvarServico}
          >
            <Field label="Cliente *">
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
            <Field label="Título *">
              <input
                required
                value={form.titulo || ""}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              />
            </Field>
            <Field label="Orçamento aprovado (opcional)">
              <SelectPesquisavel
                value={form.orcamentoId || ""}
                onChange={(e) => {
                  const origem = orcamentos.find(
                    (o) => String(o.id) === e.target.value,
                  );
                  setForm({
                    ...form,
                    orcamentoId: e.target.value,
                    ...(origem ? { cliente: origem.cliente } : {}),
                  });
                }}
              >
                <option value="">Serviço independente</option>
                {orcamentos
                  .filter((o) => o.status === "Aprovado")
                  .map((o) => (
                    <option key={o.id} value={o.id}>
                      ORC-{o.id} · {o.cliente}
                    </option>
                  ))}
              </SelectPesquisavel>
            </Field>
            <Field label="Responsável">
              <input
                value={form.responsavel || ""}
                onChange={(e) =>
                  setForm({ ...form, responsavel: e.target.value })
                }
              />
            </Field>
            <Field label="Status">
              <SelectPesquisavel
                value={form.status || "Rascunho"}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {[
                  "Rascunho",
                  "Agendado",
                  "Em andamento",
                  "Em execução",
                  "Concluído",
                ].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </SelectPesquisavel>
            </Field>
            <Field label="Data de início">
              <CampoData
                value={periodoServico(form).inicio}
                onChange={(e) =>
                  setForm({ ...form, dataInicio: e.target.value })
                }
              />
            </Field>
            <Field label="Data de fim">
              <CampoData
                min={periodoServico(form).inicio}
                value={periodoServico(form).fim}
                onChange={(e) => setForm({ ...form, dataFim: e.target.value })}
              />
            </Field>
            <Field label="Local">
              <input
                placeholder="Endereço do serviço"
                value={form.local || ""}
                onChange={(e) => setForm({ ...form, local: e.target.value })}
              />
            </Field>
            <Field label="Valor">
              <input
                type="number"
                min="0"
                value={form.valor || ""}
                onChange={(e) => setForm({ ...form, valor: e.target.value })}
              />
            </Field>
            <Field label="Descrição">
              <input
                value={form.descricao || ""}
                onChange={(e) =>
                  setForm({ ...form, descricao: e.target.value })
                }
              />
            </Field>
          </form>
        </Modal>
      )}
      {modal === "finalizar" && (
        <Modal
          title="Finalizar serviço"
          onClose={() => setModal("")}
          footer={
            <>
              <button className="btn outline" onClick={() => setModal("")}>
                Cancelar
              </button>
              <button
                className="btn success"
                onClick={() => {
                  salvar("servicos", { ...selecionado, status: "Concluído" });
                  setSelecionado({ ...selecionado, status: "Concluído" });
                  setModal("");
                  setToast("Serviço concluído com sucesso.");
                }}
              >
                Concluir serviço
              </button>
            </>
          }
        >
          <div className="form-grid">
            <Field label="Data de conclusão">
              <CampoData defaultValue="2026-09-28" />
            </Field>
            <Field label="Responsável">
              <input defaultValue={selecionado.responsavel} />
            </Field>
            <Field label="Resumo da execução">
              <input defaultValue="Serviço concluído e testado. Cliente acompanhou a entrega." />
            </Field>
            <Field label="Anexos">
              <input type="file" multiple />
            </Field>
          </div>
        </Modal>
      )}
    </>
  );
}

function CatalogoPage({ tipo }) {
  const dados = useDados();
  const apiMode = dados.modo === "api";
  const podeEditar = !apiMode || dados.usuario.perfil !== "CONSULTA";
  const podeInativar =
    !apiMode || ["ADMIN", "GESTOR"].includes(dados.usuario.perfil);
  const labor = tipo === "maoObra";
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("");
  const [ordem, setOrdem] = useState({ key: "nome", direction: "asc" });
  const [importando, setImportando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const camposOrdem = {
    codigo: "codigoReferencia",
    nome: "nome",
    categoria: "tipo",
    unidade: "unidadeMedida",
    valor: "valorPadrao",
    preco: "valorPadrao",
    status: "ativo",
  };
  const remoto = usePaginaApi(
    labor ? api.listarCatalogoMaoObra : api.listarCatalogoPecas,
    {
      ativo: apiMode,
      busca,
      status,
      sort: `${camposOrdem[ordem.key] || "nome"},${ordem.direction}`,
      unidade: dados.unidade,
      tamanho: 10,
    },
  );
  const itens = apiMode
    ? remoto.conteudo.map(catalogoDaApi)
    : labor
      ? dados.maoObra
      : dados.pecas;
  const chave = labor ? "maoObra" : "pecas";
  const [selecionado, setSelecionado] = useState(
    apiMode || labor || window.matchMedia("(max-width:720px)").matches
      ? null
      : itens[2],
  );
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [aba, setAba] = useState("Dados da peça");
  useEffect(() => {
    if (apiMode)
      setSelecionado((atual) =>
        atual ? itens.find((i) => i.id === atual.id) || null : null,
      );
  }, [apiMode, remoto.conteudo]);
  const filtrados = apiMode
    ? itens
    : itens.filter(
        (i) =>
          `${i.codigo || i.id} ${i.nome} ${i.categoria} ${i.fornecedor || ""}`
            .toLowerCase()
            .includes(busca.toLowerCase()) &&
          (!status || i.status === status),
      );
  async function gravar(e) {
    e.preventDefault();
    if (salvando) return;
    setSalvando(true);
    if (apiMode) {
      try {
        const salvo = await (form.id
          ? api.atualizarItem(form.id, catalogoParaApi(form, labor))
          : api.criarItem(catalogoParaApi(form, labor)));
        setSelecionado(catalogoDaApi(salvo));
        remoto.recarregar();
        setModal(false);
        dados.setToast("Item salvo com sucesso.");
      } catch (falha) {
        dados.setToast(falha);
      }
      setSalvando(false);
      return;
    }
    const item = {
      ...form,
      id:
        form.id ||
        `${labor ? "MO" : "PC"}-${String(itens.length + 1).padStart(labor ? 3 : 4, "0")}`,
      valor: Number(form.valor || 0),
      custo: Number(form.custo || 0),
      preco: Number(form.preco || 0),
      estoque: Number(form.estoque || 0),
      minimo: Number(form.minimo || 0),
      status: form.status || (labor ? "Ativo" : "Ativa"),
      data: "28/09/2026",
    };
    dados.salvar(chave, item);
    setSelecionado(item);
    setModal(false);
    dados.setToast(`${labor ? "Mão de obra" : "Peça"} salva com sucesso.`);
    setSalvando(false);
  }
  async function importarRegistros(registros) {
    const existentes = apiMode
      ? await api.todoCatalogo()
      : [...dados.pecas, ...dados.maoObra];
    const codigos = new Set(
      existentes.map((i) =>
        String(i.codigoReferencia || i.codigo || i.id)
          .trim()
          .toUpperCase(),
      ),
    );
    let sucessos = 0;
    const falhas = [];
    for (const r of registros) {
      try {
        if (codigos.has(r.codigo.toUpperCase()))
          throw new Error("Código já cadastrado.");
        const form = {
          nome: r.descricao,
          codigo: r.codigo,
          unidade: r.unidade,
          valor: r.valor,
          preco: r.valor,
        };
        if (apiMode) await api.criarItem(catalogoParaApi(form, labor));
        else
          dados.salvar(chave, {
            ...form,
            id: crypto.randomUUID(),
            status: labor ? "Ativo" : "Ativa",
            categoria: labor ? "Mão de obra" : "Peças",
            data: new Date().toLocaleDateString("pt-BR"),
          });
        codigos.add(r.codigo.toUpperCase());
        sucessos++;
      } catch (e) {
        falhas.push({ registro: r, erro: e.message });
      }
    }
    if (apiMode) remoto.recarregar();
    dados.setToast(`${sucessos} itens importados.`);
    return { sucessos, falhas };
  }
  return (
    <>
      {importando && (
        <ImportarItens
          onClose={() => setImportando(false)}
          onImport={importarRegistros}
        />
      )}
      <PageHeading
        title={labor ? "Mão de obra" : "Peças"}
        subtitle={
          labor
            ? "Valores e categorias para orçamentos."
            : "Cadastre e gerencie as peças utilizadas nos serviços e orçamentos."
        }
        action={
          podeEditar && (
            <button
              className="btn primary"
              onClick={() => {
                setForm({});
                setModal(true);
              }}
            >
              <Plus size={18} />
              {labor ? "Nova mão de obra" : "Nova peça"}
            </button>
          )
        }
      />

      <div className="list-detail">
        <Card
          title={labor ? "Tabela de mão de obra" : "Lista de peças"}
          className="list-card"
          action={
            podeEditar && (
              <button
                className="btn outline"
                onClick={() => setImportando(true)}
              >
                Importar CSV / Excel
              </button>
            )
          }
        >
          <BarraFiltros className="">
            <TextFilter
              value={busca}
              onChange={setBusca}
              placeholder={
                apiMode
                  ? "Pesquisar por código ou descrição..."
                  : "Pesquisar por código, descrição ou fornecedor..."
              }
            />
            {
              <SelectFilter
                value={status}
                onChange={setStatus}
                options={
                  apiMode
                    ? ["Todos", "Ativo", "Inativo"]
                    : labor
                      ? ["Todos", "Ativo", "Inativo"]
                      : ["Todos", "Ativa", "Inativa", "Baixo estoque"]
                }
              />
            }
          </BarraFiltros>
          {apiMode && remoto.erro && (
            <p className="inline-error" role="alert">
              {remoto.erro}
            </p>
          )}
          {apiMode && remoto.carregando && (
            <p className="muted">Carregando itens...</p>
          )}
          <DataTable
            filterable={true}
            allowCompare
            rows={filtrados}
            sort={ordem}
            onSort={setOrdem}
            remote={apiMode ? remoto : undefined}
            selected={selecionado}
            onSelect={setSelecionado}
            pageSize={apiMode ? 10 : labor ? 10 : 15}
            columns={
              labor
                ? [
                    {
                      key: "codigo",
                      label: "Código",
                      sortValue: (i) => i.codigo || i.id,
                      render: (i) => i.codigo || (apiMode ? "—" : i.id),
                    },
                    { key: "nome", label: "Descrição" },
                    { key: "categoria", label: "Categoria" },
                    { key: "unidade", label: "Unidade" },
                    ...(!apiMode
                      ? [
                          {
                            key: "custo",
                            label: "Custo",
                            render: (i) => moeda(i.custo),
                          },
                        ]
                      : []),
                    {
                      key: "preco",
                      label: "Preço",
                      render: (i) => moeda(i.preco),
                    },
                    {
                      key: "status",
                      label: "Status",
                      render: (i) => <Badge>{i.status}</Badge>,
                    },
                    ...(podeEditar
                      ? [
                          {
                            key: "acoes",
                            label: "Ações",
                            render: (i) => (
                              <button
                                className="btn outline small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setForm({
                                    ...i,
                                    codigo: i.codigo || (!apiMode ? i.id : ""),
                                  });
                                  setModal(true);
                                }}
                              >
                                Editar
                              </button>
                            ),
                          },
                        ]
                      : []),
                  ]
                : [
                    {
                      key: "codigo",
                      label: "Código",
                      sortValue: (i) => i.codigo || i.id,
                      render: (i) => i.codigo || (apiMode ? "—" : i.id),
                    },
                    { key: "nome", label: "Descrição" },
                    { key: "categoria", label: "Categoria" },
                    { key: "unidade", label: "Unidade" },
                    {
                      key: "valor",
                      label: "Valor padrão",
                      render: (i) => moeda(i.valor),
                    },
                    ...(!apiMode
                      ? [{ key: "data", label: "Última atualização" }]
                      : []),
                    {
                      key: "status",
                      label: "Status",
                      render: (i) => <Badge>{i.status}</Badge>,
                    },
                    ...(podeEditar
                      ? [
                          {
                            key: "acoes",
                            label: "Ações",
                            render: (i) => (
                              <button
                                className="btn outline small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setForm({
                                    ...i,
                                    codigo: i.codigo || (!apiMode ? i.id : ""),
                                  });
                                  setModal(true);
                                }}
                              >
                                Editar
                              </button>
                            ),
                          },
                        ]
                      : []),
                  ]
            }
          />
        </Card>
        {selecionado && (
          <DetailPanel
            title={labor ? "Detalhes da mão de obra" : "Detalhes da peça"}
            onClose={() => setSelecionado(null)}
            tabs={labor ? null : ["Dados da peça", "Histórico de uso"]}
            tab={aba}
            setTab={setAba}
            footer={
              <>
                {podeInativar && (
                  <button
                    className="btn danger-outline"
                    onClick={() => {
                      if (apiMode)
                        api
                          .requisicaoStatusItem(
                            selecionado.id,
                            selecionado.status === "Inativo",
                          )
                          .then(() => {
                            remoto.recarregar();
                            setSelecionado({
                              ...selecionado,
                              status:
                                selecionado.status === "Inativo"
                                  ? "Ativo"
                                  : "Inativo",
                            });
                            dados.setToast("Status do item atualizado.");
                          })
                          .catch((e) => dados.setToast(e));
                      else {
                        dados.salvar(chave, {
                          ...selecionado,
                          status: ["Inativo", "Inativa"].includes(
                            selecionado.status,
                          )
                            ? labor
                              ? "Ativo"
                              : "Ativa"
                            : labor
                              ? "Inativo"
                              : "Inativa",
                        });
                        dados.setToast("Status do item atualizado.");
                      }
                    }}
                  >
                    {["Inativo", "Inativa"].includes(selecionado.status)
                      ? "Reativar"
                      : "Inativar"}
                  </button>
                )}
                {podeEditar && (
                  <button
                    className="btn primary"
                    onClick={() => {
                      setForm({
                        ...selecionado,
                        codigo:
                          selecionado.codigo ||
                          (!apiMode ? selecionado.id : ""),
                      });
                      setModal(true);
                    }}
                  >
                    {labor ? "Editar item" : "Editar peça"}
                  </button>
                )}
              </>
            }
          >
            {aba === "Histórico de uso" && apiMode ? (
              <p className="muted">
                Histórico de uso ainda não disponível na API.
              </p>
            ) : aba === "Histórico de uso" ? (
              <Timeline
                events={[
                  {
                    titulo: "Utilizada em orçamento #52",
                    descricao: selecionado.nome,
                    data: "28/09/2026",
                  },
                  {
                    titulo: "Valor atualizado",
                    descricao: moeda(selecionado.valor),
                    data: "20/09/2026",
                  },
                ]}
              />
            ) : (
              <DetailRows
                rows={[
                  [
                    "Código interno",
                    apiMode ? selecionado.codigo : selecionado.id,
                  ],
                  ["Descrição", selecionado.nome],
                  ["Categoria", selecionado.categoria],
                  ["Unidade de medida", selecionado.unidade],
                  [
                    "Valor padrão",
                    moeda(labor ? selecionado.preco : selecionado.valor),
                  ],
                  ...(!apiMode
                    ? [
                        ["Fornecedor", selecionado.fornecedor || "—"],
                        ["Estoque", selecionado.estoque ?? "—"],
                      ]
                    : []),
                  ["Status", <Badge>{selecionado.status}</Badge>],
                ]}
              />
            )}
          </DetailPanel>
        )}
      </div>
      {modal && (
        <Modal
          title={
            form.id
              ? labor
                ? "Editar mão de obra"
                : "Editar peça"
              : labor
                ? "Nova mão de obra"
                : "Nova peça"
          }
          onClose={() => setModal(false)}
          wide
          footer={
            <>
              <button className="btn outline" onClick={() => setModal(false)}>
                Cancelar
              </button>
              <button
                form="catalogo-form"
                className="btn primary"
                disabled={salvando}
              >
                {labor ? "Salvar item" : "Salvar peça"}
              </button>
            </>
          }
        >
          <form id="catalogo-form" className="form-grid" onSubmit={gravar}>
            <Field label="Código interno">
              <input
                value={form.codigo || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    codigo: e.target.value,
                  })
                }
                placeholder={labor ? "MO-004" : "PC-0016"}
              />
            </Field>
            <Field label="Descrição *">
              <input
                required
                value={form.nome || ""}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
              />
            </Field>
            {!apiMode && (
              <Field label="Categoria">
                <input
                  value={form.categoria || ""}
                  onChange={(e) =>
                    setForm({ ...form, categoria: e.target.value })
                  }
                />
              </Field>
            )}
            <Field label="Unidade">
              <UnidadeSelect
                value={form.unidade || "UN"}
                onChange={(unidade) => setForm({ ...form, unidade })}
              />
            </Field>
            {!apiMode && (
              <Field label="Custo por unidade">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.custo || ""}
                  onChange={(e) => setForm({ ...form, custo: e.target.value })}
                />
              </Field>
            )}
            <Field label={labor ? "Preço de venda" : "Valor padrão (R$)"}>
              <input
                type="number"
                min="0"
                step="0.01"
                value={labor ? form.preco || "" : form.valor || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    [labor ? "preco" : "valor"]: e.target.value,
                  })
                }
              />
            </Field>
            {!labor && !apiMode && (
              <>
                <Field label="Fornecedor">
                  <input
                    value={form.fornecedor || ""}
                    onChange={(e) =>
                      setForm({ ...form, fornecedor: e.target.value })
                    }
                  />
                </Field>
                <Field label="Estoque atual">
                  <input
                    type="number"
                    min="0"
                    value={form.estoque || ""}
                    onChange={(e) =>
                      setForm({ ...form, estoque: e.target.value })
                    }
                  />
                </Field>
                <Field label="Estoque mínimo">
                  <input
                    type="number"
                    min="0"
                    value={form.minimo || ""}
                    onChange={(e) =>
                      setForm({ ...form, minimo: e.target.value })
                    }
                  />
                </Field>
              </>
            )}
            <Field label="Observações">
              <input
                value={form.observacoes || ""}
                onChange={(e) =>
                  setForm({ ...form, observacoes: e.target.value })
                }
              />
            </Field>
          </form>
        </Modal>
      )}
    </>
  );
}
export const PecasPage = () => <CatalogoPage tipo="pecas" />;
export const MaoObraPage = () => <CatalogoPage tipo="maoObra" />;

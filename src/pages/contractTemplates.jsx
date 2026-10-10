import { gerencia } from "../permissoes.js";
import { AvisoErro } from "../components/Feedback.jsx";
import { useEdicaoProtegida } from "../components/EdicaoProtegida.jsx";
import { validarCampos, destacarCampo } from "../validacao.js";
import {
  AtivacaoModeloPendente,
  conteudoModeloVazio,
  dadosModeloContrato,
  mesmoModeloContrato,
  salvarModeloConectado,
} from "../modelosContrato.js";
import { SelectPesquisavel } from "../components/SelectPesquisavel";
import React, { useEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Copy,
  FilePlus2,
  History,
  Italic,
  List,
  ListOrdered,
  Pencil,
  Plus,
  Save,
  Underline,
  Upload,
} from "lucide-react";
import { CadastroLista } from "../components/CadastroLista.jsx";
import { strFromU8, unzipSync } from "fflate";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { useDados } from "../context.jsx";
import {
  Badge,
  Card,
  Field,
  Modal,
  PageHeading,
  TextFilter,
  SelectFilter,
} from "../components.jsx";

export const variaveisContrato = [
  [
    "Cliente",
    [
      "@RazaoSocialCliente",
      "@NomeFantasiaCliente",
      "@DocumentoCliente",
      "@TipoDocumentoCliente",
      "@EnderecoCliente",
      "@CidadeCliente",
      "@TelefoneCliente",
      "@EmailCliente",
      "@RepresentanteCliente",
    ],
  ],
  [
    "Empresa contratada",
    [
      "@RazaoSocialContratada",
      "@NomeFantasiaContratada",
      "@CNPJContratada",
      "@DocumentoContratada",
      "@TipoDocumentoContratada",
      "@EnderecoContratada",
      "@CidadeContratada",
      "@TelefoneContratada",
      "@EmailContratada",
      "@RepresentanteContratada",
    ],
  ],
  [
    "Orçamento e serviço",
    [
      "@Orcamento",
      "@DataOrcamento",
      "@DescricaoServico",
      "@ValorOrcamento",
      "@NumeroContrato",
    ],
  ],
  [
    "Pagamento",
    [
      "@CondicoesPagamento",
      "@FormaPagamento",
      "@ValorEntrada",
      "@ValorSaldo",
      "@DadosBancarios",
    ],
  ],
  [
    "Vigência",
    ["@DataInicio", "@DataFim", "@PrazoExecucao", "@DataAssinatura"],
  ],
];
export { EditorConteudo } from "../components/EditorConteudo.jsx";
import { EditorConteudo } from "../components/EditorConteudo.jsx";

export const preencherModelo = (conteudo, dados) =>
  Object.entries(dados).reduce(
    (texto, [variavel, valor]) =>
      texto.replaceAll(variavel, valor || "[preencher]"),
    conteudo || "",
  );

async function lerDocumentoImportado(arquivo) {
  if (arquivo.name.toLowerCase().endsWith(".txt")) return arquivo.text();
  if (!arquivo.name.toLowerCase().endsWith(".docx"))
    throw new Error("Selecione um arquivo DOCX ou TXT.");
  const arquivoZip = unzipSync(new Uint8Array(await arquivo.arrayBuffer()));
  const xml = arquivoZip["word/document.xml"];
  if (!xml)
    throw new Error("O arquivo DOCX não contém conteúdo de documento válido.");
  return strFromU8(xml)
    .replace(/<w:tab[^>]*\/>/g, "\t")
    .replace(/<w:br[^>]*\/>/g, "\n")
    .replace(/<\/w:p>/g, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function statusTexto(status) {
  return status === "PUBLICADO"
    ? "Ativo"
    : status === "ARQUIVADO"
      ? "Inativo"
      : "Pendente de salvar";
}
const dataModelo = (valor) => {
  if (!valor) return "agora";
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(valor)) return valor;
  const data = new Date(valor);
  return Number.isNaN(data.getTime())
    ? "agora"
    : data.toLocaleDateString("pt-BR");
};

export function ModelosContratoPage() {
  const { modo, modelosContrato, salvar, setToast, unidade, usuario } =
    useDados();
  const podeEditar = gerencia(modo, usuario);
  const [status, setStatus] = useState("");
  const [selecionado, setSelecionado] = useState(null);
  const [carregando, setCarregando] = useState(modo === "api");
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [remotos, setRemotos] = useState([]);
  const [tentativaLista, setTentativaLista] = useState(0);
  const [erro, setErro] = useState("");
  useEffect(() => {
    if (modo !== "api") {
      setCarregando(false);
      return;
    }
    let ativo = true;
    setRemotos([]);
    setSelecionado(null);
    setCarregando(true);
    setErro("");
    (async () => {
      const primeira = await api.listarModelosContrato();
      const lista = [...primeira.conteudo];
      for (let pagina = 1; pagina < primeira.totalPaginas; pagina++) {
        if (!ativo) return;
        const proxima = await api.listarModelosContrato({ pagina });
        lista.push(...proxima.conteudo);
      }
      if (ativo) setRemotos(lista);
    })()
      .catch((e) => {
        if (ativo) setErro(e.message);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [modo, unidade, tentativaLista]);
  const modelos = modo === "api" ? remotos : modelosContrato;
  const filtrados = modelos.filter(
    (m) =>
      `${m.nome} ${m.descricao || ""}`
        .toLowerCase()
        .includes(busca.toLowerCase()) &&
      (!status || m.status === status),
  );
  async function duplicar(modelo) {
    try {
      if (modo === "api") {
        const copia = await api.duplicarModeloContrato(modelo.id);
        setRemotos((lista) => [copia, ...lista]);
        navigate(`/cadastros/modelos-contrato/editar?id=${copia.id}`);
      } else {
        const id = `MOD-${String(modelosContrato.length + 1).padStart(3, "0")}`;
        salvar("modelosContrato", {
          ...modelo,
          id,
          nome: `${modelo.nome} (cópia)`,
          status: "RASCUNHO",
          numeroVersao: 1,
          atualizadoEm: new Date().toLocaleDateString("pt-BR"),
          versoes: [],
        });
        navigate(`/cadastros/modelos-contrato/editar?id=${id}`);
      }
    } catch (e) {
      setErro(e.message);
    }
  }
  async function alterarStatus(modelo) {
    try {
      const inativar = modelo.status !== "ARQUIVADO";
      if (modo === "api") {
        const atualizado = inativar
          ? await api.inativarModeloContrato(modelo.id)
          : await api.reativarModeloContrato(modelo.id);
        setRemotos((lista) =>
          lista.map((item) => (item.id === atualizado.id ? atualizado : item)),
        );
      } else
        salvar("modelosContrato", {
          ...modelo,
          status: inativar ? "ARQUIVADO" : "PUBLICADO",
        });
      setSelecionado({
        ...modelo,
        status: inativar ? "ARQUIVADO" : "PUBLICADO",
      });
      setToast(inativar ? "Modelo inativado." : "Modelo reativado.");
    } catch (e) {
      setErro(e.message);
    }
  }
  const resumoTexto = selecionado
    ? new DOMParser().parseFromString(selecionado.conteudo || "", "text/html")
        .body.textContent
    : "";
  return (
    <CadastroLista
      titulo="Modelos de contrato"
      descricao="Cadastre e gerencie os modelos utilizados nos contratos."
      novoTexto="Novo modelo"
      onNovo={
        podeEditar
          ? () => navigate("/cadastros/modelos-contrato/novo")
          : undefined
      }
      icone={FilePlus2}
      indicadores={[
        { label: "Modelos cadastrados", value: modelos.length },
        {
          label: "Ativos",
          value: modelos.filter((m) => m.status === "PUBLICADO").length,
          tone: "green",
        },
        {
          label: "Inativos",
          value: modelos.filter((m) => m.status === "ARQUIVADO").length,
          tone: "red",
        },
      ]}
      rows={filtrados}
      busca={busca}
      setBusca={setBusca}
      placeholder="Buscar modelo ou finalidade..."
      filtros={
        <SelectFilter
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            "Todos",
            { value: "PUBLICADO", label: "Ativo" },
            { value: "ARQUIVADO", label: "Inativo" },
          ]}
        />
      }
      columns={[
        {
          key: "nome",
          label: "Modelo",
          render: (m) => <strong>{m.nome}</strong>,
        },
        {
          key: "descricao",
          label: "Finalidade",
          render: (m) => m.descricao || "—",
        },
        {
          key: "numeroVersao",
          label: "Versão",
          render: (m) => `v${m.numeroVersao}`,
        },
        {
          key: "atualizadoEm",
          label: "Atualizado",
          render: (m) => dataModelo(m.atualizadoEm),
        },
        {
          key: "status",
          label: "Status",
          render: (m) => <Badge>{statusTexto(m.status)}</Badge>,
        },
      ]}
      selecionado={selecionado}
      setSelecionado={setSelecionado}
      nome={selecionado?.nome}
      status={selecionado ? statusTexto(selecionado.status) : ""}
      detalhes={
        selecionado
          ? [
              ["Nome", selecionado.nome],
              ["Finalidade", selecionado.descricao || "—"],
              ["Versão", `v${selecionado.numeroVersao}`],
              ["Atualizado", dataModelo(selecionado.atualizadoEm)],
            ]
          : []
      }
      detalheExtra={
        selecionado && (
          <Card title="Resumo do documento" className="inner-card">
            <p className="cadastro-modelo-resumo">
              {resumoTexto.slice(0, 450)}
              {resumoTexto.length > 450 ? "…" : ""}
            </p>
          </Card>
        )
      }
      rodape={
        podeEditar && (
          <>
            <button
              className="btn danger-outline"
              onClick={() => alterarStatus(selecionado)}
            >
              {selecionado?.status === "ARQUIVADO" ? "Reativar" : "Inativar"}{" "}
              modelo
            </button>
            <button
              className="btn outline"
              onClick={() => duplicar(selecionado)}
            >
              <Copy size={16} />
              Duplicar
            </button>
            <button
              className="btn primary"
              onClick={() =>
                navigate(
                  `/cadastros/modelos-contrato/editar?id=${selecionado.id}`,
                )
              }
            >
              Editar modelo
            </button>
            {selecionado?.status === "PUBLICADO" && (
              <button
                className="btn outline"
                onClick={() =>
                  navigate(`/contratos/novo?modelo=${selecionado.id}`)
                }
              >
                Usar modelo
              </button>
            )}
          </>
        )
      }
      erro={erro}
      onRetry={() => setTentativaLista((v) => v + 1)}
      carregando={carregando}
    />
  );
}

export function EditorModeloContratoPage() {
  const [secaoMobile, setSecaoMobile] = useState("edicao");
  const editorRef = useRef(null);
  const { modo, modelosContrato, salvar, setToast } = useDados();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const id = params.get("id");
  const existente = modelosContrato.find((m) => m.id === id);
  const [modelo, setModelo] = useState(existente || null);
  const [versoes, setVersoes] = useState([]);
  const [erro, setErro] = useState("");
  const [previa, setPrevia] = useState(false);
  const [paginaHistorico, setPaginaHistorico] = useState(1);
  const paginasHistorico = Math.max(1, Math.ceil(versoes.length / 5));
  const [versaoPrevia, setVersaoPrevia] = useState(null);
  const [erroHistorico, setErroHistorico] = useState("");
  const [tentativa, setTentativa] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const [importando, setImportando] = useState(false);
  const operando = salvando || importando;
  const emOperacao = useRef(false);
  const idSalvo = useRef(id);
  const persistido = useRef(null);
  useEffect(() => {
    idSalvo.current = id;
  }, [id]);
  const confirmarSalvo = useEdicaoProtegida(modelo, Boolean(modelo));
  useEffect(() => {
    let ativo = true;
    setErro("");
    if (modo === "api" && id) {
      setModelo(null);
      api
        .consultarModeloContrato(id)
        .then((d) => {
          if (ativo) {
            persistido.current = d;
            setModelo(d);
            confirmarSalvo(d);
          }
        })
        .catch((e) => {
          if (ativo) setErro(e.message);
        });
      api
        .versoesModeloContrato(id)
        .then((d) => {
          if (ativo) setVersoes(d);
        })
        .catch((e) => {
          if (ativo) setErroHistorico(e.message);
        });
    } else {
      persistido.current = existente || null;
      setVersoes(existente?.versoes || []);
      setModelo(
        existente || {
          id: "",
          nome: "",
          descricao: "",
          conteudo: "CONTRATO DE PRESTAÇÃO DE SERVIÇOS\n\n",
          status: "RASCUNHO",
          numeroVersao: 0,
        },
      );
      if (existente) confirmarSalvo(existente);
    }
    return () => {
      ativo = false;
    };
  }, [modo, id, tentativa, confirmarSalvo]);
  useEffect(() => {
    editorRef.current?.setEditable(!operando);
  }, [operando]);
  if (!modelo && erro)
    return (
      <Card title="Não foi possível abrir o modelo">
        <AvisoErro erro={erro} onRetry={() => setTentativa((v) => v + 1)} />
        <button
          className="btn outline"
          onClick={() => navigate("/cadastros/modelos-contrato")}
        >
          Voltar à lista
        </button>
      </Card>
    );
  if (!modelo)
    return (
      <Card title="Carregando modelo">
        <p className="muted">Carregando a versão mais recente...</p>
      </Card>
    );
  const salvarModelo = async () => {
    if (emOperacao.current) return;
    const escopo = document.querySelector(".template-edit-column");
    if (!validarCampos(escopo)) {
      setSecaoMobile("edicao");
      requestAnimationFrame(() => validarCampos(escopo));
      return setErro("Confira os campos destacados.");
    }
    if (!modelo.nome.trim()) {
      setSecaoMobile("edicao");
      destacarCampo("Nome do modelo", "Preencha o nome do modelo.", escopo);
      return setErro("Informe o nome do modelo.");
    }
    if (conteudoModeloVazio(modelo.conteudo)) {
      setSecaoMobile("edicao");
      destacarCampo(
        "Conteúdo do modelo",
        "Preencha o texto do modelo.",
        escopo,
      );
      requestAnimationFrame(() =>
        destacarCampo(
          "Conteúdo do modelo",
          "Preencha o texto do modelo.",
          escopo,
        ),
      );
      return setErro("Preencha o texto do modelo.");
    }
    if (modelo.conteudo.length > 30000) {
      setSecaoMobile("edicao");
      destacarCampo(
        "Conteúdo do modelo",
        "Use no máximo 30.000 caracteres no texto do modelo.",
        escopo,
      );
      return setErro("Use no máximo 30.000 caracteres no texto do modelo.");
    }
    emOperacao.current = true;
    setSalvando(true);
    setErro("");
    try {
      const dados = dadosModeloContrato(modelo);
      let resultado;
      let houveAlteracao;
      const registrarPersistido = (salvo) => {
        idSalvo.current = salvo.id;
        persistido.current = salvo;
        setModelo(salvo);
        confirmarSalvo(salvo);
      };
      if (modo === "api") {
        const gravacao = await salvarModeloConectado({
          modelo,
          persistido: persistido.current,
          servico: api,
          onPersistido: registrarPersistido,
        });
        resultado = gravacao.modelo;
        houveAlteracao = gravacao.alterado || gravacao.ativado;
      } else {
        const alterado = !mesmoModeloContrato(modelo, persistido.current);
        houveAlteracao = alterado || modelo.status === "RASCUNHO";
        const novo = {
          ...modelo,
          ...dados,
          id:
            idSalvo.current ||
            `MOD-${String(modelosContrato.length + 1).padStart(3, "0")}`,
          status: modelo.status === "ARQUIVADO" ? "ARQUIVADO" : "PUBLICADO",
          numeroVersao: (modelo.numeroVersao || 0) + (alterado ? 1 : 0),
          atualizadoEm: houveAlteracao
            ? new Date().toLocaleDateString("pt-BR")
            : modelo.atualizadoEm,
          versoes: alterado
            ? [
                ...(modelo.versoes || []),
                {
                  id: crypto.randomUUID(),
                  numero: (modelo.numeroVersao || 0) + 1,
                  conteudo: dados.conteudo,
                  criadoEm: new Date().toISOString(),
                },
              ]
            : modelo.versoes || [],
        };
        if (houveAlteracao) salvar("modelosContrato", novo);
        registrarPersistido(novo);
        resultado = novo;
      }
      confirmarSalvo(resultado);
      setToast(
        !houveAlteracao
          ? "Nenhuma alteração. O modelo já está salvo."
          : resultado.status === "ARQUIVADO"
            ? "Modelo salvo. O cadastro continua inativo."
            : "Modelo salvo e pronto para uso.",
      );
      navigate("/cadastros/modelos-contrato");
    } catch (e) {
      setErro(e.message);
      if (e instanceof AtivacaoModeloPendente)
        setToast({ tipo: "aviso", mensagem: e.message });
    } finally {
      emOperacao.current = false;
      setSalvando(false);
    }
  };
  const inserir = (variavel) =>
    editorRef.current
      ?.chain()
      .focus()
      .insertContent(variavel + " ")
      .run();
  const importarDocumento = async (evento) => {
    if (emOperacao.current) return;
    const arquivo = evento.target.files?.[0];
    if (!arquivo) return;
    emOperacao.current = true;
    setImportando(true);
    setErro("");
    try {
      let conteudo;
      if (modo === "api")
        conteudo = (await api.importarDocumentoContrato(arquivo)).conteudo;
      else conteudo = await lerDocumentoImportado(arquivo);
      setModelo((atual) => ({ ...atual, conteudo }));
      setToast(
        "Documento importado. Revise o texto e inclua as variáveis necessárias.",
      );
    } catch (e) {
      setErro(e.message);
    } finally {
      emOperacao.current = false;
      setImportando(false);
      evento.target.value = "";
    }
  };
  const dadosPrevia = {
    "@RazaoSocialCliente": "Cliente Exemplo LTDA",
    "@NomeFantasiaCliente": "Cliente Exemplo",
    "@DocumentoCliente": "12.345.678/0001-90",
    "@EnderecoCliente": "Rua Exemplo, 100",
    "@CidadeCliente": "São Paulo/SP",
    "@TelefoneCliente": "(11) 3456-7890",
    "@EmailCliente": "cliente@example.com",
    "@RepresentanteCliente": "Representante do cliente",
    "@RazaoSocialContratada": "Prestador Exemplo LTDA",
    "@NomeFantasiaContratada": "Prestador Exemplo",
    "@CNPJContratada": "12.345.678/0001-90",
    "@DocumentoContratada": "12.345.678/0001-90",
    "@TipoDocumentoContratada": "CNPJ",
    "@TipoDocumentoCliente": "CNPJ",
    "@EnderecoContratada": "Avenida Exemplo, 200",
    "@CidadeContratada": "São Paulo/SP",
    "@TelefoneContratada": "(11) 3333-2200",
    "@EmailContratada": "prestador@example.com",
    "@RepresentanteContratada": "Representante do prestador",
    "@Orcamento": "Orçamento #52",
    "@DataOrcamento": "30/09/2026",
    "@DescricaoServico": "Recuperação de mandrins",
    "@ValorOrcamento": "R$ 28.500,00",
    "@NumeroContrato": "CT-012",
    "@CondicoesPagamento": "50% na assinatura e 50% na entrega",
    "@FormaPagamento": "Transferência bancária",
    "@ValorEntrada": "R$ 14.250,00",
    "@ValorSaldo": "R$ 14.250,00",
    "@DadosBancarios": "Banco 001 · Ag. 1234 · C/C 000123-4",
    "@DataInicio": "01/10/2026",
    "@DataFim": "01/04/2027",
    "@PrazoExecucao": "6 meses",
    "@DataAssinatura": "30/09/2026",
  };
  return (
    <>
      <PageHeading
        title={id ? "Editar modelo" : "Novo modelo de contrato"}
        subtitle="Crie o texto padrão e use variáveis para cada negociação."
        action={
          <>
            <label className="btn outline import-document">
              <Upload size={16} /> Importar DOCX
              <input
                type="file"
                accept=".docx,.txt"
                disabled={operando}
                onChange={importarDocumento}
              />
            </label>
            <button className="btn outline" onClick={() => setPrevia(true)}>
              Visualizar modelo
            </button>
            <button
              className="btn primary"
              disabled={operando}
              data-salvando={salvando || undefined}
              onClick={salvarModelo}
            >
              <Save size={16} /> {salvando ? "Salvando..." : "Salvar"}
            </button>
          </>
        }
      />
      <div
        aria-busy={operando}
        className={`template-editor-layout template-split-layout template-mode-${secaoMobile}`}
      >
        <nav className="template-mobile-tabs" aria-label="Seções do modelo">
          {[
            ["edicao", "Editar modelo"],
            ["previa", "Ver prévia"],
          ].map(([valor, label]) => (
            <button
              type="button"
              key={valor}
              className={`btn ${secaoMobile === valor ? "primary" : "outline"}`}
              aria-pressed={secaoMobile === valor}
              onClick={() => setSecaoMobile(valor)}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="template-edit-column" inert={operando ? "" : undefined}>
          <Card title="Cadastro do modelo" className="template-meta">
            <Field label="Nome do modelo *">
              <input
                value={modelo.nome}
                onChange={(e) => setModelo({ ...modelo, nome: e.target.value })}
                placeholder="Ex.: Prestação de serviços"
                maxLength={120}
                required
              />
            </Field>
            <Field label="Finalidade">
              <input
                value={modelo.descricao || ""}
                onChange={(e) =>
                  setModelo({ ...modelo, descricao: e.target.value })
                }
                placeholder="Em quais contratos este modelo será usado?"
                maxLength={500}
              />
            </Field>
            <div className="template-side-note">
              <Badge>{statusTexto(modelo.status)}</Badge>
              <History size={17} />
              <span>
                Versão atual: <b>{modelo.numeroVersao || 1}</b>
              </span>
            </div>
          </Card>
          <Card title="Texto do contrato" className="template-document">
            <p className="template-writing-hint">
              Digite @ para inserir variáveis. As assinaturas são incluídas
              automaticamente.
            </p>
            <EditorConteudo
              editorRef={editorRef}
              value={modelo.conteudo}
              onChange={(conteudo) =>
                setModelo((atual) => ({ ...atual, conteudo }))
              }
              label="Conteúdo do modelo"
            />
            <button
              type="button"
              className="btn outline template-add-paragraph"
              onClick={() =>
                editorRef.current
                  ?.chain()
                  .focus("end")
                  .insertContent("<p></p>")
                  .run()
              }
            >
              <Plus size={16} /> Adicionar parágrafo
            </button>
            {erro && (
              <p className="inline-error" role="alert">
                {erro}
              </p>
            )}
          </Card>
          <details className="card template-variables">
            <summary>Variáveis disponíveis</summary>
            <p className="muted">
              Arraste para posicionar no texto ou clique para inserir no cursor.
            </p>
            {variaveisContrato.map(([grupo, itens]) => (
              <div className="variable-group" key={grupo}>
                <strong>{grupo}</strong>
                {itens.map((item) => (
                  <button
                    key={item}
                    draggable
                    onDragStart={(e) =>
                      e.dataTransfer.setData("text/variavel", item)
                    }
                    onClick={() => {
                      inserir(item);
                      setSecaoMobile("edicao");
                    }}
                  >
                    {item}
                  </button>
                ))}
              </div>
            ))}
          </details>
          <Card title="Histórico de versões" className="template-history-card">
            <p className="muted">
              Abra uma versão para conferir o conteúdo antes de restaurar.
            </p>
            <AvisoErro
              erro={erroHistorico}
              onRetry={() =>
                api
                  .versoesModeloContrato(idSalvo.current)
                  .then((d) => {
                    setVersoes(d);
                    setErroHistorico("");
                  })
                  .catch((e) => setErroHistorico(e.message))
              }
            />
            {!erroHistorico && !versoes.length && (
              <p className="muted">
                As versões aparecerão aqui após salvar o modelo.
              </p>
            )}
            <div className="template-version-history">
              {[...versoes]
                .sort((a, b) => b.numero - a.numero)
                .slice((paginaHistorico - 1) * 5, paginaHistorico * 5)
                .map((v) => (
                  <div key={v.id} className="template-version-row">
                    <div>
                      <strong>Versão {v.numero}</strong>
                      {v.criadoEm && (
                        <small>
                          {new Date(v.criadoEm).toLocaleString("pt-BR")}
                        </small>
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn outline"
                      onClick={() => setVersaoPrevia(v)}
                    >
                      Ver prévia
                    </button>
                  </div>
                ))}
            </div>
            <div className="template-history-footer">
              {" "}
              {versoes.length > 0 && (
                <nav
                  className="template-history-pagination"
                  aria-label="Paginação do histórico"
                >
                  <button
                    className="btn outline"
                    disabled={paginaHistorico === 1}
                    onClick={() => setPaginaHistorico((p) => p - 1)}
                  >
                    Anterior
                  </button>
                  <span role="status">
                    Página {paginaHistorico} de {paginasHistorico} ·{" "}
                    {versoes.length} versões
                  </span>
                  <button
                    className="btn outline"
                    disabled={paginaHistorico === paginasHistorico}
                    onClick={() => setPaginaHistorico((p) => p + 1)}
                  >
                    Próxima
                  </button>
                </nav>
              )}
            </div>
          </Card>
        </div>
        <Card
          title="Prévia do documento"
          className="template-live-preview"
          action={
            <button
              type="button"
              className="btn outline"
              onClick={() => setPrevia(true)}
            >
              Ampliar
            </button>
          }
        >
          <p className="muted">
            Dados fictícios para conferir o texto. A paginação final é definida
            ao gerar o PDF.
          </p>
          <div className="template-preview-workspace">
            <div className="template-preview-paper">
              <article
                className="contract-preview"
                dangerouslySetInnerHTML={{
                  __html: preencherModelo(modelo.conteudo, dadosPrevia),
                }}
              />
              <div className="signature-preview">
                <div>
                  Cliente Exemplo LTDA
                  <br />
                  Contratante
                </div>
                <div>
                  Prestador Exemplo LTDA
                  <br />
                  Contratada
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
      {versaoPrevia && (
        <Modal
          proteger={false}
          title={`Prévia da versão ${versaoPrevia.numero}`}
          wide
          onClose={() => setVersaoPrevia(null)}
          footer={
            <>
              <button
                className="btn outline"
                onClick={() => {
                  setVersaoPrevia(null);
                }}
              >
                Voltar ao histórico
              </button>
              <button
                className="btn primary"
                onClick={() => {
                  setModelo((atual) => ({
                    ...atual,
                    conteudo: versaoPrevia.conteudo,
                  }));
                  setVersaoPrevia(null);
                  setSecaoMobile("edicao");
                  setToast(
                    "Conteúdo restaurado. Salve o modelo para registrar a alteração.",
                  );
                }}
              >
                Restaurar esta versão
              </button>
            </>
          }
        >
          <p className="muted">
            Versão salva, preenchida com dados de demonstração. Abrir a prévia
            não altera o modelo atual.
          </p>
          <article
            className="contract-preview"
            dangerouslySetInnerHTML={{
              __html: preencherModelo(versaoPrevia.conteudo, dadosPrevia),
            }}
          />
        </Modal>
      )}
      {previa && (
        <Modal
          proteger={false}
          title="Prévia do modelo"
          wide
          onClose={() => setPrevia(false)}
          footer={
            <button className="btn primary" onClick={() => setPrevia(false)}>
              Fechar prévia
            </button>
          }
        >
          <p className="muted">Exemplo preenchido com dados de demonstração.</p>
          <article
            className="contract-preview"
            dangerouslySetInnerHTML={{
              __html: preencherModelo(modelo.conteudo, dadosPrevia),
            }}
          />
          <div className="signature-preview">
            <div>
              Cliente Exemplo LTDA
              <br />
              Contratante
            </div>
            <div>
              Prestador Exemplo LTDA
              <br />
              Contratada
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

export function SeletorModeloContrato({ valor, onChange, modelos }) {
  return (
    <Field label="Modelo de contrato *">
      <SelectPesquisavel
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        required
      >
        <option value="">Selecione um modelo</option>
        {modelos
          .filter((m) => m.status === "PUBLICADO" || m.status === "Publicado")
          .map((m) => (
            <option value={m.id} key={m.id}>
              {m.nome} · versão {m.numeroVersao}
            </option>
          ))}
      </SelectPesquisavel>
    </Field>
  );
}

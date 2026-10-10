import { medidaApi, medidaUi } from "./unidadesMedida.js";
import { useEffect, useState } from "react";

export function usePaginaApi(
  carregar,
  {
    ativo,
    busca = "",
    status = "",
    tamanho = 10,
    unidade = "",
    sort = "",
    ...filtros
  },
) {
  const chaveFiltros = JSON.stringify(filtros);
  const [pagina, setPagina] = useState(0);
  const [versao, setVersao] = useState(0);
  const [resultado, setResultado] = useState({
    conteudo: [],
    totalElementos: 0,
    totalPaginas: 0,
  });
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [carregado, setCarregado] = useState(false);
  useEffect(() => {
    setResultado({ conteudo: [], totalElementos: 0, totalPaginas: 0 });
    setCarregado(false);
  }, [unidade]);
  useEffect(
    () => setPagina(0),
    [busca, status, tamanho, unidade, sort, chaveFiltros],
  );
  useEffect(() => {
    if (!ativo) return;
    let cancelado = false;
    setCarregando(true);
    setErro("");
    carregar({
      busca,
      status,
      pagina,
      tamanho,
      sort,
      ...JSON.parse(chaveFiltros),
    })
      .then((dados) => {
        if (!cancelado) {
          setResultado(dados);
          setCarregado(true);
        }
      })
      .catch((falha) => {
        if (!cancelado) setErro(falha.message);
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [
    ativo,
    carregar,
    busca,
    status,
    pagina,
    tamanho,
    versao,
    unidade,
    sort,
    chaveFiltros,
  ]);
  useEffect(() => {
    const atualizar = () => setVersao((v) => v + 1);
    window.addEventListener("focus", atualizar);
    return () => window.removeEventListener("focus", atualizar);
  }, []);
  return {
    ...resultado,
    pagina,
    setPagina,
    carregando,
    erro,
    anterior: Boolean(erro && carregado),
    filtrado: Boolean(
      busca ||
        status ||
        Object.values(filtros).some(
          (v) => v !== undefined && v !== null && v !== "",
        ),
    ),
    recarregar: () => setVersao((v) => v + 1),
  };
}

export function clienteDaApi(c) {
  const contato = c.contatos?.[0] || {};
  const outrosContatos = (c.contatos || []).slice(1).map((item) => ({
    id: item.id,
    nome: item.nome || "",
    cargo: item.cargo || "",
    telefone: item.telefone || "",
    email: item.email || "",
  }));
  return {
    id: c.id,
    tipo: c.tipo,
    nome: c.nomeFantasia || c.nomeRazaoSocial,
    razao: c.nomeRazaoSocial,
    documento: c.documento,
    contato: contato.nome || "",
    telefone: contato.telefone || "",
    email: contato.email || "",
    endereco: c.endereco || "",
    cidade: "",
    observacoes: c.observacaoInterna || "",
    contatos: outrosContatos,
    status: c.ativo ? "Ativo" : "Inativo",
    ultimo: "—",
    valor: 0,
  };
}
export function clienteParaApi(c) {
  const telefone = c.telefone?.trim() || null;
  const email = c.email?.trim() || null;
  if (!telefone && !email)
    throw new Error("Informe telefone ou e-mail para o contato.");
  const contatosAdicionais = (c.contatos || [])
    .filter((contato) => contato.nome?.trim())
    .map((contato) => ({
      nome: contato.nome.trim(),
      telefone: contato.telefone?.trim() || null,
      email: contato.email?.trim() || null,
    }));
  const enderecoEstruturado = [
    c.logradouro,
    c.numero,
    c.complemento,
    c.bairro,
    [c.cidade, c.estado].filter(Boolean).join("/"),
    c.cep,
  ]
    .filter(Boolean)
    .join(" · ");
  return {
    tipo: c.tipo || "PJ",
    nomeRazaoSocial: (c.razao || c.nome).trim(),
    nomeFantasia: c.nome?.trim() || null,
    documento: (c.documento || "").replace(/\D/g, ""),
    endereco: enderecoEstruturado || c.endereco?.trim() || null,
    observacaoInterna: c.observacoes?.trim() || null,
    contatos: [
      { nome: (c.contato || c.nome || c.razao).trim(), telefone, email },
      ...contatosAdicionais,
    ],
  };
}
export function catalogoDaApi(i) {
  return {
    id: i.id,
    codigo: i.codigoReferencia || "",
    nome: i.nome,
    categoria:
      i.tipo === "MAO_DE_OBRA"
        ? "Mão de obra"
        : i.tipo === "PECA"
          ? "Peças"
          : "Materiais",
    tipoApi: i.tipo,
    unidade: medidaUi[i.unidadeMedida] || i.unidadeMedidaPersonalizada || "UN",
    valor: Number(i.valorPadrao),
    preco: Number(i.valorPadrao),
    custo: null,
    status: i.ativo ? "Ativo" : "Inativo",
    observacoes: i.descricao || "",
    data: "—",
  };
}
export function catalogoParaApi(i, labor) {
  const unidade = i.unidade || "UN";
  const unidadeMedida = medidaApi[unidade] || "OUTRA";
  return {
    tipo: labor ? "MAO_DE_OBRA" : "PECA",
    nome: i.nome.trim(),
    descricao: i.observacoes?.trim() || null,
    unidadeMedida,
    unidadeMedidaPersonalizada: unidadeMedida === "OUTRA" ? unidade : null,
    valorPadrao: Number(labor ? i.preco : i.valor) || 0,
    codigoReferencia: i.codigo?.trim() || null,
  };
}

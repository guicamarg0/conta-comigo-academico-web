import { aplicarErrosCampos } from "./validacao.js";
import { comBloqueioSessao, avisarSaidaOutraAba } from "./sessaoNavegador.js";
const raiz = (
  import.meta.env?.PROD ? "/api/v1" : import.meta.env?.VITE_API_URL || "/api/v1"
).replace(/\/$/, "");
let renovacaoEmAndamento;
let restauracaoEmAndamento;
let saidaEmAndamento;
let geracaoSessao = 0;

export function guardarToken(token, renovacao = false) {
  if (!token)
    throw new ErroApi("A sessão não foi iniciada. Tente entrar novamente.");
  if (!renovacao) geracaoSessao++;
  sessionStorage.setItem("ederflexo.token", token);
}

export function limparSessao() {
  geracaoSessao++;
  sessionStorage.removeItem("ederflexo.token");
  sessionStorage.removeItem("ederflexo.unidadeId");
}

function acessoAlterado() {
  return new ErroApi(
    "Seu acesso mudou. Entre novamente para continuar.",
    401,
    {},
    "SESSAO_ALTERADA",
  );
}

export class ErroApi extends Error {
  constructor(mensagem, status = 0, campos = {}, codigo = "") {
    super(mensagem);
    this.name = "ErroApi";
    this.status = status;
    this.campos = campos;
    this.codigo = codigo;
  }
}
async function buscarComPrazo(url, opcoes, prazo = 30000) {
  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), prazo);
  try {
    return await fetch(url, { ...opcoes, signal: controle.signal });
  } catch (e) {
    const gravacao = opcoes.method && opcoes.method !== "GET";
    throw new ErroApi(
      (e.name === "AbortError"
        ? "A conexão demorou mais que o esperado."
        : "Não foi possível conectar ao servidor.") +
        (gravacao
          ? " Confira se a operação foi concluída antes de tentar novamente."
          : " Confira sua conexão e tente novamente."),
    );
  } finally {
    clearTimeout(timer);
  }
}
async function falhaResposta(resposta, token) {
  if (resposta.status === 401 && token) encerrarSessaoInvalida();
  const erro = await resposta.json().catch(() => ({}));
  if (erro.campos && typeof document !== "undefined")
    aplicarErrosCampos(erro.campos);
  const padrao = {
    401: "Entre novamente para continuar.",
    403: "Você não tem permissão para esta ação.",
    404: "O registro não foi encontrado. Ele pode ter sido removido.",
    409: "Os dados foram alterados. Atualize a tela antes de continuar.",
    429: "Muitas tentativas. Aguarde um pouco e tente novamente.",
  };
  throw new ErroApi(
    resposta.status >= 500
      ? "O servidor está indisponível no momento. Tente novamente em instantes."
      : erro.detail ||
        erro.message ||
        padrao[resposta.status] ||
        "Não foi possível concluir a solicitação.",
    resposta.status,
    erro.campos || {},
    erro.code,
  );
}

function encerrarSessaoInvalida() {
  limparSessao();
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event("ederflexo:autenticacao-expirada"));
}

// Uma renovação compartilhada evita consumir o mesmo cookie rotativo duas vezes.
export async function renovarSessao() {
  if (saidaEmAndamento) throw acessoAlterado();
  if (renovacaoEmAndamento) return renovacaoEmAndamento;
  const geracao = geracaoSessao;
  renovacaoEmAndamento = comBloqueioSessao(async () => {
    if (geracao !== geracaoSessao || saidaEmAndamento) throw acessoAlterado();
    const resposta = await buscarComPrazo(`${raiz}/autenticacao/renovar`, {
      method: "POST",
      credentials: "include",
    });
    if (!resposta.ok) await falhaResposta(resposta, null);
    const dados = await resposta.json();
    if (geracao !== geracaoSessao || saidaEmAndamento) throw acessoAlterado();
    guardarToken(dados.tokenAcesso, true);
    return dados;
  });
  try {
    return await renovacaoEmAndamento;
  } finally {
    renovacaoEmAndamento = null;
  }
}

async function respostaAutenticada(caminho, opcoes, token, prazo) {
  const geracao = geracaoSessao;
  if (token && saidaEmAndamento) throw acessoAlterado();
  let resposta = await buscarComPrazo(
    `${raiz}${caminho}`,
    {
      ...opcoes,
      credentials: "include",
    },
    prazo,
  );
  if (token && geracao !== geracaoSessao) throw acessoAlterado();
  if (resposta.status === 401 && token) {
    // Só repetimos uma resposta 401: a API rejeitou a operação antes de executá-la.
    let renovado;
    try {
      const atual = sessionStorage.getItem("ederflexo.token");
      renovado =
        atual && atual !== token
          ? { tokenAcesso: atual }
          : await renovarSessao();
    } catch (erro) {
      if (erro.codigo === "SESSAO_ALTERADA") throw erro;
      if ([401, 403, 404].includes(erro.status)) {
        encerrarSessaoInvalida();
        throw new ErroApi("Entre novamente para continuar.", 401);
      }
      throw erro;
    }
    resposta = await buscarComPrazo(
      `${raiz}${caminho}`,
      {
        ...opcoes,
        credentials: "include",
        headers: {
          ...opcoes.headers,
          Authorization: `Bearer ${renovado.tokenAcesso}`,
        },
      },
      prazo,
    );
  }
  if (token && geracao !== geracaoSessao) throw acessoAlterado();
  if (!resposta.ok) await falhaResposta(resposta, token);
  return resposta;
}

function parametros(valores) {
  const busca = new URLSearchParams();
  Object.entries(valores).forEach(([chave, valor]) => {
    if (valor !== undefined && valor !== null && valor !== "")
      busca.set(chave, String(valor));
  });
  return busca.toString();
}

export async function requisicao(
  caminho,
  {
    method = "GET",
    body,
    token = sessionStorage.getItem("ederflexo.token"),
    unidadeId = sessionStorage.getItem("ederflexo.unidadeId"),
  } = {},
) {
  const geracao = geracaoSessao;
  const resposta = await respostaAutenticada(
    caminho,
    {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(unidadeId ? { "X-Unidade-Id": unidadeId } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    },
    token,
  );
  const dados = resposta.status === 204 ? null : await resposta.json();
  if (token && geracao !== geracaoSessao) throw acessoAlterado();
  if (
    method !== "GET" &&
    !caminho.startsWith("/autenticacao/") &&
    !caminho.includes("/onboarding") &&
    typeof window !== "undefined"
  )
    window.dispatchEvent(new Event("ederflexo:dados-alterados"));
  return dados;
}

async function arquivo(caminho) {
  const geracao = geracaoSessao;
  const token = sessionStorage.getItem("ederflexo.token");
  const unidadeId = sessionStorage.getItem("ederflexo.unidadeId");
  const resposta = await respostaAutenticada(
    caminho,
    {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(unidadeId ? { "X-Unidade-Id": unidadeId } : {}),
      },
    },
    token,
    90000,
  );
  const dados = await resposta.blob();
  if (token && geracao !== geracaoSessao) throw acessoAlterado();
  return dados;
}

async function enviarArquivo(caminho, arquivo) {
  const geracao = geracaoSessao;
  const corpo = new FormData();
  corpo.append("arquivo", arquivo);
  const token = sessionStorage.getItem("ederflexo.token");
  const unidadeId = sessionStorage.getItem("ederflexo.unidadeId");
  const resposta = await respostaAutenticada(
    caminho,
    {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(unidadeId ? { "X-Unidade-Id": unidadeId } : {}),
      },
      body: corpo,
    },
    token,
    120000,
  );
  const dados = await resposta.json();
  if (token && geracao !== geracaoSessao) throw acessoAlterado();
  return dados;
}

export const api = {
  renovarSessao,
  async restaurarSessao() {
    if (restauracaoEmAndamento) return restauracaoEmAndamento;
    restauracaoEmAndamento = (async () => {
      if (!sessionStorage.getItem("ederflexo.token")) await renovarSessao();
      return this.me();
    })();
    try {
      return await restauracaoEmAndamento;
    } finally {
      restauracaoEmAndamento = null;
    }
  },
  async sair() {
    if (saidaEmAndamento) return saidaEmAndamento;
    geracaoSessao++;
    const pendente = renovacaoEmAndamento;
    // Conservar a sessão local até a API confirmar a revogação do cookie.
    saidaEmAndamento = (async () => {
      // Uma resposta atrasada não poderá repor o JWT; Sair usa o cookie mais recente.
      await pendente?.catch(() => {});
      await comBloqueioSessao(() =>
        requisicao("/autenticacao/sair", {
          method: "POST",
          token: null,
          unidadeId: null,
        }),
      );
      limparSessao();
      avisarSaidaOutraAba();
    })();
    try {
      await saidaEmAndamento;
    } finally {
      saidaEmAndamento = null;
    }
  },
  atualizarOnboarding: () =>
    requisicao("/unidades/atual/onboarding/atualizar", { method: "POST" }),
  salvarOnboarding: (body) =>
    requisicao("/unidades/atual/onboarding", { method: "PUT", body }),
  consultarConvite: (codigo) =>
    requisicao("/convites/consultar", {
      method: "POST",
      body: { codigo },
      token: null,
      unidadeId: null,
    }),
  cadastrarConvite: (dados) =>
    requisicao("/convites/cadastro", {
      method: "POST",
      body: dados,
      token: null,
      unidadeId: null,
    }),
  codigosUnidade: () => requisicao("/unidades/atual/codigos"),
  salvarCodigosUnidade: (dados) =>
    requisicao("/unidades/atual/codigos", { method: "PUT", body: dados }),
  unidadesGerais: () =>
    requisicao("/administracao-geral/unidades", { unidadeId: null }),
  criarUnidadeGeral: (dados) =>
    requisicao("/administracao-geral/unidades", {
      method: "POST",
      body: dados,
      unidadeId: null,
    }),
  enviarComprovante: (arquivo) => enviarArquivo("/arquivos", arquivo),
  baixarComprovante: (caminho) => {
    if (!/^\/arquivos\/[0-9a-f-]{36}$/i.test(caminho))
      throw new Error("Referência do comprovante inválida.");
    return arquivo(caminho);
  },
  painel: (de, ate) => requisicao(`/painel?${parametros({ de, ate })}`),
  recuperarSenha: (email) =>
    requisicao("/autenticacao/recuperar-senha", {
      method: "POST",
      body: { email },
      token: null,
      unidadeId: null,
    }),
  redefinirSenha: (token, senha) =>
    requisicao("/autenticacao/redefinir-senha", {
      method: "POST",
      body: { token, senha },
      token: null,
      unidadeId: null,
    }),
  enviarRecuperacaoUsuario: (id) =>
    requisicao(`/unidades/atual/usuarios/${id}/recuperar-senha`, {
      method: "POST",
    }),
  atualizarUsuario: (id, dados) =>
    requisicao(`/unidades/atual/usuarios/${id}`, {
      method: "PUT",
      body: dados,
    }),
  reativarUsuario: (id) =>
    requisicao(`/unidades/atual/usuarios/${id}/reativar`, { method: "POST" }),
  cadastro: (dados) =>
    requisicao("/autenticacao/cadastro", {
      method: "POST",
      body: dados,
      token: null,
      unidadeId: null,
    }),
  async login(dados) {
    const geracao = ++geracaoSessao;
    return comBloqueioSessao(async () => {
      if (geracao !== geracaoSessao) throw acessoAlterado();
      const token = await requisicao("/autenticacao/login", {
        method: "POST",
        body: dados,
        token: null,
        unidadeId: null,
      });
      if (geracao !== geracaoSessao) throw acessoAlterado();
      return token;
    });
  },
  me: () => requisicao("/me", { unidadeId: null }),
  criarUnidade: (nome) =>
    requisicao("/unidades", { method: "POST", body: { nome } }),
  selecionarUnidade: (id) =>
    requisicao(`/me/unidades/${encodeURIComponent(id)}/selecionar`, {
      unidadeId: null,
      method: "POST",
      body: {},
    }),
  aceitarConvite: (codigo) =>
    requisicao("/convites/aceitar", {
      method: "POST",
      body: { codigo },
      unidadeId: null,
    }),
  listarClientes: ({
    busca = "",
    pagina = 0,
    tamanho = 10,
    clienteAtivo,
  } = {}) =>
    requisicao(
      `/contratantes?${parametros({ busca, page: pagina, size: tamanho, ativo: clienteAtivo })}`,
    ),
  async todosClientes() {
    const primeira = await this.listarClientes({ pagina: 0, tamanho: 100 });
    const paginas = await Promise.all(
      Array.from({ length: Math.max(0, primeira.totalPaginas - 1) }, (_, i) =>
        this.listarClientes({ pagina: i + 1, tamanho: 100 }),
      ),
    );
    return [primeira, ...paginas].flatMap((p) => p.conteudo);
  },
  criarCliente: (dados) =>
    requisicao("/contratantes", { method: "POST", body: dados }),
  atualizarCliente: (id, dados) =>
    requisicao(`/contratantes/${id}`, { method: "PUT", body: dados }),
  reativarCliente: (id) =>
    requisicao(`/contratantes/${id}/reativar`, { method: "PATCH" }),
  inativarCliente: (id) =>
    requisicao(`/contratantes/${id}/inativar`, { method: "PATCH" }),
  listarCatalogo: ({ busca = "", tipo = "", pagina = 0, tamanho = 10 } = {}) =>
    requisicao(
      `/catalogo-itens?${parametros({ busca, tipo, page: pagina, size: tamanho })}`,
    ),
  async todoCatalogo() {
    const primeira = await this.listarCatalogo({ pagina: 0, tamanho: 100 });
    const paginas = await Promise.all(
      Array.from({ length: Math.max(0, primeira.totalPaginas - 1) }, (_, i) =>
        this.listarCatalogo({ pagina: i + 1, tamanho: 100 }),
      ),
    );
    return [primeira, ...paginas].flatMap((p) => p.conteudo);
  },
  listarCatalogoPecas: ({
    busca = "",
    status = "",
    sort = "nome,asc",
    pagina = 0,
    tamanho = 10,
  } = {}) =>
    requisicao(
      `/catalogo-itens?${parametros({ busca, sort, ativo: status === "Ativo" ? "true" : status === "Inativo" ? "false" : "", tipo: "PECA", page: pagina, size: tamanho })}`,
    ),
  listarCatalogoMaoObra: ({
    busca = "",
    status = "",
    sort = "nome,asc",
    pagina = 0,
    tamanho = 10,
  } = {}) =>
    requisicao(
      `/catalogo-itens?${parametros({ busca, sort, ativo: status === "Ativo" ? "true" : status === "Inativo" ? "false" : "", tipo: "MAO_DE_OBRA", page: pagina, size: tamanho })}`,
    ),
  criarItem: (dados) =>
    requisicao("/catalogo-itens", { method: "POST", body: dados }),
  atualizarItem: (id, dados) =>
    requisicao(`/catalogo-itens/${id}`, { method: "PUT", body: dados }),
  requisicaoStatusItem: (id, ativo) =>
    requisicao(`/catalogo-itens/${id}/${ativo ? "reativar" : "inativar"}`, {
      method: "PATCH",
    }),
  reativarItem: (id) =>
    requisicao(`/catalogo-itens/${id}/reativar`, { method: "PATCH" }),
  inativarItem: (id) =>
    requisicao(`/catalogo-itens/${id}/inativar`, { method: "PATCH" }),
  listarOrcamentos: ({
    busca = "",
    status = "",
    pagina = 0,
    tamanho = 10,
  } = {}) =>
    requisicao(
      `/orcamentos?${parametros({ busca, status, page: pagina, size: tamanho })}`,
    ),
  async todosOrcamentos(status = "") {
    const primeira = await this.listarOrcamentos({
      status,
      pagina: 0,
      tamanho: 100,
    });
    const demais = await Promise.all(
      Array.from(
        { length: Math.max(0, primeira.totalPaginas - 1) },
        (_, pagina) =>
          this.listarOrcamentos({ status, pagina: pagina + 1, tamanho: 100 }),
      ),
    );
    return [primeira, ...demais].flatMap((resultado) => resultado.conteudo);
  },
  criarOrcamento: (dados) =>
    requisicao("/orcamentos", { method: "POST", body: dados }),
  consultarOrcamento: (id) => requisicao(`/orcamentos/${id}`),
  atualizarOrcamento: (id, dados) =>
    requisicao(`/orcamentos/${id}`, { method: "PUT", body: dados }),
  transicionarOrcamento: (id, acao, observacao = "") =>
    requisicao(`/orcamentos/${id}/${acao}`, {
      method: "POST",
      body: { observacao },
    }),
  duplicarOrcamento: (id) =>
    requisicao(`/orcamentos/${id}/duplicar`, { method: "POST", body: {} }),
  async pdfOrcamento(id, revisao) {
    return arquivo(`/orcamentos/${id}/revisoes/${revisao}/pdf`);
  },
  listarServicos: ({
    busca = "",
    status = "",
    pagina = 0,
    tamanho = 10,
  } = {}) =>
    requisicao(
      `/servicos?${parametros({ busca, status, page: pagina, size: tamanho })}`,
    ),
  async todosServicos() {
    const primeira = await this.listarServicos({ pagina: 0, tamanho: 100 });
    const demais = await Promise.all(
      Array.from(
        { length: Math.max(0, primeira.totalPaginas - 1) },
        (_, pagina) =>
          this.listarServicos({ pagina: pagina + 1, tamanho: 100 }),
      ),
    );
    return [primeira, ...demais].flatMap((resultado) => resultado.conteudo);
  },
  consultarServico: (id) => requisicao(`/servicos/${id}`),
  criarServico: (dados) =>
    requisicao("/servicos", { method: "POST", body: dados }),
  atualizarServico: (id, dados) =>
    requisicao(`/servicos/${id}`, { method: "PUT", body: dados }),
  agendarServico: (id, dados) =>
    requisicao(`/servicos/${id}/agendamento`, { method: "PUT", body: dados }),
  iniciarServico: (id) =>
    requisicao(`/servicos/${id}/iniciar`, { method: "POST" }),
  concluirServico: (id, resumoConclusao) =>
    requisicao(`/servicos/${id}/concluir`, {
      method: "POST",
      body: { resumoConclusao },
    }),
  cancelarServico: (id) =>
    requisicao(`/servicos/${id}/cancelar`, { method: "POST" }),
  listarAgenda: ({ de, ate, responsavel = "", pagina = 0, tamanho = 50 }) =>
    requisicao(
      `/agenda?${parametros({ de, ate, responsavel, page: pagina, size: tamanho })}`,
    ),
  async todaAgenda(de, ate) {
    const primeira = await this.listarAgenda({
      de,
      ate,
      pagina: 0,
      tamanho: 100,
    });
    const demais = await Promise.all(
      Array.from(
        { length: Math.max(0, primeira.totalPaginas - 1) },
        (_, pagina) =>
          this.listarAgenda({ de, ate, pagina: pagina + 1, tamanho: 100 }),
      ),
    );
    return {
      ...primeira,
      conteudo: [primeira, ...demais].flatMap(
        (resultado) => resultado.conteudo,
      ),
    };
  },
  listarContratos: ({
    busca = "",
    status = "",
    cadastro = "ATIVO",
    pagina = 0,
    tamanho = 10,
  } = {}) =>
    requisicao(
      `/contratos?${parametros({ busca, status, cadastro, page: pagina, size: tamanho })}`,
    ),
  consultarContrato: (id) => requisicao(`/contratos/${id}`),
  snapshotsContrato: (id) => requisicao(`/contratos/${id}/snapshots`),
  versoesContrato: (id, { pagina = 0, tamanho = 10 } = {}) =>
    requisicao(
      `/contratos/${id}/versoes?${parametros({ page: pagina, size: tamanho })}`,
    ),
  atividadesContrato: (id, { pagina = 0, tamanho = 10 } = {}) =>
    requisicao(
      `/contratos/${id}/atividades?${parametros({ page: pagina, size: tamanho })}`,
    ),
  restaurarContrato: (id, versaoId) =>
    requisicao(`/contratos/${id}/versoes/${versaoId}/restaurar`, {
      method: "POST",
    }),
  marcarContratoVigente: (id) =>
    requisicao(`/contratos/${id}/marcar-vigente`, { method: "POST" }),
  inativarContrato: (id) =>
    requisicao(`/contratos/${id}/inativar`, { method: "POST" }),
  reativarContrato: (id) =>
    requisicao(`/contratos/${id}/reativar`, { method: "POST" }),
  criarContrato: (dados) =>
    requisicao("/contratos", { method: "POST", body: dados }),
  atualizarContrato: (id, dados) =>
    requisicao(`/contratos/${id}`, { method: "PUT", body: dados }),
  previaContrato: (dados) =>
    requisicao("/contratos/previa", { method: "POST", body: dados }),
  encerrarContrato: (id) =>
    requisicao(`/contratos/${id}/encerrar`, { method: "POST" }),
  pdfContrato: (id) => arquivo(`/contratos/${id}/pdf`),
  listarModelosContrato: ({ status = "", pagina = 0, tamanho = 50 } = {}) =>
    requisicao(
      `/modelos-contrato?${parametros({ status, page: pagina, size: tamanho })}`,
    ),
  consultarModeloContrato: (id) => requisicao(`/modelos-contrato/${id}`),
  criarModeloContrato: (dados) =>
    requisicao("/modelos-contrato", { method: "POST", body: dados }),
  atualizarModeloContrato: (id, dados) =>
    requisicao(`/modelos-contrato/${id}`, { method: "PUT", body: dados }),
  publicarModeloContrato: (id) =>
    requisicao(`/modelos-contrato/${id}/publicar`, { method: "POST" }),
  inativarModeloContrato: (id) =>
    requisicao(`/modelos-contrato/${id}/inativar`, { method: "POST" }),
  reativarModeloContrato: (id) =>
    requisicao(`/modelos-contrato/${id}/reativar`, { method: "POST" }),
  listarEmpresas: () => requisicao("/empresas"),
  criarEmpresa: (dados) =>
    requisicao("/empresas", { method: "POST", body: dados }),
  atualizarEmpresa: (id, dados) =>
    requisicao(`/empresas/${id}`, { method: "PUT", body: dados }),
  inativarEmpresa: (id) =>
    requisicao(`/empresas/${id}/inativar`, { method: "POST" }),
  reativarEmpresa: (id) =>
    requisicao(`/empresas/${id}/reativar`, { method: "POST" }),
  duplicarModeloContrato: (id) =>
    requisicao(`/modelos-contrato/${id}/duplicar`, { method: "POST" }),
  versoesModeloContrato: (id) => requisicao(`/modelos-contrato/${id}/versoes`),
  importarDocumentoContrato: (arquivo) =>
    enviarArquivo("/modelos-contrato/importar-documento", arquivo),
  consultarConfiguracao: () => requisicao("/unidades/atual/configuracao"),
  consultarFormasPagamento: () =>
    requisicao("/unidades/atual/formas-pagamento"),
  salvarFormasPagamento: (formasRecebimento) =>
    requisicao("/unidades/atual/formas-pagamento", {
      method: "PUT",
      body: { formasRecebimento },
    }),
  listarFormasRecebimento: () =>
    requisicao("/unidades/atual/formas-recebimento"),
  salvarConfiguracao: (dados) =>
    requisicao("/unidades/atual/configuracao", { method: "PUT", body: dados }),
  listarUsuarios: () => requisicao("/unidades/atual/usuarios"),
  atualizarPerfil: (id, perfil) =>
    requisicao(`/unidades/atual/usuarios/${id}/perfil`, {
      method: "PATCH",
      body: { perfil },
    }),
  desativarUsuario: (id) =>
    requisicao(`/unidades/atual/usuarios/${id}`, { method: "DELETE" }),
  criarUsuarioUnidade: (dados) =>
    requisicao("/unidades/atual/usuarios/novo", {
      method: "POST",
      body: dados,
    }),
  listarConvites: () => requisicao("/unidades/atual/convites"),
  criarConvite: (perfil) =>
    requisicao("/unidades/atual/convites", {
      method: "POST",
      body: { perfil },
    }),
  revogarConvite: (id) =>
    requisicao(`/unidades/atual/convites/${id}`, { method: "DELETE" }),
};

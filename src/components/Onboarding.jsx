import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ListChecks,
  Sparkles,
} from "lucide-react";
import { api } from "../api.js";
import { useDados } from "../context.jsx";
import { Modal, PageHeading } from "../components.jsx";
import { gerencia } from "../permissoes.js";
import {
  etapasOnboarding,
  resumoOnboarding,
  combinarEtapas,
  etapasDemo,
} from "../onboarding.js";
import "./onboarding.css";
import { PREFIXO_DEMO } from "../demo/armazenamento.js";

const Contexto = createContext(null);
const apresentacao = [
  {
    titulo: "Sua unidade começa aqui",
    texto:
      "Conheça o sistema e prepare os cadastros para o primeiro atendimento.",
    rota: "/",
  },
  {
    titulo: "Seus dados, em todos os documentos",
    texto:
      "Empresa, formas de pagamento e códigos deixam seus orçamentos e contratos prontos para usar.",
    rota: "/cadastros/empresas",
  },
  {
    titulo: "Do orçamento ao contrato",
    texto:
      "Monte os itens, gere o PDF e registre a decisão do cliente. Um orçamento aprovado pode virar contrato.",
    rota: "/orcamentos",
  },
  {
    titulo: "Seu próximo passo sempre à mão",
    texto:
      "Clique no checkpoint do cabeçalho para retomar a preparação. Em Ver etapas, consulte tudo que falta até seu primeiro serviço.",
    rota: "/servicos",
  },
];
const vazio = {
  etapasConcluidas: [],
  apresentacaoVista: false,
  conclusaoDispensada: false,
};
export function OnboardingProvider({ children }) {
  const dados = useDados(),
    local = useLocation();
  const unidadeId =
    dados.modo === "api"
      ? sessionStorage.getItem("ederflexo.unidadeId")
      : dados.unidade;
  const chave = `${dados.modo}:${unidadeId || ""}:${dados.usuario.email || ""}`;
  const chaveAtual = useRef(chave);
  chaveAtual.current = chave;
  const [estado, setEstado] = useState({ chave: "", dados: vazio });
  const [erro, setErro] = useState(""),
    [carregando, setCarregando] = useState(false);
  const sequencia = useRef(0);
  const demoRef = useRef(dados);
  demoRef.current = dados;
  const armazenamento =
    dados.modo === "api"
      ? `ederflexo.onboarding.${chave}`
      : `${PREFIXO_DEMO}onboarding.${chave}`;
  const progressoDemo = `${PREFIXO_DEMO}onboarding.${unidadeId}.etapas`;
  const carregar = useCallback(async () => {
    if (
      !unidadeId ||
      (dados.modo === "api" && !sessionStorage.getItem("ederflexo.token"))
    )
      return;
    const pedido = ++sequencia.current;
    setCarregando(true);
    setErro("");
    try {
      let resultado;
      if (dados.modo === "api") resultado = await api.atualizarOnboarding();
      else {
        const ler = (nome, base) => {
          try {
            return (
              JSON.parse(
                localStorage.getItem(`${PREFIXO_DEMO}${unidadeId}.${nome}`),
              ) || base
            );
          } catch {
            return base;
          }
        };
        let anterior;
        try {
          anterior = JSON.parse(localStorage.getItem(armazenamento)) || vazio;
        } catch {
          anterior = vazio;
        }
        resultado = {
          ...anterior,
          etapasConcluidas: combinarEtapas(
            JSON.parse(localStorage.getItem(progressoDemo) || "[]"),
            etapasDemo(demoRef.current, unidadeId, ler),
          ),
        };
        localStorage.setItem(
          progressoDemo,
          JSON.stringify(resultado.etapasConcluidas),
        );
        localStorage.setItem(armazenamento, JSON.stringify(resultado));
      }
      if (chaveAtual.current === chave && pedido === sequencia.current)
        setEstado({ chave, dados: resultado });
    } catch (e) {
      if (chaveAtual.current === chave && pedido === sequencia.current)
        setErro(e.message);
    } finally {
      if (chaveAtual.current === chave && pedido === sequencia.current)
        setCarregando(false);
    }
  }, [chave, unidadeId, dados.modo, armazenamento, progressoDemo]);
  useEffect(() => {
    carregar();
  }, [carregar, local.pathname]);
  useEffect(() => {
    let timer;
    const atualizar = () => {
      clearTimeout(timer);
      timer = setTimeout(carregar, 200);
    };
    window.addEventListener("ederflexo:dados-alterados", atualizar);
    window.addEventListener("focus", atualizar);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("ederflexo:dados-alterados", atualizar);
      window.removeEventListener("focus", atualizar);
    };
  }, [carregar]);
  useEffect(() => {
    if (dados.modo !== "api") carregar();
  }, [
    dados.clientes,
    dados.pecas,
    dados.modelosContrato,
    dados.orcamentos,
    dados.contratos,
    dados.servicos,
    carregar,
  ]);
  const status = estado.chave === chave ? estado.dados : null;
  const salvar = async (preferencias) => {
    ++sequencia.current;
    try {
      const resultado =
        dados.modo === "api"
          ? await api.salvarOnboarding(preferencias)
          : {
              ...status,
              apresentacaoVista:
                status.apresentacaoVista || preferencias.apresentacaoVista,
              conclusaoDispensada:
                status.conclusaoDispensada || preferencias.conclusaoDispensada,
            };
      if (dados.modo !== "api")
        localStorage.setItem(armazenamento, JSON.stringify(resultado));
      if (chaveAtual.current === chave) setEstado({ chave, dados: resultado });
      return true;
    } catch (e) {
      dados.setToast(e);
      return false;
    } finally {
      if (chaveAtual.current === chave) setCarregando(false);
    }
  };
  return (
    <Contexto.Provider
      value={{
        status,
        erro,
        carregando,
        carregar,
        salvar,
        chave,
        ativo: Boolean(unidadeId),
        podeGerenciar: gerencia(dados.modo, dados.usuario),
        consulta: dados.modo === "api" && dados.usuario.perfil === "CONSULTA",
      }}
    >
      {children}
    </Contexto.Provider>
  );
}

function Guia({ onAbrir }) {
  const { status, podeGerenciar, consulta } = useContext(Contexto);
  const resumo = resumoOnboarding(status?.etapasConcluidas);
  return (
    <>
      <p className="muted">
        O progresso pertence à unidade. Outros usuários podem ajudar a completar
        os cadastros.
      </p>
      <div
        className="onboarding-progresso"
        role="progressbar"
        aria-label="Preparação da unidade"
        aria-valuemin={0}
        aria-valuemax={8}
        aria-valuenow={resumo.quantidade}
      >
        <span style={{ width: `${resumo.percentual}%` }} />
      </div>
      <p className="onboarding-contagem">
        {resumo.quantidade} de 8 etapas concluídas · {8 - resumo.quantidade}{" "}
        restantes
      </p>
      <ol className="onboarding-etapas">
        {etapasOnboarding.map((etapa, i) => {
          const semPermissao =
            !resumo.concluidas[i] &&
            (consulta || (etapa.gestor && !podeGerenciar));
          return (
            <li key={etapa.nome} className={i === resumo.atual ? "atual" : ""}>
              <span
                className={`onboarding-numero ${resumo.concluidas[i] ? "concluido" : ""}`}
              >
                {resumo.concluidas[i] ? <Check size={16} /> : i + 1}
              </span>
              <div>
                <strong>
                  {etapa.nome}
                  {i === resumo.atual && <small> Próximo passo</small>}
                </strong>
                <p>{etapa.descricao}</p>
                {semPermissao && (
                  <p className="muted">
                    Peça a um gestor para concluir esta etapa. Você pode
                    consultar o cadastro.
                  </p>
                )}
                <button
                  className="btn outline"
                  onClick={() =>
                    onAbrir(
                      (semPermissao || resumo.concluidas[i]) && i === 5
                        ? "/orcamentos"
                        : (semPermissao || resumo.concluidas[i]) && i === 6
                          ? "/contratos"
                          : etapa.rota,
                    )
                  }
                >
                  {resumo.concluidas[i] || semPermissao
                    ? "Consultar"
                    : "Abrir etapa"}
                  <ArrowRight size={14} />
                </button>
                {etapa.alternativa && (
                  <button
                    className="btn outline"
                    onClick={() => onAbrir(etapa.alternativa)}
                  >
                    {etapa.alternativaNome}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="muted">
        Esta é uma ordem recomendada. Você pode continuar usando o sistema e
        voltar a qualquer etapa.
      </p>
    </>
  );
}

export function OnboardingCheckpoint() {
  const {
    status,
    erro,
    carregar,
    salvar,
    chave,
    ativo,
    podeGerenciar,
    consulta,
  } = useContext(Contexto);
  const { unidade } = useDados();
  const navigate = useNavigate(),
    local = useLocation();
  const [guiaAberto, setGuiaAberto] = useState(false),
    [tour, setTour] = useState(null),
    [salvando, setSalvando] = useState(false);
  const tentativas = useRef(new Set());
  const progressoAnterior = useRef({ chave: "", completo: false });
  useEffect(() => {
    if (!status) return;
    const completo = resumoOnboarding(status.etapasConcluidas).completo;
    const anterior = progressoAnterior.current;
    progressoAnterior.current = { chave, completo };
    if (
      anterior.chave !== chave ||
      anterior.completo ||
      !completo ||
      status.conclusaoDispensada
    )
      return;
    const mostrar = () => {
      if (document.querySelector("dialog[open]")) return;
      setGuiaAberto(true);
      observador.disconnect();
    };
    const observador = new MutationObserver(mostrar);
    observador.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ["open"],
    });
    mostrar();
    return () => observador.disconnect();
  }, [
    status?.etapasConcluidas.filter(Boolean).length,
    chave,
    status?.conclusaoDispensada,
  ]);
  useEffect(() => {
    const rever = () => setTour(0);
    window.addEventListener("ederflexo:rever-apresentacao", rever);
    return () =>
      window.removeEventListener("ederflexo:rever-apresentacao", rever);
  }, []);
  useEffect(() => {
    setGuiaAberto(false);
    setTour(null);
  }, [chave]);
  useEffect(() => {
    if (
      status &&
      !status.apresentacaoVista &&
      local.pathname === "/" &&
      !tentativas.current.has(chave)
    ) {
      tentativas.current.add(chave);
      setTour(0);
    }
  }, [status, chave, local.pathname]);
  if (!ativo) return null;
  if (!status)
    return erro ? (
      <button className="btn outline onboarding-checkpoint" onClick={carregar}>
        Recarregar primeiros passos
      </button>
    ) : null;
  const resumo = resumoOnboarding(status.etapasConcluidas),
    etapa = etapasOnboarding[resumo.atual];
  const abrir = (rota) => {
    setGuiaAberto(false);
    navigate(rota);
  };
  const retomar = () => {
    if (resumo.completo) setGuiaAberto(true);
    else
      navigate(
        consulta && resumo.atual === 5
          ? "/orcamentos"
          : (consulta || !podeGerenciar) && resumo.atual === 6
            ? "/contratos"
            : etapa.rota,
      );
  };
  const fecharTour = async (comecar = false) => {
    if (salvando) return;
    setSalvando(true);
    if (await salvar({ apresentacaoVista: true, conclusaoDispensada: false })) {
      setTour(null);
      if (comecar) retomar();
    }
    setSalvando(false);
  };
  return (
    <>
      {!status.conclusaoDispensada && (
        <div className="onboarding-checkpoint-wrap">
          <button
            className="onboarding-checkpoint"
            onClick={retomar}
            aria-label={
              resumo.completo
                ? "Preparação concluída: ver primeiros passos"
                : `Continuar preparação: ${etapa.nome}`
            }
          >
            <span className="onboarding-percentual">
              {resumo.completo ? (
                <CheckCircle2 size={22} />
              ) : (
                `${resumo.percentual}%`
              )}
            </span>
            <span>
              <strong>
                {resumo.completo ? "Preparação concluída" : etapa.nome}
              </strong>
              <small>
                {resumo.quantidade}/8 etapas
                {!resumo.completo && " · Continuar →"}
              </small>
            </span>
          </button>
          <button
            className="onboarding-ver"
            onClick={() => setGuiaAberto(true)}
            aria-label="Ver etapas da preparação"
          >
            <ListChecks size={17} />
            <span>Ver etapas</span>
          </button>
        </div>
      )}
      {guiaAberto && (
        <Modal
          title={
            resumo.completo
              ? "Sua unidade está pronta!"
              : "Primeiros passos da unidade"
          }
          proteger={false}
          onClose={() => setGuiaAberto(false)}
          busy={salvando}
          footer={
            <>
              <button
                className="btn outline"
                onClick={() => {
                  setGuiaAberto(false);
                  setTour(0);
                }}
              >
                Rever apresentação
              </button>
              {resumo.completo && (
                <button
                  className="btn outline"
                  disabled={salvando}
                  onClick={async () => {
                    setSalvando(true);
                    if (
                      await salvar({
                        apresentacaoVista: true,
                        conclusaoDispensada: true,
                      })
                    )
                      setGuiaAberto(false);
                    setSalvando(false);
                  }}
                >
                  Dispensar checkpoint
                </button>
              )}
              <button
                className="btn primary"
                onClick={() =>
                  resumo.completo
                    ? abrir(consulta ? "/orcamentos" : "/orcamentos/novo")
                    : (setGuiaAberto(false), retomar())
                }
              >
                {resumo.completo
                  ? consulta
                    ? "Abrir orçamentos"
                    : "Criar novo orçamento"
                  : "Continuar preparação"}
              </button>
            </>
          }
        >
          {resumo.completo && (
            <div className="onboarding-sucesso">
              <CheckCircle2 size={32} />
              <p>
                Você criou seu primeiro orçamento, contrato e serviço. O guia
                continua disponível em Ajuda → Primeiros passos.
              </p>
            </div>
          )}
          <Guia onAbrir={abrir} />
        </Modal>
      )}
      {tour !== null && (
        <Modal
          title="Conheça o sistema"
          proteger={false}
          onClose={() => fecharTour()}
          busy={salvando}
          footer={
            <>
              <button
                className="btn outline"
                disabled={salvando}
                onClick={() => fecharTour()}
              >
                Explorar sozinho
              </button>
              <button
                className="btn outline"
                disabled={tour === 0 || salvando}
                onClick={() => {
                  const anterior = tour - 1;
                  setTour(anterior);
                  navigate(apresentacao[anterior].rota);
                }}
              >
                Voltar
              </button>
              <button
                className="btn primary"
                disabled={salvando}
                onClick={() => {
                  if (tour === 3) fecharTour(true);
                  else {
                    const proximo = tour + 1;
                    setTour(proximo);
                    navigate(apresentacao[proximo].rota);
                  }
                }}
              >
                {tour === 3 ? "Começar minha unidade" : "Continuar"}
                <ArrowRight size={16} />
              </button>
            </>
          }
        >
          <div className="onboarding-apresentacao">
            <Sparkles size={28} />
            <p className="muted">Apresentação · {tour + 1} de 4</p>
            <h2>{apresentacao[tour].titulo}</h2>
            <p>{apresentacao[tour].texto}</p>
            <p className="onboarding-fluxo">
              Cadastros → Orçamento → Contrato → Serviço
            </p>
            <p className="onboarding-unidade">
              O progresso é da <strong>{unidade}</strong>. A apresentação pode
              ser revista em Ajuda → Primeiros passos.
            </p>
          </div>
        </Modal>
      )}
    </>
  );
}

export function PrimeirosPassosPage() {
  const contexto = useContext(Contexto),
    navigate = useNavigate();
  return (
    <>
      <PageHeading
        title="Primeiros passos"
        subtitle="Preparação e progresso da unidade."
      />
      <section className="card onboarding-guia-pagina">
        {contexto.erro && (
          <p role="alert">
            {contexto.erro}{" "}
            <button className="btn outline" onClick={contexto.carregar}>
              Tentar novamente
            </button>
          </p>
        )}
        {!contexto.status ? (
          <p role="status">Carregando progresso...</p>
        ) : (
          <Guia onAbrir={navigate} />
        )}
        <button
          className="btn outline"
          onClick={() =>
            window.dispatchEvent(new Event("ederflexo:rever-apresentacao"))
          }
        >
          Rever apresentação
        </button>
      </section>
    </>
  );
}

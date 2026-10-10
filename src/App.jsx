import { ConvitePage } from "./pages/convite.jsx";
import {
  OnboardingProvider,
  OnboardingCheckpoint,
  PrimeirosPassosPage,
} from "./components/Onboarding.jsx";
import { EdicaoProvider } from "./components/EdicaoProtegida.jsx";
import { LimiteErro } from "./components/Feedback.jsx";
import { permiteRota } from "./permissoes.js";
import React, { useEffect, useState, useRef } from "react";
import { useMobile } from "./components/useMobile";
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  CalendarDays,
  ChevronDown,
  FileText,
  Home,
  LogOut,
  Menu,
  Package,
  Settings,
  Users,
  Wrench,
  X,
  BriefcaseBusiness,
} from "lucide-react";
import { ClientesPage, ServicosPage, PecasPage } from "./pages/operations.jsx";
import {
  OrcamentosPage,
  NovoOrcamentoPage,
  ContratosPage,
  NovoContratoPage,
} from "./pages/commercial.jsx";
import { api } from "./api.js";
import Marca from "./components/Marca.jsx";
import { AuthPage } from "./pages/auth.jsx";
import { SessaoInicial } from "./components/SessaoInicial.jsx";
import { AdministracaoGeralPage } from "./pages/administracaoGeral.jsx";
import { AgendaOperacional } from "./pages/agendaOperacional";
import { DashboardOperacional } from "./pages/dashboardOperacional";
import { ServicosConectados } from "./pages/operationsApi.jsx";
import {
  ContratosConectados,
  NovoContratoConectado,
} from "./pages/contractsApi.jsx";
import { ConfiguracoesConectadas } from "./pages/settingsApi.jsx";
import {
  EditorModeloContratoPage,
  ModelosContratoPage,
} from "./pages/contractTemplates.jsx";
import { EmpresasPage } from "./pages/companiesApi.jsx";
import { UsuariosPage } from "./pages/usersApi.jsx";
import { FormasPagamentoPage } from "./pages/paymentFormsApi.jsx";
import { DadosProvider, useDados } from "./context.jsx";
import { Card, Field, PageHeading, Stat, Modal } from "./components.jsx";

const menus = [
  ["/", "Dashboard", Home],
  ["/orcamentos", "Orçamentos", FileText],
  ["/contratos", "Contratos", FileText],
  ["/servicos", "Serviços", Wrench],
  ["/agenda", "Agenda", CalendarDays],
  ["/clientes", "Clientes", Users],
  ["/cadastros", "Cadastros", Package],
  ["/configuracoes", "Configurações", Settings],
];
const cadastrosLinks = [
  ["/clientes", "Clientes"],
  ["/pecas", "Peças"],
  ["/cadastros/formas-pagamento", "Formas de pagamento"],
  ["/cadastros/empresas", "Empresas"],
  ["/cadastros/usuarios", "Usuários"],
  ["/cadastros/modelos-contrato", "Modelos de contrato"],
];

function CadastrosHub() {
  const { modo, usuario } = useDados();
  return (
    <>
      <PageHeading
        title="Cadastros"
        subtitle="Dados usados em orçamentos, serviços e contratos."
      />
      <div className="stats-grid three">
        {cadastrosLinks
          .filter(([path]) => permiteRota(path, modo, usuario))
          .map(([path, titulo]) => (
            <Link className="card cadastro-card" key={path} to={path}>
              <strong>{titulo}</strong>
              <span>Ver e gerenciar →</span>
            </Link>
          ))}
      </div>
    </>
  );
}

function Logo({ escuro = false }) {
  return <Marca escuro={escuro} />;
}

export function Campo({ label, children, className = "" }) {
  return (
    <Field label={label} className={className}>
      {children}
    </Field>
  );
}

function ModuloIndisponivel({ nome }) {
  return (
    <>
      <PageHeading title={nome} subtitle="Integração em preparação" />
      <Card title="Ainda não disponível nesta unidade">
        <p>
          A API ainda não oferece as operações deste módulo. A prévia visual
          continua disponível pela entrada de demonstração.
        </p>
        <Link className="btn primary" to="/">
          Voltar ao painel
        </Link>
      </Card>
    </>
  );
}

function PainelConectado() {
  const { unidade, usuario } = useDados();
  const [totais, setTotais] = useState(null);
  const [erro, setErro] = useState("");
  useEffect(() => {
    let ativo = true;
    Promise.all([
      api.listarClientes({ tamanho: 1 }),
      api.listarCatalogo({ tamanho: 1 }),
      api.listarOrcamentos({ tamanho: 1 }),
    ])
      .then(([clientes, catalogo, orcamentos]) => {
        if (ativo)
          setTotais({
            clientes: clientes.totalElementos,
            catalogo: catalogo.totalElementos,
            orcamentos: orcamentos.totalElementos,
          });
      })
      .catch((e) => {
        if (ativo) setErro(e.message);
      });
    return () => {
      ativo = false;
    };
  }, [unidade]);
  return (
    <>
      <PageHeading
        title="Dashboard"
        subtitle={`Visão geral da unidade ${unidade}`}
      />
      {erro && (
        <p className="inline-error" role="alert">
          {erro}
        </p>
      )}
      <div className="stats-grid three">
        <Stat
          icon={Users}
          label="Clientes"
          value={totais?.clientes ?? "—"}
          detail="Cadastrados"
        />
        <Stat
          icon={Package}
          label="Itens de catálogo"
          value={totais?.catalogo ?? "—"}
          detail="Peças e mão de obra"
        />
        <Stat
          icon={FileText}
          label="Orçamentos"
          value={totais?.orcamentos ?? "—"}
          detail="Nesta unidade"
        />
      </div>
      <Card title="Acesso rápido">
        <div className="button-pair">
          {usuario.perfil !== "CONSULTA" && (
            <Link className="btn primary" to="/orcamentos/novo">
              Novo orçamento
            </Link>
          )}
          <Link className="btn outline" to="/clientes">
            Clientes
          </Link>
        </div>
      </Card>
    </>
  );
}

function Layout() {
  const mobile = useMobile();
  const sidebarRef = useRef(null);
  const {
    usuario,
    setUsuario,
    setUnidades,
    unidade,
    restaurarDemo,
    setModo,
    setToast,
    modo,
  } = useDados();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmarRestauroDemo, setConfirmarRestauroDemo] = useState(false);
  const [cadastrosAbertos, setCadastrosAbertos] = useState(false);
  const navigate = useNavigate();
  const local = useLocation();
  useEffect(() => {
    if (modo !== "api" || !sessionStorage.getItem("ederflexo.token")) return;
    let ativo = true;
    api
      .me()
      .then((me) => {
        if (!ativo) return;
        setUsuario((u) => ({
          ...u,
          nome: me.nome,
          email: me.email,
          administradorGeral: me.administradorGeral === true,
        }));
        setUnidades(me.unidades || []);
      })
      .catch((falha) => {
        if (ativo) setToast(falha);
      });
    return () => {
      ativo = false;
    };
  }, [modo, setUsuario, setUnidades, setToast]);
  useEffect(() => setMobileOpen(false), [local.pathname]);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [local.pathname]);
  useEffect(() => {
    if (!mobileOpen || !mobile) return;
    const anterior = document.activeElement;
    sidebarRef.current.querySelector("button")?.focus();
    const teclado = (e) => {
      if (e.key === "Escape") setMobileOpen(false);
      if (e.key !== "Tab") return;
      const itens = [...sidebarRef.current.querySelectorAll("a,button")].filter(
        (el) => el.getClientRects().length,
      );
      const primeiro = itens[0],
        ultimo = itens[itens.length - 1];
      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    };
    document.addEventListener("keydown", teclado);
    return () => {
      document.removeEventListener("keydown", teclado);
      if (anterior?.isConnected) anterior.focus({ preventScroll: true });
    };
  }, [mobileOpen, mobile]);
  if (import.meta.env.PROD && !sessionStorage.getItem("ederflexo.token"))
    return <Navigate to="/login" replace />;
  return (
    <div className="app-layout">
      <aside
        ref={sidebarRef}
        inert={mobile && !mobileOpen ? "" : undefined}
        className={`sidebar ${mobileOpen ? "open" : ""}`}
      >
        <button
          type="button"
          className="sidebar-close icon-btn"
          aria-label="Fechar menu"
          onClick={() => setMobileOpen(false)}
        >
          <X size={22} />
        </button>
        <Link to="/" className="sidebar-logo">
          <Logo />
        </Link>
        <nav aria-label="Menu principal">
          {modo === "api" && usuario.administradorGeral && (
            <NavLink
              to="/administracao-geral"
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <Settings size={20} />
              <span>Administração geral</span>
            </NavLink>
          )}
          {menus
            .filter(
              ([path]) =>
                path !== "/clientes" &&
                !(
                  modo === "api" &&
                  usuario.administradorGeral &&
                  !sessionStorage.getItem("ederflexo.unidadeId")
                ),
            )
            .map(([path, titulo, Icon]) =>
              path === "/cadastros" ? (
                <React.Fragment key={path}>
                  <button
                    className={`nav-item nav-group ${local.pathname === path || cadastrosLinks.some(([link]) => local.pathname === link) ? "active" : ""}`}
                    aria-expanded={cadastrosAbertos}
                    onClick={() => setCadastrosAbertos((v) => !v)}
                  >
                    <Icon size={20} strokeWidth={1.8} />
                    <span>{titulo}</span>
                    <ChevronDown size={15} />
                  </button>
                  {(cadastrosAbertos ||
                    local.pathname === path ||
                    cadastrosLinks.some(
                      ([link]) => local.pathname === link,
                    )) && (
                    <div className="nav-submenu">
                      {cadastrosLinks
                        .filter(([link]) => permiteRota(link, modo, usuario))
                        .map(([link, nome]) => (
                          <NavLink
                            key={link}
                            to={link}
                            className={({ isActive }) =>
                              `nav-subitem ${isActive ? "active" : ""}`
                            }
                          >
                            {nome}
                          </NavLink>
                        ))}
                    </div>
                  )}
                </React.Fragment>
              ) : (
                <NavLink
                  end={path === "/"}
                  to={path}
                  key={path}
                  className={({ isActive }) =>
                    `nav-item ${isActive ? "active" : ""}`
                  }
                >
                  <Icon size={20} strokeWidth={1.8} />
                  <span>{titulo}</span>
                </NavLink>
              ),
            )}
        </nav>
        <button
          className="sidebar-unit"
          onClick={() => navigate("/selecionar-unidade")}
        >
          <span className="unit-icon">
            <BriefcaseBusiness size={22} />
          </span>
          <span>
            <strong>{unidade}</strong>
            <small>Minha Empresa</small>
          </span>
          <ChevronDown size={15} />
        </button>
      </aside>
      {mobileOpen && (
        <button
          className="mobile-shade"
          aria-label="Fechar menu"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <div className="main-wrap" inert={mobile && mobileOpen ? "" : undefined}>
        <header className="topbar">
          <button
            className="mobile-menu icon-btn"
            aria-label="Abrir menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
          >
            <Menu />
          </button>
          <div className="topbar-context">
            <strong>Conta Comigo</strong>
            {modo !== "api" && (
              <span className="badge amber">Demonstração</span>
            )}
          </div>
          <div className="top-actions">
            <OnboardingCheckpoint />
            {modo !== "api" && (
              <button
                className="btn outline"
                onClick={() => setConfirmarRestauroDemo(true)}
              >
                Restaurar demo
              </button>
            )}
            <button
              className="user-menu-btn"
              aria-label={`Menu do usuário ${usuario.nome}`}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <span className="avatar">
                {usuario.nome
                  ?.split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("") || "JS"}
              </span>
              <span>
                <strong>{usuario.nome}</strong>
                <small>{unidade}</small>
              </span>
              <ChevronDown size={16} />
            </button>
            {menuOpen && (
              <div className="user-dropdown">
                <button
                  onClick={() => {
                    navigate("/ajuda/primeiros-passos");
                    setMenuOpen(false);
                  }}
                >
                  Ajuda · Primeiros passos
                </button>
                <button
                  onClick={() => {
                    navigate("/selecionar-unidade");
                    setMenuOpen(false);
                  }}
                >
                  Trocar unidade
                </button>
                <button
                  onClick={() => {
                    navigate("/configuracoes");
                    setMenuOpen(false);
                  }}
                >
                  Configurações
                </button>
                <button
                  onClick={async () => {
                    try {
                      if (modo === "api") await api.sair();
                      setUsuario({ nome: "", email: "", perfil: "CONSULTA" });
                      setUnidades([]);
                      setModo("demo");
                      navigate("/login", { replace: true });
                      setMenuOpen(false);
                      setToast("Você saiu da sua conta.");
                    } catch (erro) {
                      setToast(erro);
                    }
                  }}
                >
                  <LogOut size={15} /> Sair
                </button>
              </div>
            )}
          </div>
        </header>
        <main className="main-content">
          <LimiteErro chave={local.pathname}>
            <ControlePermissao>
              <Routes
                key={
                  modo === "api"
                    ? sessionStorage.getItem("ederflexo.unidadeId") || unidade
                    : "demo"
                }
              >
                <Route
                  path="/ajuda/primeiros-passos"
                  element={<PrimeirosPassosPage />}
                />
                <Route
                  path="/administracao-geral"
                  element={<AdministracaoGeralPage />}
                />
                <Route
                  path="/"
                  element={
                    modo === "api" ? (
                      usuario.administradorGeral &&
                      !sessionStorage.getItem("ederflexo.unidadeId") ? (
                        <Navigate to="/administracao-geral" replace />
                      ) : (
                        <DashboardOperacional />
                      )
                    ) : (
                      <DashboardOperacional />
                    )
                  }
                />
                <Route path="/orcamentos" element={<OrcamentosPage />} />
                <Route
                  path="/orcamentos/novo"
                  element={
                    modo === "api" && usuario.perfil === "CONSULTA" ? (
                      <Navigate to="/orcamentos" replace />
                    ) : (
                      <NovoOrcamentoPage />
                    )
                  }
                />
                <Route
                  path="/contratos"
                  element={
                    modo === "api" ? <ContratosConectados /> : <ContratosPage />
                  }
                />
                <Route
                  path="/contratos/novo"
                  element={
                    modo === "api" ? (
                      <NovoContratoConectado />
                    ) : (
                      <NovoContratoPage />
                    )
                  }
                />
                <Route path="/agenda" element={<AgendaOperacional />} />
                <Route path="/clientes" element={<ClientesPage />} />
                <Route
                  path="/servicos"
                  element={
                    modo === "api" ? <ServicosConectados /> : <ServicosPage />
                  }
                />
                <Route path="/pecas" element={<PecasPage />} />
                <Route path="/cadastros" element={<CadastrosHub />} />
                <Route
                  path="/cadastros/modelos-contrato"
                  element={<ModelosContratoPage />}
                />
                <Route
                  path="/cadastros/modelos-contrato/novo"
                  element={<EditorModeloContratoPage />}
                />
                <Route
                  path="/cadastros/modelos-contrato/editar"
                  element={<EditorModeloContratoPage />}
                />
                <Route path="/cadastros/empresas" element={<EmpresasPage />} />
                <Route
                  path="/cadastros/formas-pagamento"
                  element={<FormasPagamentoPage />}
                />
                <Route path="/cadastros/usuarios" element={<UsuariosPage />} />
                <Route
                  path="/despesas"
                  element={<Navigate to="/servicos" replace />}
                />
                <Route
                  path="/relatorios"
                  element={<Navigate to="/servicos" replace />}
                />
                <Route
                  path="/relatorios/servicos"
                  element={<Navigate to="/servicos" replace />}
                />
                <Route
                  path="/configuracoes"
                  element={
                    modo === "api" ? (
                      <ConfiguracoesConectadas />
                    ) : (
                      <ConfiguracoesConectadas />
                    )
                  }
                />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </ControlePermissao>
          </LimiteErro>
        </main>
        {confirmarRestauroDemo && (
          <Modal
            title="Restaurar demonstração?"
            proteger={false}
            onClose={() => setConfirmarRestauroDemo(false)}
            footer={
              <>
                <button
                  className="btn outline"
                  onClick={() => setConfirmarRestauroDemo(false)}
                >
                  Cancelar
                </button>
                <button
                  className="btn primary"
                  onClick={() => {
                    restaurarDemo();
                    setConfirmarRestauroDemo(false);
                    navigate("/");
                  }}
                >
                  Restaurar demo
                </button>
              </>
            }
          >
            <p>
              As alterações feitas na demonstração serão substituídas pelos
              exemplos fictícios iniciais. Sua sessão e os dados do sistema
              conectado serão preservados.
            </p>
          </Modal>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <DadosProvider>
      <SessaoInicial>
        <EdicaoProvider>
          <OnboardingProvider>
            <Routes>
              <Route path="/login" element={<AuthPage tipo="login" />} />
              <Route
                path="/cadastro"
                element={
                  import.meta.env.PROD ? (
                    <Navigate to="/login" replace />
                  ) : (
                    <AuthPage tipo="cadastro" />
                  )
                }
              />
              <Route
                path="/redefinir-senha"
                element={<AuthPage tipo="redefinir" />}
              />
              <Route
                path="/recuperar-senha"
                element={<AuthPage tipo="recuperar" />}
              />
              <Route
                path="/criar-unidade"
                element={<AuthPage tipo="unidade" />}
              />
              <Route
                path="/selecionar-unidade"
                element={<AuthPage tipo="selecionar" />}
              />
              <Route path="/convite" element={<ConvitePage />} />
              <Route path="/*" element={<Layout />} />
            </Routes>
            <Toast />
          </OnboardingProvider>
        </EdicaoProvider>
      </SessaoInicial>
    </DadosProvider>
  );
}
function ControlePermissao({ children }) {
  const { modo, usuario } = useDados(),
    local = useLocation();
  return permiteRota(local.pathname, modo, usuario) ? (
    children
  ) : (
    <Card title="Acesso restrito">
      <p>Seu perfil não permite acessar esta tela.</p>
      <Link className="btn outline" to="/">
        Voltar ao início
      </Link>
    </Card>
  );
}
function ToastItem({ aviso, remover }) {
  useEffect(() => {
    if (aviso.tipo === "erro") return;
    const timer = setTimeout(
      () => remover(aviso.id),
      aviso.tipo === "aviso" ? 8000 : 5000,
    );
    return () => clearTimeout(timer);
  }, [aviso.id, aviso.tipo, remover]);
  return (
    <div
      className={`toast toast-${aviso.tipo}`}
      role={aviso.tipo === "erro" ? "alert" : "status"}
    >
      <div>
        <strong>
          {aviso.tipo === "erro"
            ? "Não foi possível concluir"
            : aviso.tipo === "aviso"
              ? "Atenção"
              : aviso.tipo === "info"
                ? "Informação"
                : "Concluído"}
        </strong>
        <p>{aviso.mensagem}</p>
        {aviso.acao && (
          <button className="btn outline" onClick={aviso.acao.onClick}>
            {aviso.acao.texto}
          </button>
        )}
      </div>
      <button
        type="button"
        aria-label="Fechar aviso"
        onClick={() => remover(aviso.id)}
      >
        <X size={18} />
      </button>
    </div>
  );
}
function Toast() {
  const { avisos, removerAviso } = useDados();
  return (
    <div className="toast-list">
      {avisos.slice(0, 3).map((aviso) => (
        <ToastItem key={aviso.id} aviso={aviso} remover={removerAviso} />
      ))}
    </div>
  );
}

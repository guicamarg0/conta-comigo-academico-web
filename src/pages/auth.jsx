import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Check, LogOut, Building2 } from "lucide-react";
import { api, guardarToken, limparSessao } from "../api.js";
import { useDados } from "../context.jsx";
import { Field } from "../components.jsx";
import { AuthFrame, CampoSenha } from "../components/AuthFrame.jsx";
import { prepararEntrada, usuarioAutenticado } from "../autenticacao.js";

const titulos = {
  login: "Bom ter você por aqui.",
  cadastro: "Vamos começar?",
  recuperar: "Recupere seu acesso",
  redefinir: "Escolha uma nova senha",
  unidade: "Crie sua unidade",
  selecionar: "Onde vamos trabalhar?",
};
const legendas = {
  login: "Entre para cuidar dos próximos passos do seu negócio.",
  cadastro: "Crie sua conta para organizar orçamentos, contratos e serviços.",
  recuperar:
    "Informe seu e-mail. Se houver uma conta, você receberá um link para definir outra senha.",
  redefinir: "Use pelo menos 8 caracteres e confirme a nova senha.",
  unidade: "Dê um nome ao espaço de trabalho da sua empresa.",
  selecionar: "Escolha uma das unidades às quais você tem acesso.",
};

export function AuthPage({ tipo }) {
  const { setUsuario, setUnidade, setToast, unidades, setUnidades, setModo } =
    useDados();
  const navigate = useNavigate(),
    local = useLocation();
  const [email, setEmail] = useState(""),
    [senha, setSenha] = useState("");
  const [nome, setNome] = useState(""),
    [confirmar, setConfirmar] = useState("");
  const [unidadeNome, setUnidadeNome] = useState("");
  const [selecionada, setSelecionada] = useState("");
  const [manterConectado, setManterConectado] = useState(false);
  const [erro, setErro] = useState(""),
    [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false),
    [carregando, setCarregando] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const retorno = new URLSearchParams(local.search).get("retorno");
  function aplicar(me, entrada) {
    setUsuario(usuarioAutenticado(me, entrada.unidade));
    setUnidades(me.unidades || []);
    setModo("api");
    if (entrada.unidade) {
      sessionStorage.setItem("ederflexo.unidadeId", entrada.unidade.id);
      setUnidade(entrada.unidade.nome);
    } else {
      sessionStorage.removeItem("ederflexo.unidadeId");
      setUnidade(me.administradorGeral ? "Administração geral" : "");
    }
  }
  useEffect(() => {
    if (tipo !== "selecionar") return;
    if (!sessionStorage.getItem("ederflexo.token")) {
      navigate("/login", { replace: true });
      return;
    }
    let ativo = true;
    setCarregando(true);
    setErro("");
    api
      .me()
      .then((me) => {
        if (!ativo) return;
        setUnidades(me.unidades || []);
        setSelecionada(me.unidades?.[0]?.id || "");
      })
      .catch((e) => {
        if (ativo) setErro(e.message);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [tipo, tentativa, navigate, setUnidades]);

  async function sair() {
    setEnviando(true);
    try {
      await api.sair();
      setModo("demo");
      setUnidades([]);
      setUnidade("");
      setUsuario({ nome: "", email: "", perfil: "CONSULTA" });
      navigate("/login", { replace: true });
      setToast("Você saiu da sua conta.");
    } catch (e) {
      setErro(e.message);
      setToast(e);
    } finally {
      setEnviando(false);
    }
  }

  async function enviar(evento) {
    evento.preventDefault();
    if (enviando) return;
    setErro("");
    if (["cadastro", "redefinir"].includes(tipo) && senha !== confirmar) {
      setErro("As senhas não coincidem. Confira a confirmação.");
      document.querySelector('input[name="confirmarSenha"]')?.focus();
      return;
    }
    setEnviando(true);
    try {
      if (tipo === "recuperar") {
        const resposta = await api.recuperarSenha(email.trim());
        setMensagem(
          resposta.mensagem ||
            "Se houver uma conta com este e-mail, o link de recuperação será enviado.",
        );
        setToast({
          tipo: "info",
          mensagem:
            "Confira seu e-mail para continuar a recuperação do acesso.",
        });
      } else if (tipo === "redefinir") {
        const token = new URLSearchParams(window.location.hash.slice(1)).get(
          "token",
        );
        if (!token)
          throw new Error(
            "Este link é inválido. Solicite outro link de recuperação.",
          );
        await api.redefinirSenha(token, senha);
        limparSessao();
        setModo("demo");
        setToast("Senha atualizada. Entre com sua nova senha.");
        navigate("/login", { replace: true });
      } else if (tipo === "cadastro") {
        await api.cadastro({ nome: nome.trim(), email: email.trim(), senha });
        const token = await api.login({
          email: email.trim(),
          senha,
          manterConectado: false,
        });
        guardarToken(token.tokenAcesso);
        setUsuario({ nome, email, perfil: "ADMIN" });
        setModo("api");
        setToast("Conta criada. Agora configure sua unidade.");
        navigate("/criar-unidade", { replace: true });
      } else if (tipo === "login") {
        const token = await api.login({
          email: email.trim(),
          senha,
          manterConectado,
        });
        guardarToken(token.tokenAcesso);
        sessionStorage.removeItem("ederflexo.unidadeId");
        const me = await api.me();
        // Aplicar primeiro o usuário permite tentar a seleção de novo se a API falhar.
        aplicar(me, { unidade: null });
        const entrada = await prepararEntrada(me, api.selecionarUnidade, {
          retorno,
        });
        aplicar(me, entrada);
        setSenha("");
        setToast(`Bem-vindo${me.nome ? `, ${me.nome.split(" ")[0]}` : ""}.`);
        navigate(entrada.destino, { replace: true });
      } else if (tipo === "unidade") {
        const criada = await api.criarUnidade(unidadeNome.trim());
        sessionStorage.setItem("ederflexo.unidadeId", criada.id);
        setUnidade(criada.nome);
        setUsuario((v) => ({ ...v, perfil: "ADMIN" }));
        setUnidades((lista) => [...lista, criada]);
        setToast("Unidade criada. Vamos organizar os primeiros passos.");
        navigate("/", { replace: true });
      } else if (tipo === "selecionar") {
        const escolhida = unidades.find((u) => u.id === selecionada);
        if (!escolhida) throw new Error("Selecione uma unidade disponível.");
        const unidade = await api.selecionarUnidade(escolhida.id);
        sessionStorage.setItem("ederflexo.unidadeId", unidade.id);
        setUnidade(unidade.nome);
        setUsuario((v) => ({ ...v, perfil: unidade.perfil }));
        setModo("api");
        setToast(`Você está na unidade ${unidade.nome}.`);
        navigate("/", { replace: true });
      }
    } catch (e) {
      setErro(e.message || "Não foi possível concluir. Tente novamente.");
      setToast(e);
    } finally {
      setEnviando(false);
    }
  }
  const semUnidades =
    tipo === "selecionar" && !carregando && !erro && !unidades.length;
  return (
    <AuthFrame>
      <form
        className="auth-card auth-access-card"
        onSubmit={enviar}
        aria-busy={enviando || carregando}
      >
        <span className="auth-form-kicker">
          {tipo === "login" ? "Seu espaço de trabalho" : "Seu acesso"}
        </span>
        <h1>{semUnidades ? "Seu acesso está pronto." : titulos[tipo]}</h1>
        <p className="auth-intro">
          {semUnidades
            ? "Sua conta ainda não está vinculada a uma unidade. Peça ao gestor um convite de acesso e abra o link recebido."
            : legendas[tipo]}
        </p>
        {tipo === "cadastro" && (
          <Field label="Nome completo">
            <input
              required
              autoComplete="name"
              maxLength={120}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Como podemos chamar você?"
            />
          </Field>
        )}
        {["login", "cadastro", "recuperar"].includes(tipo) && (
          <Field label="E-mail">
            <input
              required
              name="email"
              type="email"
              autoComplete="username"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
            />
          </Field>
        )}
        {["login", "cadastro", "redefinir"].includes(tipo) && (
          <CampoSenha
            name="senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            nova={tipo !== "login"}
          />
        )}
        {["cadastro", "redefinir"].includes(tipo) && (
          <CampoSenha
            label="Confirmar senha"
            name="confirmarSenha"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            nova
            error={
              confirmar && confirmar !== senha ? "As senhas não coincidem." : ""
            }
          />
        )}
        {tipo === "login" && (
          <div className="auth-login-options">
            <label className="auth-remember">
              <input
                type="checkbox"
                checked={manterConectado}
                onChange={(e) => setManterConectado(e.target.checked)}
              />
              <span>Manter conectado</span>
            </label>
            <Link to="/recuperar-senha">Esqueci minha senha</Link>
          </div>
        )}
        {tipo === "unidade" && (
          <Field label="Nome da unidade">
            <input
              required
              name="nome"
              maxLength={150}
              value={unidadeNome}
              onChange={(e) => setUnidadeNome(e.target.value)}
              placeholder="Nome da sua empresa"
            />
          </Field>
        )}
        {tipo === "selecionar" &&
          (carregando ? (
            <p role="status">Carregando suas unidades...</p>
          ) : (
            <div
              className="auth-units"
              role="radiogroup"
              aria-label="Unidades disponíveis"
            >
              {unidades.map((u) => (
                <label
                  key={u.id}
                  className={`auth-unit ${selecionada === u.id ? "selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="unidade"
                    value={u.id}
                    checked={selecionada === u.id}
                    onChange={() => setSelecionada(u.id)}
                  />
                  <Building2 size={23} aria-hidden="true" />
                  <span>
                    <strong>{u.nome}</strong>
                    <small>
                      {{
                        ADMIN: "Administrador",
                        GESTOR: "Gestor",
                        OPERADOR: "Usuário",
                        CONSULTA: "Consulta",
                      }[u.perfil] || u.perfil}
                    </small>
                  </span>
                  {selecionada === u.id && (
                    <Check size={20} aria-hidden="true" />
                  )}
                </label>
              ))}
            </div>
          ))}
        {mensagem && (
          <p className="auth-message" role="status">
            {mensagem}
          </p>
        )}
        {erro && (
          <p className="inline-error auth-error" role="alert">
            {erro}
          </p>
        )}
        {erro &&
          tipo === "login" &&
          sessionStorage.getItem("ederflexo.token") && (
            <Link className="auth-text-button" to="/selecionar-unidade">
              Tentar acessar uma unidade
            </Link>
          )}
        {tipo === "selecionar" && erro && (
          <button
            type="button"
            className="btn outline full"
            disabled={enviando || carregando}
            onClick={() => setTentativa((n) => n + 1)}
          >
            Tentar novamente
          </button>
        )}
        {!semUnidades && (
          <button
            className="btn primary full auth-submit"
            type="submit"
            disabled={
              enviando || carregando || (tipo === "selecionar" && !selecionada)
            }
          >
            {enviando
              ? "Aguarde..."
              : {
                  login: "Entrar",
                  cadastro: "Criar conta",
                  recuperar: "Enviar link de recuperação",
                  redefinir: "Salvar nova senha",
                  unidade: "Criar unidade",
                  selecionar: "Acessar unidade",
                }[tipo]}
          </button>
        )}
        <div className="auth-links">
          {tipo === "login" && !import.meta.env.PROD && (
            <Link to="/cadastro">Criar conta</Link>
          )}
          {tipo === "cadastro" && (
            <Link to="/login">Já tenho conta · Entrar</Link>
          )}
          {["recuperar", "redefinir"].includes(tipo) && (
            <Link to="/login">Voltar para o login</Link>
          )}
          {tipo === "selecionar" && (
            <button
              className="auth-text-button"
              type="button"
              disabled={enviando}
              onClick={sair}
            >
              <LogOut size={16} /> Sair da conta
            </button>
          )}
        </div>
        {tipo === "login" && !import.meta.env.PROD && (
          <Link
            className="demo-link"
            to="/"
            onClick={() => {
              limparSessao();
              setModo("demo");
            }}
          >
            Explorar demonstração
          </Link>
        )}
      </form>
    </AuthFrame>
  );
}

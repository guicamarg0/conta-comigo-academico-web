import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, guardarToken } from "../api.js";
import { useDados } from "../context.jsx";
import { Field } from "../components.jsx";
import { AvisoErro } from "../components/Feedback.jsx";
import { AuthFrame, CampoSenha } from "../components/AuthFrame.jsx";
import { prepararEntrada, usuarioAutenticado } from "../autenticacao.js";
const perfis = {
  ADMIN: "Administrador",
  GESTOR: "Gestor",
  OPERADOR: "Usuário",
  CONSULTA: "Consulta",
};
export function ConvitePage() {
  const [params] = useSearchParams(),
    codigo = params.get("codigo") || "",
    navigate = useNavigate();
  const { setModo, setUsuario, setUnidades, setUnidade, setToast } = useDados();
  const [info, setInfo] = useState(null),
    [erro, setErro] = useState(""),
    [carregando, setCarregando] = useState(true),
    [versao, setVersao] = useState(0),
    [criando, setCriando] = useState(false),
    [salvando, setSalvando] = useState(false),
    [contaCriada, setContaCriada] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    email: "",
    senha: "",
    confirmar: "",
  });
  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro("");
    setInfo(null);
    if (!codigo) {
      setErro(
        "O link não contém um código de convite. Peça um novo link ao gestor.",
      );
      setCarregando(false);
      return;
    }
    api
      .consultarConvite(codigo)
      .then((d) => {
        if (ativo) setInfo(d);
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
  }, [codigo, versao]);
  async function concluir() {
    const me = await api.me();
    const entrada = await prepararEntrada(me, api.selecionarUnidade);
    setUnidades(me.unidades || []);
    setUsuario(usuarioAutenticado(me, entrada.unidade));
    setModo("api");
    setToast("Convite aceito. Seu acesso à unidade foi liberado.");
    if (entrada.unidade)
      sessionStorage.setItem("ederflexo.unidadeId", entrada.unidade.id);
    setUnidade(
      entrada.unidade?.nome ||
        (me.administradorGeral ? "Administração geral" : ""),
    );
    navigate(entrada.destino, { replace: true });
  }
  async function enviar(e) {
    e.preventDefault();
    if (salvando) return;
    setErro("");
    if (criando && form.senha !== form.confirmar) {
      setErro("As senhas não coincidem.");
      return;
    }
    setSalvando(true);
    try {
      if (criando) {
        await api.cadastrarConvite({
          codigo,
          nome: form.nome.trim(),
          email: form.email.trim(),
          senha: form.senha,
        });
        setContaCriada(true);
        const token = await api.login({
          email: form.email.trim(),
          senha: form.senha,
          manterConectado: false,
        });
        guardarToken(token.tokenAcesso);
      } else {
        await api.aceitarConvite(codigo);
        setContaCriada(true);
      }
      sessionStorage.removeItem("ederflexo.unidadeId");
      await concluir();
    } catch (e) {
      setErro(e.message);
      setToast(e);
    } finally {
      setSalvando(false);
    }
  }
  const logado = Boolean(sessionStorage.getItem("ederflexo.token"));
  const retorno = `/convite?codigo=${encodeURIComponent(codigo)}`;
  return (
    <AuthFrame>
      <form
        className="auth-card auth-access-card"
        onSubmit={enviar}
        aria-busy={salvando}
      >
        <span className="auth-form-kicker">Vamos trabalhar juntos</span>
        <h1>Convite de acesso</h1>
        {carregando ? (
          <p role="status">Validando convite...</p>
        ) : (
          <>
            {contaCriada && erro ? (
              <p>
                O convite foi aceito e seu acesso à unidade foi liberado.{" "}
                <Link to={logado ? "/selecionar-unidade" : "/login"}>
                  {logado
                    ? "Selecionar unidade para continuar."
                    : "Entre com seu e-mail e senha para continuar."}
                </Link>
              </p>
            ) : (
              info && (
                <>
                  <h2>{info.unidade}</h2>
                  <p>
                    Perfil:{" "}
                    <strong>{perfis[info.perfil] || info.perfil}</strong>
                  </p>
                  <p>
                    Válido até{" "}
                    {new Date(info.expiraEm).toLocaleDateString("pt-BR")}.
                  </p>
                  {!logado && !criando && (
                    <div className="auth-links">
                      <Link
                        className="btn primary full"
                        to={`/login?retorno=${encodeURIComponent(retorno)}`}
                      >
                        Já tenho conta · Entrar
                      </Link>
                      <button
                        type="button"
                        className="btn outline full"
                        onClick={() => setCriando(true)}
                      >
                        Criar conta pelo convite
                      </button>
                    </div>
                  )}
                  {criando && (
                    <>
                      {["nome", "email"].map((campo) => (
                        <Field
                          key={campo}
                          label={
                            {
                              nome: "Nome completo *",
                              email: "E-mail *",
                              senha: "Senha *",
                              confirmar: "Confirmar senha *",
                            }[campo]
                          }
                          error={
                            campo === "confirmar" &&
                            form.confirmar &&
                            form.confirmar !== form.senha
                              ? "As senhas não coincidem."
                              : ""
                          }
                        >
                          <input
                            required
                            autoComplete={
                              {
                                nome: "name",
                                email: "email",
                                senha: "new-password",
                                confirmar: "new-password",
                              }[campo]
                            }
                            type={
                              campo === "email"
                                ? "email"
                                : ["senha", "confirmar"].includes(campo)
                                  ? "password"
                                  : "text"
                            }
                            minLength={
                              ["senha", "confirmar"].includes(campo)
                                ? 8
                                : undefined
                            }
                            maxLength={
                              campo === "nome"
                                ? 120
                                : campo === "email"
                                  ? 254
                                  : 72
                            }
                            value={form[campo]}
                            onChange={(e) =>
                              setForm({ ...form, [campo]: e.target.value })
                            }
                          />
                        </Field>
                      ))}
                      <CampoSenha
                        nova
                        name="senha"
                        value={form.senha}
                        onChange={(e) =>
                          setForm({ ...form, senha: e.target.value })
                        }
                      />
                      <CampoSenha
                        nova
                        name="confirmarSenha"
                        label="Confirmar senha"
                        value={form.confirmar}
                        error={
                          form.confirmar && form.confirmar !== form.senha
                            ? "As senhas não coincidem."
                            : ""
                        }
                        onChange={(e) =>
                          setForm({ ...form, confirmar: e.target.value })
                        }
                      />
                    </>
                  )}
                  {(logado || criando) && (
                    <button
                      type="submit"
                      className="btn primary full"
                      disabled={salvando}
                    >
                      {salvando
                        ? "Concluindo..."
                        : criando
                          ? "Criar conta e aceitar convite"
                          : "Aceitar convite"}
                    </button>
                  )}
                </>
              )
            )}
            <AvisoErro
              erro={erro}
              onRetry={codigo ? () => setVersao((v) => v + 1) : undefined}
            />
            {criando && (
              <button
                type="button"
                className="btn outline full"
                disabled={salvando}
                onClick={() => setCriando(false)}
              >
                Já tenho conta
              </button>
            )}
            {logado && erro && (
              <Link to="/selecionar-unidade">Ver minhas unidades</Link>
            )}
            <Link to="/login">Voltar para o login</Link>
          </>
        )}
      </form>
    </AuthFrame>
  );
}

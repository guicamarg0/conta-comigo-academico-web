import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api, limparSessao } from "../api.js";
import { prepararEntrada, usuarioAutenticado } from "../autenticacao.js";
import { useDados } from "../context.jsx";
import { AuthFrame } from "./AuthFrame.jsx";
import { ouvirSaidaOutraAba } from "../sessaoNavegador.js";

export function SessaoInicial({ children }) {
  const { setUsuario, setUnidades, setUnidade, setModo, setToast } = useDados();
  const [pronto, setPronto] = useState(false),
    [erro, setErro] = useState("");
  const [tentativa, setTentativa] = useState(0);
  const preparacao = useRef(null);
  const navigate = useNavigate(),
    local = useLocation();
  useEffect(() => {
    const encerrar = (outraAba = false) => {
      limparSessao();
      setUsuario({ nome: "", email: "", perfil: "CONSULTA" });
      setUnidades([]);
      setUnidade("");
      setModo("demo");
      setPronto(true);
      setToast({
        tipo: outraAba ? "info" : "aviso",
        mensagem: outraAba
          ? "Você saiu da conta em outra aba."
          : "Sua sessão expirou. Entre novamente para continuar.",
      });
      navigate("/login", { replace: true });
    };
    const expirou = () => encerrar();
    window.addEventListener("ederflexo:autenticacao-expirada", expirou);
    const parar = ouvirSaidaOutraAba(() => encerrar(true));
    return () => {
      window.removeEventListener("ederflexo:autenticacao-expirada", expirou);
      parar();
    };
  }, [navigate, setModo, setToast, setUnidade, setUnidades, setUsuario]);
  useEffect(() => {
    let ativo = true;
    setErro("");
    const caminho = local.pathname;
    const unidadeAnterior = sessionStorage.getItem("ederflexo.unidadeId");
    async function restaurar() {
      try {
        // O modo estrito do React reaplica efeitos; a seleção também é compartilhada.
        if (!preparacao.current)
          preparacao.current = (async () => {
            const me = await api.restaurarSessao();
            const entrada = await prepararEntrada(me, api.selecionarUnidade, {
              retorno: new URLSearchParams(local.search).get("retorno"),
              unidadeAnterior,
            });
            return { me, entrada };
          })();
        const { me, entrada } = await preparacao.current;
        if (!ativo) return;
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
        const preservar = [
          "/convite",
          "/recuperar-senha",
          "/redefinir-senha",
          "/cadastro",
        ].includes(caminho);
        if (!preservar && (caminho === "/login" || !entrada.unidade))
          navigate(entrada.destino, { replace: true });
        setPronto(true);
      } catch (e) {
        if (!ativo) return;
        if ([401, 403, 404].includes(e.status)) {
          limparSessao();
          setModo("demo");
          setPronto(true);
        } else {
          setErro(e.message || "Não foi possível verificar sua sessão.");
        }
      }
    }
    restaurar();
    return () => {
      ativo = false;
    };
    // Apenas a inicialização restaura sessão. As mudanças de rota não renovam cookies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tentativa]);
  if (pronto) return children;
  return (
    <AuthFrame>
      <div className="auth-card auth-access-card" aria-busy={!erro}>
        <span className="auth-form-kicker">Seu acesso</span>
        <h1>{erro ? "Vamos tentar novamente?" : "Preparando seu espaço..."}</h1>
        <p
          className={erro ? "inline-error auth-error" : "auth-intro"}
          role={erro ? "alert" : "status"}
        >
          {erro || "Estamos verificando seu acesso e suas unidades."}
        </p>
        {erro && (
          <>
            <button
              className="btn primary full"
              onClick={() => {
                preparacao.current = null;
                setTentativa((n) => n + 1);
              }}
            >
              Tentar novamente
            </button>
            <button
              className="auth-text-button"
              onClick={() => {
                limparSessao();
                setModo("demo");
                setPronto(true);
                navigate("/login", { replace: true });
              }}
            >
              Ir para o login
            </button>
          </>
        )}
      </div>
    </AuthFrame>
  );
}

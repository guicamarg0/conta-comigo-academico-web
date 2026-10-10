import React, { useId, useState } from "react";
import { Eye, EyeOff, ArrowUpRight } from "lucide-react";
import Marca from "./Marca.jsx";
import { Field } from "../components.jsx";

export function AuthFrame({ children }) {
  return (
    <main className="auth-shell">
      <aside className="auth-story" aria-label="Conta Comigo">
        <div className="auth-brand">
          <Marca variante="compacta" />
        </div>
        <div className="auth-story-copy">
          <span className="auth-eyebrow">
            Uma ajuda para cuidar do seu negócio.
          </span>
          <h2>
            Mais clareza para
            <br />
            seguir em frente.
          </h2>
          <p>
            Prepare seus orçamentos, organize contratos e acompanhe os serviços.
            Cada passo no seu lugar.
          </p>
          <div className="auth-story-steps" aria-hidden="true">
            <span>Orçar</span>
            <ArrowUpRight size={18} />
            <span>Combinar</span>
            <ArrowUpRight size={18} />
            <span>Organizar</span>
          </div>
        </div>
        <img
          className="auth-watermark"
          src="/marca/conta-comigo-v3/simbolo-monocromatica-branca.svg"
          alt=""
          aria-hidden="true"
        />
        <p className="auth-story-footer">Seu trabalho, bem acompanhado.</p>
      </aside>
      <section className="auth-form-area" aria-label="Acesso à plataforma">
        {children}
        <p className="auth-form-footer">
          Conta Comigo · Orçamentos, contratos e serviços
        </p>
      </section>
    </main>
  );
}

export function CampoSenha({
  label = "Senha",
  value,
  onChange,
  nova = false,
  error,
  ...props
}) {
  const id = useId();
  const [visivel, setVisivel] = useState(false);
  return (
    <div className="auth-password">
      <Field label={label} error={error}>
        <input
          {...props}
          id={id}
          type={visivel ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete={nova ? "new-password" : "current-password"}
          placeholder={nova ? "Pelo menos 8 caracteres" : "Digite sua senha"}
          required
          minLength={nova ? 8 : undefined}
          maxLength={72}
        />
      </Field>
      <button
        type="button"
        className="auth-password-toggle"
        aria-label={`${visivel ? "Ocultar" : "Mostrar"} ${label.toLowerCase()}`}
        aria-pressed={visivel}
        aria-controls={id}
        onClick={() => setVisivel((atual) => !atual)}
      >
        {visivel ? <EyeOff size={20} /> : <Eye size={20} />}
      </button>
    </div>
  );
}

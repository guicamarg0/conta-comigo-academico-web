import React, { useEffect, useRef, useState } from "react";
import { Search, LoaderCircle } from "lucide-react";
import { Field } from "../components.jsx";
import {
  aplicarEnderecoCep,
  consultarCep,
  digitosCep,
  formatarCep,
} from "../cep.js";

export function CampoCep({ form, setForm }) {
  const [status, setStatus] = useState(""),
    [erro, setErro] = useState(""),
    [tentativa, setTentativa] = useState(0);
  const editado = useRef(false),
    atual = useRef(form),
    controle = useRef(null);
  atual.current = form;
  const cep = digitosCep(form.cep);
  useEffect(() => {
    if (!editado.current || cep.length !== 8) return;
    let ativo = true;
    const abortar = new AbortController();
    controle.current = abortar;
    const original = { ...atual.current };
    const timer = setTimeout(async () => {
      setStatus("Consultando CEP...");
      setErro("");
      try {
        const endereco = await consultarCep(cep, { signal: abortar.signal });
        if (!ativo) return;
        setForm((v) => aplicarEnderecoCep(v, original, endereco, cep));
        setStatus(
          endereco.logradouro
            ? "Endereço localizado. Confira os dados e informe número e complemento."
            : "Cidade e estado localizados. Complete rua, bairro e número manualmente.",
        );
      } catch (e) {
        if (ativo && e.name !== "AbortError") {
          setErro(e.message);
          setStatus("");
        }
      }
    }, 400);
    return () => {
      ativo = false;
      clearTimeout(timer);
      abortar.abort();
    };
  }, [cep, tentativa, setForm]);
  return (
    <div>
      <div className="campo-cep-controles">
        <Field label="CEP">
          <input
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={9}
            value={formatarCep(form.cep)}
            placeholder="00000-000"
            onChange={(e) => {
              editado.current = true;
              if (digitosCep(e.target.value) !== cep) controle.current?.abort();
              setErro("");
              setStatus("");
              setForm((v) => ({ ...v, cep: formatarCep(e.target.value) }));
            }}
            onBlur={() => {
              if (cep && cep.length !== 8)
                setErro("Informe um CEP com 8 dígitos.");
            }}
          />
        </Field>
        <button
          type="button"
          className="btn outline campo-cep-buscar"
          aria-label="Buscar endereço pelo CEP"
          title={
            cep.length === 8
              ? "Buscar endereço pelo CEP"
              : "Digite um CEP com 8 números"
          }
          disabled={cep.length !== 8 || status === "Consultando CEP..."}
          onClick={() => {
            editado.current = true;
            setTentativa((v) => v + 1);
          }}
        >
          {status === "Consultando CEP..." ? (
            <LoaderCircle
              size={18}
              className="campo-cep-carregando"
              aria-hidden="true"
            />
          ) : (
            <Search size={18} aria-hidden="true" />
          )}
        </button>
      </div>
      {status && (
        <p
          className="muted"
          role="status"
          aria-live="polite"
          style={{ margin: "6px 0", fontSize: 12 }}
        >
          {status}
        </p>
      )}
      {erro && (
        <div role="status" aria-live="polite">
          <p className="muted" style={{ margin: "6px 0", fontSize: 12 }}>
            {erro}
          </p>
        </div>
      )}
    </div>
  );
}

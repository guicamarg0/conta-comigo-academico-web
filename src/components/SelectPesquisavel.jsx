import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

const texto = (node) =>
  typeof node === "string" || typeof node === "number"
    ? String(node)
    : React.Children.toArray(node)
        .map((n) =>
          React.isValidElement(n) ? texto(n.props.children) : texto(n),
        )
        .join("");
function opcoes(children) {
  return React.Children.toArray(children).flatMap((child) =>
    React.isValidElement(child)
      ? child.type === "option"
        ? [
            {
              value: String(child.props.value ?? texto(child.props.children)),
              label: texto(child.props.children),
              disabled: child.props.disabled,
            },
          ]
        : opcoes(child.props.children)
      : [],
  );
}
const normalizar = (s) =>
  s.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR");
export function SelectPesquisavel({
  children,
  value,
  defaultValue,
  onChange,
  onTextChange,
  textValue,
  disabled,
  required,
  id,
  name,
  className = "",
  ...props
}) {
  const gerado = useId(),
    listaId = gerado + "-opcoes",
    input = useRef(null),
    menu = useRef(null);
  const [aberto, setAberto] = useState(false),
    [busca, setBusca] = useState(""),
    [interno, setInterno] = useState(defaultValue),
    [ativo, setAtivo] = useState(0),
    [pos, setPos] = useState(null);
  const itens = opcoes(children),
    valor = String(
      value ?? interno ?? itens.find((o) => !o.disabled)?.value ?? "",
    );
  const selecionado = itens.find((o) => o.value === valor);
  const filtrados = itens.filter((o) =>
    normalizar(o.label).includes(normalizar(busca)),
  );
  const rotulo = props["aria-label"] || "Selecionar opção";
  useEffect(() => {
    if (!aberto) return;
    const reposicionar = () => {
      const r = input.current.getBoundingClientRect();
      setPos({
        left: r.left,
        top: r.bottom + 4,
        width: r.width,
        maxHeight: Math.max(
          40,
          Math.min(
            224,
            (window.visualViewport?.height ?? window.innerHeight) +
              (window.visualViewport?.offsetTop ?? 0) -
              r.bottom -
              12,
          ),
        ),
      });
    };
    reposicionar();
    const fora = (e) => {
      if (
        !input.current.contains(e.target) &&
        !menu.current?.contains(e.target)
      )
        setAberto(false);
    };
    window.addEventListener("resize", reposicionar);
    window.visualViewport?.addEventListener("resize", reposicionar);
    window.visualViewport?.addEventListener("scroll", reposicionar);
    window.addEventListener("scroll", reposicionar, true);
    document.addEventListener("pointerdown", fora);
    return () => {
      window.removeEventListener("resize", reposicionar);
      window.visualViewport?.removeEventListener("resize", reposicionar);
      window.visualViewport?.removeEventListener("scroll", reposicionar);
      window.removeEventListener("scroll", reposicionar, true);
      document.removeEventListener("pointerdown", fora);
    };
  }, [aberto]);
  useEffect(() => setAtivo(0), [busca]);
  useEffect(() => {
    input.current?.setCustomValidity(
      required && !valor && !(onTextChange && textValue?.trim())
        ? "Selecione uma opção."
        : "",
    );
  }, [required, valor, onTextChange, textValue]);
  useEffect(() => {
    menu.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [ativo]);
  function escolher(o) {
    if (!o || o.disabled) return;
    setInterno(o.value);
    onChange?.({
      target: { value: o.value, name },
      currentTarget: { value: o.value, name },
    });
    setAberto(false);
    setBusca("");
    input.current.focus();
  }
  return (
    <div className={`select-pesquisavel ${className}`}>
      <input
        ref={input}
        id={id}
        name={name}
        role="combobox"
        aria-label={props["aria-label"]}
        aria-invalid={props["aria-invalid"]}
        aria-describedby={props["aria-describedby"]}
        onInvalid={props.onInvalid}
        aria-expanded={aberto}
        aria-controls={listaId}
        aria-autocomplete="list"
        aria-activedescendant={
          aberto && filtrados[ativo] ? `${listaId}-${ativo}` : undefined
        }
        required={required}
        disabled={disabled}
        placeholder={
          props.placeholder || selecionado?.label || "Selecione ou pesquise"
        }
        value={
          aberto
            ? busca
            : (textValue ??
              (required && !valor ? "" : selecionado?.label) ??
              "")
        }
        onClick={() => {
          if (!aberto) {
            setBusca("");
            setAberto(true);
          }
        }}
        onChange={(e) => {
          setBusca(e.target.value);
          setAberto(true);
          onTextChange?.(e.target.value);
        }}
        onBlur={(e) => {
          if (!menu.current?.contains(e.relatedTarget)) setAberto(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            if (!aberto) {
              setBusca("");
              setAberto(true);
            } else
              setAtivo((n) =>
                Math.max(
                  0,
                  Math.min(
                    filtrados.length - 1,
                    n + (e.key === "ArrowDown" ? 1 : -1),
                  ),
                ),
              );
          } else if (e.key === "Enter" && aberto) {
            e.preventDefault();
            escolher(filtrados[ativo]);
          } else if (e.key === "Escape") {
            e.preventDefault();
            setAberto(false);
          } else if (e.key === "Tab") setAberto(false);
        }}
      />
      <span className="select-chevron" aria-hidden="true">
        ⌄
      </span>
      {aberto &&
        pos &&
        createPortal(
          <div
            ref={menu}
            className="select-options"
            role="listbox"
            id={listaId}
            aria-label={rotulo}
            style={pos}
          >
            {filtrados.map((o, n) => (
              <button
                key={o.value + "-" + n}
                type="button"
                role="option"
                id={`${listaId}-${n}`}
                aria-selected={ativo === n}
                disabled={o.disabled}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => escolher(o)}
                onMouseEnter={() => setAtivo(n)}
              >
                {o.label || "Limpar seleção"}
              </button>
            ))}
            {!filtrados.length && (
              <div className="select-empty">
                {onTextChange
                  ? "Descrição manual — clique fora para manter."
                  : "Nenhuma opção encontrada."}
              </div>
            )}
          </div>,
          input.current?.closest("dialog") || document.body,
        )}
    </div>
  );
}

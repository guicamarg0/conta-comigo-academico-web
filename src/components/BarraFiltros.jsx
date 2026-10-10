import React, { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { TextFilter } from "../components";
import { CampoData } from "./CampoData";
import { SelectPesquisavel } from "./SelectPesquisavel";

export function BarraFiltros({
  children,
  className = "",
  onLimpar,
  padroes = {},
}) {
  const [aberto, setAberto] = useState(false);
  const nodes = React.Children.toArray(children);
  const temBusca = (node) =>
    React.isValidElement(node) &&
    (node.type === TextFilter ||
      node.props.type === "search" ||
      React.Children.toArray(node.props.children).some(temBusca));
  const busca = nodes.filter(temBusca);
  const demais = nodes.filter((node) => !busca.includes(node));
  const controles = [];
  function visitar(nodes, rotulo) {
    React.Children.forEach(nodes, (node) => {
      if (!React.isValidElement(node)) return;
      if (
        node.props.value !== undefined &&
        typeof node.props.onChange === "function"
      )
        controles.push(
          React.cloneElement(node, { filtroLabel: node.props.label ?? rotulo }),
        );
      else if (node.props.children)
        visitar(node.props.children, node.props.label ?? rotulo);
    });
  }
  visitar(children);
  const ativos = controles.filter(
    (c) =>
      c.props.value !==
        (c.props.valorPadrao ?? padroes[c.props.filtroLabel] ?? "") &&
      c.props.value != null,
  ).length;
  function limpar() {
    if (onLimpar) {
      onLimpar();
      return;
    }
    controles.forEach((c) => {
      const evento =
        typeof c.type === "string" ||
        c.type === CampoData ||
        c.type === SelectPesquisavel;
      const valor = c.props.valorPadrao ?? padroes[c.props.filtroLabel] ?? "";
      c.props.onChange(evento ? { target: { value: valor } } : valor);
    });
  }
  return (
    <div
      className={`filter-row barra-filtros ${className}`}
      role="search"
      aria-label="Filtros da listagem"
    >
      {busca}
      {demais.length > 0 && (
        <button
          type="button"
          className="btn outline mobile-filter-toggle"
          aria-expanded={aberto}
          onClick={() => setAberto((v) => !v)}
        >
          <SlidersHorizontal size={17} /> Filtros{ativos ? ` (${ativos})` : ""}
        </button>
      )}
      <div className={`filter-controls ${aberto ? "open" : ""}`}>{demais}</div>
      {controles.length > 0 && (
        <button
          type="button"
          className="btn outline limpar-filtros"
          disabled={!ativos}
          onClick={limpar}
        >
          Limpar filtros{ativos ? ` (${ativos})` : ""}
        </button>
      )}
    </div>
  );
}

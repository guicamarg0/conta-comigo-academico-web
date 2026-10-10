import React from "react";
import { AvisoErro } from "./Feedback.jsx";
export function RecursosFeedback({ recursos, recarregar, rotulos = {} }) {
  return (
    <>
      {Object.entries(recursos).map(([nome, estado]) => {
        const rotulo = rotulos[nome] || nome;
        if (estado.erro)
          return (
            <AvisoErro
              key={nome}
              erro={`${rotulo}: ${estado.erro}`}
              anterior={estado.dados !== null}
              onRetry={() => recarregar(nome)}
            />
          );
        if (estado.carregando)
          return (
            <p key={nome} role="status">
              Carregando {rotulo}...
            </p>
          );
        const lista = Array.isArray(estado.dados)
          ? estado.dados
          : estado.dados?.conteudo;
        return [
          "clientes",
          "catalogo",
          "pagamentos",
          "empresas",
          "modelos",
          "orcamentos",
        ].includes(nome) && lista?.length === 0 ? (
          <p key={nome} className="notice info">
            Não há {rotulo} disponíveis nesta unidade. Cadastre ou ative os
            registros necessários antes de selecionar.
          </p>
        ) : null;
      })}
    </>
  );
}

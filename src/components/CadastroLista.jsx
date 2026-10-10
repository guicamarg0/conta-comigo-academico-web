import { BarraFiltros } from "./BarraFiltros";
import { AvisoErro } from "./Feedback.jsx";
import React, { useEffect } from "react";
import { Plus } from "lucide-react";
import {
  Badge,
  Card,
  DataTable,
  DetailPanel,
  DetailRows,
  PageHeading,
  Stat,
  TextFilter,
} from "../components.jsx";

export function CadastroLista({
  titulo,
  descricao,
  novoTexto,
  onNovo,
  acaoExtra,
  indicadores,
  rows,
  columns,
  busca,
  setBusca,
  placeholder,
  filtros,
  selecionado,
  setSelecionado,
  icone: Icone,
  nome,
  status,
  detalhes,
  rodape,
  erro,
  carregando,
  detalheExtra,
  onRetry,
}) {
  const temFiltro = (nodes) =>
    React.Children.toArray(nodes).some(
      (n) =>
        React.isValidElement(n) &&
        ((n.props.value !== undefined &&
          n.props.value !== null &&
          n.props.value !== (n.props.valorPadrao ?? "")) ||
          temFiltro(n.props.children)),
    );
  const filtrado = Boolean(busca || temFiltro(filtros));
  useEffect(() => {
    if (selecionado && !rows.some((r) => r.id === selecionado.id))
      setSelecionado(null);
  }, [rows, selecionado, setSelecionado]);
  return (
    <>
      <PageHeading
        title={titulo}
        subtitle={descricao}
        action={
          <>
            {acaoExtra}
            {onNovo && (
              <button className="btn primary" onClick={onNovo}>
                <Plus size={18} />
                {novoTexto}
              </button>
            )}
          </>
        }
      />
      <div className="list-detail">
        <Card
          title={`Lista de ${titulo.toLowerCase()}`}
          className="list-card"
          action={<small>{rows.length} registros</small>}
        >
          <BarraFiltros className="">
            <TextFilter
              value={busca}
              onChange={setBusca}
              placeholder={placeholder}
            />
            {filtros}
          </BarraFiltros>
          <AvisoErro erro={erro} onRetry={onRetry} />
          {carregando ? (
            <p className="muted">Carregando registros...</p>
          ) : erro && !rows.length ? null : (
            <DataTable
              rows={rows}
              filterable={false}
              columns={columns}
              selected={selecionado}
              onSelect={setSelecionado}
              pageSize={10}
              emptyDescription={
                filtrado
                  ? "Nenhum resultado para estes filtros. Limpe os filtros para consultar novamente."
                  : "Ainda não há registros nesta listagem."
              }
              emptyAction={
                filtrado ? (
                  busca ? (
                    <button
                      className="btn outline"
                      onClick={() => setBusca("")}
                    >
                      Limpar busca
                    </button>
                  ) : undefined
                ) : onNovo ? (
                  <button className="btn primary" onClick={onNovo}>
                    {novoTexto}
                  </button>
                ) : undefined
              }
            />
          )}
        </Card>
        {selecionado && (
          <DetailPanel
            title={`Detalhes ${titulo === "Empresas" ? "da empresa" : titulo === "Usuários" ? "do usuário" : titulo === "Modelos de contrato" ? "do modelo" : "da forma de pagamento"}`}
            onClose={() => setSelecionado(null)}
            footer={rodape}
          >
            <div className="entity-title">
              <span className="entity-icon">
                <Icone />
              </span>
              <div>
                <h3>{nome}</h3>
              </div>
              {status && <Badge>{status}</Badge>}
            </div>
            <DetailRows rows={detalhes} />
            {detalheExtra}
          </DetailPanel>
        )}
      </div>
    </>
  );
}

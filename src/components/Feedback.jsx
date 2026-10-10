import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
export function AvisoErro({ erro, onRetry, anterior = false, children }) {
  if (!erro) return null;
  return (
    <div className="aviso-erro" role="alert">
      <AlertCircle size={20} aria-hidden="true" />
      <div>
        <strong>
          {anterior
            ? "Não foi possível atualizar os dados."
            : "Não foi possível concluir."}
        </strong>
        <p>{typeof erro === "string" ? erro : erro.message}</p>
        {anterior && (
          <small>Os dados exibidos são da última consulta bem-sucedida.</small>
        )}
        {children}
      </div>
      {onRetry && (
        <button type="button" className="btn outline" onClick={onRetry}>
          <RefreshCw size={16} />
          Tentar novamente
        </button>
      )}
    </div>
  );
}
export class LimiteErro extends React.Component {
  state = { erro: false };
  static getDerivedStateFromError() {
    return { erro: true };
  }
  componentDidCatch(erro, detalhe) {
    console.error("Falha ao renderizar a tela:", erro, detalhe.componentStack);
  }
  componentDidUpdate(anterior) {
    if (anterior.chave !== this.props.chave && this.state.erro)
      this.setState({ erro: false });
  }
  render() {
    return this.state.erro ? <TelaFalha /> : this.props.children;
  }
}
export function TelaFalha() {
  return (
    <section className="empty-state" role="alert">
      <AlertCircle size={32} />
      <h2>Não foi possível abrir esta tela</h2>
      <p>Recarregue a página ou volte ao início para continuar.</p>
      <div className="button-pair">
        <button
          className="btn outline"
          onClick={() => window.location.reload()}
        >
          Recarregar
        </button>
        <a className="btn primary" href="/">
          Voltar ao início
        </a>
      </div>
    </section>
  );
}

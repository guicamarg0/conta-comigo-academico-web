import { UnidadeSelect } from "./components/UnidadeSelect.jsx";
import { SelectPesquisavel } from "./components/SelectPesquisavel";
import { CampoData } from "./components/CampoData";
import React, { useState, useEffect, useRef, useId } from "react";
import { AvisoErro } from "./components/Feedback.jsx";
import { mensagemValidacao, nomeCampo } from "./validacao.js";
import {
  useConfirmarDescarte,
  useRegistrarEdicao,
} from "./components/EdicaoProtegida.jsx";
import { createPortal } from "react-dom";
import { useMobile } from "./components/useMobile";
import { ArrowRight, ChevronLeft, ChevronRight, Search, X } from "lucide-react";

export function PageHeading({ title, subtitle, action, children }) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="heading-actions">
        {children}
        {action}
      </div>
    </div>
  );
}
export function MobileFlow({ children }) {
  const mobile = useMobile();
  return mobile ? (
    <div className="mobile-form-flow">{children}</div>
  ) : (
    <>{children}</>
  );
}
export function Card({ title, action, children, className = "" }) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <div className="card-heading">
          <h2>{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function Stat({
  icon: Icon,
  label,
  value,
  detail,
  trend,
  tone = "blue",
}) {
  return (
    <div className="stat">
      <span className={`stat-icon ${tone}`}>{Icon && <Icon size={23} />}</span>
      <div className="stat-text">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
      {trend && (
        <span className={`stat-trend ${trend.startsWith("↓") ? "down" : "up"}`}>
          {trend}
        </span>
      )}
    </div>
  );
}
export function Badge({ children }) {
  const txt = String(children || "");
  const tone = /recus|rejeit|atras|venc|inativ|erro|cancel/i.test(txt)
    ? "red"
    : /aprov|ativ|conclu|sucesso|vigente/i.test(txt)
      ? "green"
      : /pend|planej|aguard|andamento|expir/i.test(txt)
        ? "amber"
        : /rascunho/i.test(txt)
          ? "gray"
          : "blue";
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function Tabs({ items, value, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {items.map((item) => (
        <button
          role="tab"
          aria-selected={value === item}
          className={value === item ? "selected" : ""}
          key={item}
          onClick={() => onChange(item)}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
export function TextFilter({ value, onChange, placeholder = "Buscar..." }) {
  return (
    <label className="text-filter">
      <Search size={17} aria-hidden="true" />
      <input
        type="search"
        aria-label={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}
export function SelectFilter({ value, onChange, options, label, valorPadrao }) {
  return (
    <label className="select-filter">
      {label && <span>{label}</span>}
      <SelectPesquisavel
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option
            key={typeof opt === "string" ? opt : opt.value}
            value={
              typeof opt === "string"
                ? opt === "Todos" || opt === "Todas"
                  ? ""
                  : opt
                : opt.value
            }
          >
            {typeof opt === "string" ? opt : opt.label}
          </option>
        ))}
      </SelectPesquisavel>
    </label>
  );
}
export function DataTable({
  columns,
  rows,
  selected,
  onSelect,
  empty = "Nenhum registro encontrado",
  emptyDescription,
  emptyAction,
  pageSize = 10,
  remote,
  sort,
  onSort,
  filterable = false,
  mobileTitle,
  allowCompare = false,
  mobileActionLabel = "Ver detalhes",
  rowStyle,
  rowClassName,
}) {
  const mobile = useMobile();
  const [comparando, setComparando] = useState(false);
  const [page, setPage] = useState(1);
  const [filtros, setFiltros] = useState({});
  const [ordem, setOrdem] = useState(null);
  const ordenacao = sort || ordem;
  const valor = (row, col) =>
    col.sortValue ? col.sortValue(row) : (row[col.key] ?? "");
  const colunas = columns.filter(
    (c) => c.key !== "acoes" && c.filterable !== false,
  );
  let dados = remote
    ? rows
    : rows.filter((row) =>
        colunas.every(
          (col) =>
            !filtros[col.key] ||
            String(valor(row, col))
              .toLocaleLowerCase("pt-BR")
              .includes(filtros[col.key].toLocaleLowerCase("pt-BR")),
        ),
      );
  if (!remote && ordenacao) {
    const col = columns.find((c) => c.key === ordenacao.key);
    if (col)
      dados = [...dados].sort((a, b) => {
        const ajustar = (v) =>
          typeof v === "string" && /^\d{2}\/\d{2}\/\d{4}$/.test(v)
            ? v.split("/").reverse().join("-")
            : v;
        const x = ajustar(valor(a, col)),
          y = ajustar(valor(b, col));
        const compara =
          typeof x === "number" && typeof y === "number"
            ? x - y
            : String(x).localeCompare(String(y), "pt-BR", {
                numeric: true,
                sensitivity: "base",
              });
        return ordenacao.direction === "desc" ? -compara : compara;
      });
  }
  const ordenar = (key) => {
    const proxima = {
      key,
      direction:
        ordenacao?.key === key && ordenacao.direction === "asc"
          ? "desc"
          : "asc",
    };
    if (onSort) onSort(proxima);
    else setOrdem(proxima);
    setPage(1);
  };
  useEffect(() => setPage(1), [filtros]);
  const paginas = remote
    ? Math.max(1, remote.totalPaginas)
    : Math.max(1, Math.ceil(dados.length / pageSize));
  const pagina = remote ? remote.pagina + 1 : Math.min(page, paginas);
  const irPara = (numero) =>
    remote ? remote.setPagina(numero - 1) : setPage(numero);
  const total = remote ? remote.totalElementos : dados.length;
  const linhas = remote
    ? rows
    : dados.slice((pagina - 1) * pageSize, pagina * pageSize);
  const principais = [
    "status",
    "valor",
    "total",
    "referencia",
    "dataProgramada",
    "dataInicio",
    "cliente",
    "responsavel",
  ];
  const tituloColuna =
    columns.find((c) => c.key === mobileTitle) ||
    [
      "nome",
      "titulo",
      "descricao",
      "servico",
      "cliente",
      "numero",
      "codigo",
      "razaoSocial",
      "id",
    ]
      .map((key) => columns.find((c) => c.key === key))
      .find(Boolean) ||
    columns[0];
  const conteudo = (col, row, idx) =>
    col.render ? col.render(row, (pagina - 1) * pageSize + idx) : row[col.key];
  if (remote?.carregando && !rows.length)
    return <p role="status">Carregando registros...</p>;
  if (remote?.erro && !rows.length)
    return <AvisoErro erro={remote.erro} onRetry={remote.recarregar} />;
  return (
    <>
      {remote?.erro && (
        <AvisoErro
          erro={remote.erro}
          anterior={remote.anterior}
          onRetry={remote.recarregar}
        />
      )}
      {remote?.carregando && <p role="status">Atualizando registros...</p>}
      {mobile && allowCompare && (
        <button
          type="button"
          className="btn outline mobile-compare"
          onClick={() => setComparando((v) => !v)}
        >
          {comparando ? "Ver lista de itens" : "Comparar colunas"}
        </button>
      )}
      {mobile && !comparando && (
        <div className="mobile-records data-table-scroll">
          {(!remote || onSort || (filterable && !remote)) && (
            <details className="mobile-table-tools">
              <summary>
                {filterable ? "Ordenar e filtrar colunas" : "Ordenar lista"}
                {Object.values(filtros).some(Boolean)
                  ? " · filtros ativos"
                  : ""}
              </summary>
              {(!remote || onSort) && (
                <Field label="Ordenar por">
                  <SelectPesquisavel
                    value={ordenacao?.key || ""}
                    onChange={(e) => ordenar(e.target.value)}
                  >
                    <option value="">Selecione uma coluna</option>
                    {columns
                      .filter((c) => c.key !== "acoes" && c.sortable !== false)
                      .map((c) => (
                        <option key={c.key} value={c.key}>
                          {c.label}
                        </option>
                      ))}
                  </SelectPesquisavel>
                </Field>
              )}
              {ordenacao && (
                <button
                  className="btn outline"
                  type="button"
                  onClick={() => ordenar(ordenacao.key)}
                >
                  {ordenacao.direction === "asc"
                    ? "Crescente ↑"
                    : "Decrescente ↓"}{" "}
                  · Inverter ordem
                </button>
              )}
              {filterable &&
                !remote &&
                colunas.map((col) => (
                  <Field key={col.key} label={`Filtrar ${col.label}`}>
                    <input
                      type="search"
                      value={filtros[col.key] || ""}
                      onChange={(e) =>
                        setFiltros({ ...filtros, [col.key]: e.target.value })
                      }
                    />
                  </Field>
                ))}
              {Object.values(filtros).some(Boolean) && (
                <button
                  type="button"
                  className="btn outline"
                  onClick={() => setFiltros({})}
                >
                  Limpar filtros de colunas
                </button>
              )}
            </details>
          )}
          {linhas.map((row, idx) => (
            <article
              className={`mobile-record ${selected?.id === row.id ? "selected" : ""} ${rowClassName?.(row) || ""}`}
              style={rowStyle?.(row)}
              key={row.id ?? idx}
            >
              {columns.find(
                (c) =>
                  ["numero", "codigo", "id", "codigoReferencia"].includes(
                    c.key,
                  ) && c !== tituloColuna,
              ) && (
                <small className="mobile-record-code">
                  {(() => {
                    const col = columns.find(
                      (c) =>
                        ["numero", "codigo", "id", "codigoReferencia"].includes(
                          c.key,
                        ) && c !== tituloColuna,
                    );
                    return (
                      <>
                        {col.label}: {conteudo(col, row, idx)}
                      </>
                    );
                  })()}
                </small>
              )}
              <div className="mobile-record-title">
                {conteudo(tituloColuna, row, idx)}
              </div>
              <dl className="mobile-record-info">
                {columns
                  .filter(
                    (c) => c !== tituloColuna && principais.includes(c.key),
                  )
                  .map((col) => (
                    <React.Fragment key={col.key}>
                      <dt>{col.label}</dt>
                      <dd>{conteudo(col, row, idx)}</dd>
                    </React.Fragment>
                  ))}
              </dl>
              <div className="mobile-record-actions">
                {onSelect && (
                  <button
                    type="button"
                    className="btn outline"
                    onClick={() => onSelect(row)}
                    aria-label={`${mobileActionLabel}: ${String(row[tituloColuna.key] ?? idx + 1)}`}
                  >
                    {mobileActionLabel} <ArrowRight size={16} />
                  </button>
                )}
                <details>
                  <summary>Mais informações</summary>
                  <dl className="mobile-record-info">
                    {columns
                      .filter(
                        (c) =>
                          c !== tituloColuna && !principais.includes(c.key),
                      )
                      .map((col) => (
                        <React.Fragment key={col.key}>
                          <dt>{col.label}</dt>
                          <dd>{conteudo(col, row, idx)}</dd>
                        </React.Fragment>
                      ))}
                  </dl>
                </details>
              </div>
            </article>
          ))}
          {!dados.length && (
            <EmptyState
              title={empty}
              description={
                emptyDescription ??
                (remote?.filtrado || Object.values(filtros).some(Boolean)
                  ? "Nenhum resultado para estes filtros. Altere a busca ou limpe os filtros."
                  : "Ainda não há registros nesta listagem.")
              }
              action={emptyAction}
            />
          )}
        </div>
      )}
      {(!mobile || comparando) && (
        <>
          <div className="table-scroll data-table-scroll">
            <table>
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      aria-sort={
                        ordenacao?.key === col.key
                          ? ordenacao.direction === "asc"
                            ? "ascending"
                            : "descending"
                          : undefined
                      }
                    >
                      {col.key !== "acoes" &&
                      (!remote || onSort) &&
                      col.sortable !== false ? (
                        <button
                          className="table-sort"
                          onClick={() => ordenar(col.key)}
                        >
                          {col.label}{" "}
                          <span aria-hidden="true">
                            {ordenacao?.key === col.key
                              ? ordenacao.direction === "asc"
                                ? "↑"
                                : "↓"
                              : "↕"}
                          </span>
                        </button>
                      ) : (
                        col.label
                      )}
                    </th>
                  ))}
                </tr>
                {filterable && !remote && (
                  <tr className="column-filters">
                    {columns.map((col) => (
                      <th key={col.key}>
                        {col.key !== "acoes" && col.filterable !== false && (
                          <input
                            type="search"
                            aria-label={`Filtrar ${col.label}`}
                            placeholder="Filtrar..."
                            value={filtros[col.key] || ""}
                            onChange={(e) =>
                              setFiltros({
                                ...filtros,
                                [col.key]: e.target.value,
                              })
                            }
                          />
                        )}
                      </th>
                    ))}
                  </tr>
                )}
              </thead>
              <tbody>
                {linhas.map((row, idx) => (
                  <tr
                    key={row.id ?? idx}
                    className={`${selected?.id === row.id ? "row-selected" : ""} ${rowClassName?.(row) || ""}`}
                    style={rowStyle?.(row)}
                    tabIndex={onSelect ? 0 : undefined}
                    aria-selected={
                      onSelect ? selected?.id === row.id : undefined
                    }
                    onClick={() => onSelect?.(row)}
                    onKeyDown={(e) => {
                      if (onSelect && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        onSelect(row);
                      }
                    }}
                  >
                    {columns.map((col) => (
                      <td key={col.key}>
                        {col.render
                          ? col.render(row, (pagina - 1) * pageSize + idx)
                          : row[col.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {!dados.length && (
              <EmptyState
                title={empty}
                description={
                  emptyDescription ??
                  (remote?.filtrado || Object.values(filtros).some(Boolean)
                    ? "Nenhum resultado para estes filtros. Altere a busca ou limpe os filtros."
                    : "Ainda não há registros nesta listagem.")
                }
                action={emptyAction}
              />
            )}
          </div>
        </>
      )}
      {total > 0 && (
        <div className="pagination">
          <span>
            Mostrando {(pagina - 1) * pageSize + 1} a{" "}
            {Math.min(pagina * pageSize, total)} de {total} registros
          </span>
          <div>
            <button
              aria-label="Página anterior"
              disabled={pagina === 1}
              onClick={() => irPara(pagina - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from(
              { length: Math.min(paginas, 5) },
              (_, i) => Math.max(1, Math.min(paginas - 4, pagina - 2)) + i,
            ).map((numero) => (
              <button
                key={numero}
                className={pagina === numero ? "active" : ""}
                onClick={() => irPara(numero)}
              >
                {numero}
              </button>
            ))}
            <button
              aria-label="Próxima página"
              disabled={pagina === paginas}
              onClick={() => irPara(pagina + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <span>{pageSize} por página</span>
        </div>
      )}
    </>
  );
}
export function DetailPanel({
  title,
  status,
  onClose,
  tabs,
  tab,
  setTab,
  children,
  footer,
}) {
  const mobile = useMobile();
  const dialog = useRef(null);
  useEffect(() => {
    if (!mobile || !dialog.current) return;
    const elemento = dialog.current,
      anterior = document.activeElement;
    elemento.showModal();
    return () => {
      elemento.close();
      if (anterior?.isConnected) anterior.focus({ preventScroll: true });
    };
  }, [mobile]);
  const panel = (
    <aside className="detail-panel">
      <div className="detail-head">
        <div>
          <small>Detalhes</small>
          <h2>{title}</h2>
        </div>
        {status && <Badge>{status}</Badge>}
        <button
          className="quiet-icon"
          aria-label="Fechar detalhes"
          onClick={onClose}
        >
          <X size={20} />
        </button>
        <button
          type="button"
          className="btn outline mobile-back-details"
          onClick={onClose}
        >
          <ChevronLeft size={16} /> Voltar à lista
        </button>
      </div>
      {tabs && <Tabs items={tabs} value={tab} onChange={setTab} />}
      <div className="detail-body">{children}</div>
      {footer && <div className="detail-footer">{footer}</div>}
    </aside>
  );
  return mobile
    ? createPortal(
        <dialog
          ref={dialog}
          className="mobile-detail-dialog"
          aria-label={title}
          onCancel={(e) => {
            e.preventDefault();
            onClose();
          }}
        >
          {panel}
        </dialog>,
        document.body,
      )
    : panel;
}
export function Modal({
  title,
  onClose,
  children,
  footer,
  wide = false,
  proteger = true,
  busy = false,
}) {
  const dialog = useRef(null);
  const alterado = useRef(false);
  useRegistrarEdicao(() => proteger && alterado.current);
  const confirmar = useConfirmarDescarte();
  async function fechar() {
    const ocupado =
      busy ||
      dialog.current?.querySelector(
        '[aria-busy="true"],button[disabled][data-salvando]',
      );
    if (ocupado) return;
    if (!proteger || !alterado.current || (await confirmar())) onClose();
  }
  useEffect(() => {
    const elemento = dialog.current,
      anterior = document.activeElement;
    elemento?.showModal();
    return () => {
      elemento?.close();
      if (anterior?.isConnected) anterior.focus({ preventScroll: true });
    };
  }, []);
  return createPortal(
    <dialog
      ref={dialog}
      className="modal-overlay native-modal"
      aria-label={title}
      aria-modal="true"
      onCancel={(e) => {
        e.preventDefault();
        fechar();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) fechar();
      }}
      onInputCapture={() => {
        alterado.current = true;
      }}
      onChangeCapture={() => {
        alterado.current = true;
      }}
    >
      <section className={`modal ${wide ? "wide" : ""}`}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button
            className="quiet-icon"
            aria-label="Fechar"
            disabled={busy}
            onClick={fechar}
          >
            <X size={19} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && (
          <div
            className="modal-footer"
            onClickCapture={(e) => {
              const b = e.target.closest("button");
              if (
                b &&
                /^(Cancelar|Fechar)$/.test(b.textContent.trim()) &&
                (busy || (proteger && alterado.current))
              ) {
                e.preventDefault();
                e.stopPropagation();
                fechar();
              }
            }}
          >
            {footer}
          </div>
        )}
      </section>
    </dialog>,
    document.body,
  );
}
export function Field({ label, children, className = "", error }) {
  const idErro = useId();
  const [erroLocal, setErroLocal] = useState("");
  const campoRef = useRef(null);
  const erroExibido = error || erroLocal;
  useEffect(() => {
    const campo = campoRef.current?.querySelector("input,textarea,select");
    if (!campo) return;
    const custom = (e) => setErroLocal(e.detail);
    campo.addEventListener("campo:erro", custom);
    return () => campo.removeEventListener("campo:erro", custom);
  }, []);
  const obrigatorio = /\s\*$/.test(label) || Boolean(children?.props?.required);
  const texto = label.replace(/\s*\*\s*$/, "");
  const control =
    React.isValidElement(children) &&
    (children.type === "input" ||
      children.type === "textarea" ||
      children.type === SelectPesquisavel ||
      children.type === CampoData ||
      children.type === UnidadeSelect)
      ? React.cloneElement(children, {
          "aria-label": children.props["aria-label"] ?? texto,
          required: children.props.required ?? obrigatorio,
          name: children.props.name ?? nomeCampo(texto),
          "aria-invalid": erroExibido ? true : children.props["aria-invalid"],
          "aria-describedby":
            [children.props["aria-describedby"], erroExibido ? idErro : null]
              .filter(Boolean)
              .join(" ") || undefined,
          onInvalid: (e) => {
            e.preventDefault();
            setErroLocal(mensagemValidacao(e.target));
            queueMicrotask(() =>
              campoRef.current
                ?.closest("form")
                ?.querySelector("input:invalid,textarea:invalid,select:invalid")
                ?.focus(),
            );
            children.props.onInvalid?.(e);
          },
          onChange: (e) => {
            setErroLocal("");
            children.props.onChange?.(e);
          },
          ...(children.props.onTextChange
            ? {
                onTextChange: (valor) => {
                  setErroLocal("");
                  children.props.onTextChange(valor);
                },
              }
            : {}),
          placeholder:
            children.props.placeholder ??
            (![
              "date",
              "datetime-local",
              "month",
              "time",
              "file",
              "checkbox",
              "radio",
            ].includes(children.props.type)
              ? `Informe ${texto.toLowerCase()}`
              : undefined),
        })
      : children;
  return (
    <label ref={campoRef} className={`field ${className}`}>
      <span>
        {texto}
        {obrigatorio && (
          <>
            {" "}
            <b className="required-mark" aria-hidden="true">
              *
            </b>
          </>
        )}
      </span>
      {control}
      {erroExibido && (
        <small id={idErro} className="field-error" role="alert">
          {erroExibido}
        </small>
      )}
    </label>
  );
}
export function EmptyState({ title, description, action }) {
  return (
    <div className="empty-state">
      <Search size={32} />
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Timeline({ events }) {
  return (
    <div className="timeline">
      {events.map((e, i) => (
        <div className="timeline-event" key={i}>
          <span className="timeline-dot" />
          <div>
            <strong>{e.titulo}</strong>
            <small>{e.descricao}</small>
          </div>
          <time>{e.data}</time>
        </div>
      ))}
    </div>
  );
}
export function DetailRows({ rows }) {
  return (
    <dl className="detail-rows">
      {rows.map(([label, value]) => (
        <React.Fragment key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}
export function TextLink({ children, onClick }) {
  return (
    <button className="text-link" onClick={onClick}>
      {children}
      <ArrowRight size={15} />
    </button>
  );
}

import React, {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { SelectPesquisavel } from "./SelectPesquisavel";
import {
  dataIso,
  diasDoCalendario,
  lerData,
  limitarData,
  moverData,
  moverMes,
} from "../datas";

const meses = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const nomeDia = (valor) =>
  lerData(valor)?.toLocaleDateString("pt-BR", { dateStyle: "full" });

export const CampoData = forwardRef(function CampoData(
  {
    value,
    defaultValue = "",
    onChange,
    onClick,
    onKeyDown,
    className = "",
    disabled,
    readOnly,
    min,
    max,
    required,
    ...props
  },
  ref,
) {
  const entrada = useRef(null),
    dialogo = useRef(null),
    botoes = useRef(new Map());
  const tituloId = useId();
  const [interno, setInterno] = useState(defaultValue);
  const valor = value !== undefined ? value : interno;
  const [aberto, setAberto] = useState(false);
  const [foco, setFoco] = useState(dataIso(new Date()));
  const [mes, setMes] = useState(foco.slice(0, 7));
  useImperativeHandle(ref, () => entrada.current);
  useEffect(() => {
    if (aberto) {
      if (!dialogo.current.open) dialogo.current.showModal();
      botoes.current.get(foco)?.focus();
    } else if (dialogo.current?.open) {
      dialogo.current.close();
      entrada.current?.focus({ preventScroll: true });
    }
  }, [aberto, foco, mes]);
  useEffect(() => {
    const form = entrada.current?.form;
    const resetar = () => {
      setInterno(defaultValue);
      setAberto(false);
    };
    form?.addEventListener("reset", resetar);
    return () => form?.removeEventListener("reset", resetar);
  }, [defaultValue]);
  function abrir() {
    if (disabled || readOnly) return;
    const data = limitarData(
      lerData(valor) ? valor : dataIso(new Date()),
      min,
      max,
    );
    setFoco(data);
    setMes(data.slice(0, 7));
    setAberto(true);
  }
  function alterar(data) {
    setInterno(data);
    if (entrada.current) entrada.current.value = data;
    onChange?.({
      target: entrada.current,
      currentTarget: entrada.current,
      type: "change",
    });
    setAberto(false);
  }
  function navegar(data) {
    const destino = limitarData(data, min, max);
    setMes(destino.slice(0, 7));
    setFoco(destino);
  }
  function teclado(evento, data) {
    const passos = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    let destino;
    if (evento.key in passos) destino = moverData(data, passos[evento.key]);
    else if (evento.key === "Home")
      destino = moverData(data, -((lerData(data).getDay() + 6) % 7));
    else if (evento.key === "End")
      destino = moverData(data, 6 - ((lerData(data).getDay() + 6) % 7));
    else if (evento.key === "PageUp")
      destino = moverMes(data, evento.shiftKey ? -12 : -1);
    else if (evento.key === "PageDown")
      destino = moverMes(data, evento.shiftKey ? 12 : 1);
    if (destino) {
      evento.preventDefault();
      navegar(destino);
    }
  }
  const dias = diasDoCalendario(mes);
  const hoje = dataIso(new Date());
  const disponivel = (data) => (!min || data >= min) && (!max || data <= max);
  const primeiroAno = Math.min(
    1900,
    Number(mes.slice(0, 4)),
    lerData(min)?.getFullYear() ?? 1900,
  );
  const ultimoAno = Math.max(
    2100,
    Number(mes.slice(0, 4)),
    lerData(max)?.getFullYear() ?? 2100,
  );
  const label = props["aria-label"]
    ? `Abrir calendário: ${props["aria-label"]}`
    : "Selecionar data";
  return (
    <>
      <span className={`campo-data-controle ${disabled ? "desabilitado" : ""}`}>
        <input
          {...props}
          ref={entrada}
          type="date"
          value={valor || ""}
          min={min}
          max={max}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          className={`campo-data ${className}`}
          onChange={(e) => {
            setInterno(e.target.value);
            onChange?.(e);
          }}
          onClick={(e) => {
            onClick?.(e);
            if (!e.defaultPrevented && !disabled && !readOnly) {
              e.preventDefault();
              abrir();
            }
          }}
          onKeyDown={(e) => {
            onKeyDown?.(e);
            if (
              !e.defaultPrevented &&
              (e.key === "Enter" ||
                e.key === " " ||
                (e.altKey && e.key === "ArrowDown"))
            ) {
              e.preventDefault();
              abrir();
            }
          }}
        />
        <button
          type="button"
          className="campo-data-abrir"
          aria-label={label}
          aria-haspopup="dialog"
          aria-expanded={aberto}
          disabled={disabled || readOnly}
          onClick={abrir}
        >
          <CalendarDays size={18} />
        </button>
      </span>
      {createPortal(
        <dialog
          ref={dialogo}
          className="calendario-modal"
          aria-labelledby={tituloId}
          onCancel={(e) => {
            e.preventDefault();
            setAberto(false);
          }}
          onClose={() => setAberto(false)}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              const r = e.currentTarget.getBoundingClientRect();
              if (
                e.clientX < r.left ||
                e.clientX > r.right ||
                e.clientY < r.top ||
                e.clientY > r.bottom
              )
                setAberto(false);
            }
          }}
        >
          <div className="calendario-modal-cabecalho">
            <h2 id={tituloId}>Selecionar data</h2>
            <button
              type="button"
              className="quiet-icon"
              aria-label="Fechar calendário"
              onClick={() => setAberto(false)}
            >
              <X size={19} />
            </button>
          </div>
          <div className="calendario-modal-navegacao">
            <button
              type="button"
              className="btn outline"
              aria-label="Mês anterior"
              disabled={!!min && mes <= min.slice(0, 7)}
              onClick={() => navegar(moverMes(`${mes}-01`, -1))}
            >
              <ChevronLeft size={16} />
            </button>
            <SelectPesquisavel
              key={`mes-${aberto}`}
              aria-label="Mês do calendário"
              value={mes.slice(5, 7)}
              onChange={(e) =>
                navegar(`${mes.slice(0, 4)}-${e.target.value}-01`)
              }
            >
              {meses.map((nome, i) => (
                <option key={nome} value={String(i + 1).padStart(2, "0")}>
                  {nome}
                </option>
              ))}
            </SelectPesquisavel>
            <SelectPesquisavel
              key={`ano-${aberto}`}
              aria-label="Ano do calendário"
              value={mes.slice(0, 4)}
              onChange={(e) =>
                navegar(`${e.target.value}-${mes.slice(5, 7)}-01`)
              }
            >
              {Array.from(
                { length: ultimoAno - primeiroAno + 1 },
                (_, i) => primeiroAno + i,
              ).map((ano) => (
                <option key={ano}>{ano}</option>
              ))}
            </SelectPesquisavel>
            <button
              type="button"
              className="btn outline"
              aria-label="Próximo mês"
              disabled={!!max && mes >= max.slice(0, 7)}
              onClick={() => navegar(moverMes(`${mes}-01`, 1))}
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <div
            role="grid"
            aria-label={`${meses[Number(mes.slice(5, 7)) - 1]} de ${mes.slice(0, 4)}`}
            className="calendario-modal-grade"
          >
            <div role="row" className="calendario-modal-semana">
              {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
                <span role="columnheader" key={d}>
                  {d}
                </span>
              ))}
            </div>
            {Array.from({ length: 6 }, (_, semana) => (
              <div role="row" className="calendario-modal-semana" key={semana}>
                {dias.slice(semana * 7, semana * 7 + 7).map((data) => (
                  <div
                    role="gridcell"
                    aria-selected={data === valor}
                    key={data}
                  >
                    <button
                      type="button"
                      ref={(el) => {
                        if (el) botoes.current.set(data, el);
                        else botoes.current.delete(data);
                      }}
                      aria-label={nomeDia(data)}
                      aria-current={data === hoje ? "date" : undefined}
                      tabIndex={data === foco ? 0 : -1}
                      disabled={!disponivel(data)}
                      className={`${data.startsWith(mes) ? "" : "outro-mes"} ${data === valor ? "selecionado" : ""} ${data === hoje ? "hoje" : ""}`}
                      onClick={() => alterar(data)}
                      onKeyDown={(e) => teclado(e, data)}
                    >
                      {Number(data.slice(-2))}
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <p className="calendario-modal-selecao" aria-live="polite">
            {lerData(valor) ? nomeDia(valor) : "Escolha o dia no calendário."}
          </p>
          <div className="calendario-modal-rodape">
            <button
              type="button"
              className="btn outline"
              disabled={required || !valor}
              onClick={() => alterar("")}
            >
              Limpar
            </button>
            <button
              type="button"
              className="btn outline"
              onClick={() => setAberto(false)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn primary"
              disabled={!disponivel(hoje)}
              onClick={() => alterar(hoje)}
            >
              Hoje
            </button>
          </div>
        </dialog>,
        document.body,
      )}
    </>
  );
});

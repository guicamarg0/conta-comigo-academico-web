import { SelectPesquisavel } from "./SelectPesquisavel";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { EditorContent, useEditor } from "@tiptap/react";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import StarterKit from "@tiptap/starter-kit";
import { TextStyleKit } from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import { TableKit } from "@tiptap/extension-table";
import {
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Table2,
  ChevronDown,
  Type,
  RemoveFormatting,
  Minus,
  Plus,
} from "lucide-react";
import { variaveisContrato } from "../pages/contractTemplates.jsx";

function htmlInicial(value = "") {
  const documento = new DOMParser().parseFromString(value, "text/html");
  documento
    .querySelectorAll(".contract-signatures")
    .forEach((el) => el.remove());
  documento.querySelectorAll("font").forEach((el) => {
    const span = documento.createElement("span");
    span.style.cssText = el.style.cssText;
    if (el.color) span.style.color = el.color;
    if (el.face) span.style.fontFamily = el.face;
    if (el.size && !span.style.fontSize)
      span.style.fontSize = [
        "8pt",
        "10pt",
        "12pt",
        "14pt",
        "18pt",
        "24pt",
        "36pt",
      ][Math.max(0, Math.min(6, Number(el.size) - 1))];
    span.innerHTML = el.innerHTML;
    el.replaceWith(span);
  });
  if (/<\/?[a-z][\s\S]*>/i.test(value)) return documento.body.innerHTML;
  return value
    .split("\n")
    .map((line) => {
      const p = documento.createElement("p");
      p.textContent = line;
      return p.outerHTML;
    })
    .join("");
}

export function EditorConteudo({
  value,
  onChange,
  label,
  className = "",
  editorRef,
}) {
  const [sugestao, setSugestao] = useState(null);
  const sugestaoRef = useRef(null);
  const dispensadaRef = useRef(null);
  const definirSugestao = (valor) => {
    sugestaoRef.current = valor;
    setSugestao(valor);
  };
  const atualizarSugestao = (editorAtual) => {
    const { from, empty } = editorAtual.state.selection;
    if (!empty || !editorAtual.isFocused) return definirSugestao(null);
    const antes = editorAtual.state.doc.textBetween(
      Math.max(0, from - 80),
      from,
      "\n",
    );
    const match = antes.match(/(?:^|[\s(])(@([A-Za-zÀ-ÿ0-9_]*))$/);
    if (!match) {
      dispensadaRef.current = null;
      return definirSugestao(null);
    }
    const inicio = from - match[1].length;
    const chave = `${inicio}:${match[2]}`;
    if (dispensadaRef.current === chave) return definirSugestao(null);
    const itens = variaveisContrato
      .flatMap(([, lista]) => lista)
      .filter((v) => v.slice(1).toLowerCase().includes(match[2].toLowerCase()))
      .slice(0, 8);
    const coords = editorAtual.view.coordsAtPos(from);
    const anterior = sugestaoRef.current;
    definirSugestao({
      from: inicio,
      to: from,
      chave,
      itens,
      indice: anterior?.chave === chave ? anterior.indice : 0,
      left: Math.max(12, Math.min(coords.left, window.innerWidth - 352)),
      top: coords.bottom + 8,
      maxHeight: Math.max(
        40,
        Math.min(224, window.innerHeight - coords.bottom - 20),
      ),
    });
  };
  const [menu, setMenu] = useState(null);
  const [tamanho, setTamanho] = useState("12");
  const [hex, setHex] = useState("#203453");
  const barraRef = useRef(null);
  const editor = useEditor({
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit,
      TextStyleKit,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TableKit,
    ],
    content: htmlInicial(value),
    editorProps: {
      decorations: (state) => {
        const conhecidas = new Set(
          variaveisContrato.flatMap(([, lista]) => lista),
        );
        const destaques = [];
        state.doc.descendants((node, pos) => {
          if (!node.isTextblock) return;
          // Concatena trechos com marcas diferentes sem alterar texto, estilos ou seleção.
          const texto = node.textBetween(
            0,
            node.content.size,
            "\ufffc",
            "\ufffc",
          );
          for (const match of texto.matchAll(/@[A-Za-zÀ-ÿ0-9_]+/g)) {
            if (conhecidas.has(match[0]))
              destaques.push(
                Decoration.inline(
                  pos + 1 + match.index,
                  pos + 1 + match.index + match[0].length,
                  { class: "doc-variable-highlight" },
                ),
              );
          }
          return false;
        });
        return DecorationSet.create(state.doc, destaques);
      },
      attributes: {
        class: `contract-content-editor ${className}`,
        role: "textbox",
        "aria-label": label,
      },
      handleKeyDown: (view, event) => {
        const atual = sugestaoRef.current;
        if (!atual) return false;
        if (event.key === "Escape") {
          dispensadaRef.current = atual.chave;
          definirSugestao(null);
          return true;
        }
        if (!atual.itens.length) return false;
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          definirSugestao({
            ...atual,
            indice:
              (atual.indice +
                (event.key === "ArrowDown" ? 1 : -1) +
                atual.itens.length) %
              atual.itens.length,
          });
          return true;
        }
        if (event.key === "Enter" || event.key === "Tab") {
          view.dispatch(
            view.state.tr.insertText(
              atual.itens[atual.indice] + " ",
              atual.from,
              atual.to,
            ),
          );
          return true;
        }
        return false;
      },
      handleDrop: (view, event) => {
        const variavel = event.dataTransfer?.getData("text/variavel");
        if (!variavel) return false;
        const pos = view.posAtCoords({
          left: event.clientX,
          top: event.clientY,
        });
        if (pos)
          view.dispatch(view.state.tr.insertText(variavel + " ", pos.pos));
        event.preventDefault();
        return true;
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    onTransaction: ({ editor }) => atualizarSugestao(editor),
    onFocus: ({ editor }) => atualizarSugestao(editor),
    onBlur: () => definirSugestao(null),
  });
  useEffect(() => {
    if (editorRef) editorRef.current = editor;
    return () => {
      if (editorRef) editorRef.current = null;
    };
  }, [editor, editorRef]);
  useEffect(() => {
    if (editor && htmlInicial(value) !== editor.getHTML())
      editor.commands.setContent(htmlInicial(value), { emitUpdate: false });
  }, [value, editor]);
  useEffect(() => {
    const reposicionar = () => {
      if (editor && sugestaoRef.current) atualizarSugestao(editor);
    };
    window.addEventListener("scroll", reposicionar, true);
    window.addEventListener("resize", reposicionar);
    return () => {
      window.removeEventListener("scroll", reposicionar, true);
      window.removeEventListener("resize", reposicionar);
    };
  }, [editor]);
  const estiloTexto = editor?.getAttributes("textStyle") || {};
  useEffect(() => {
    setTamanho(String(parseFloat(estiloTexto.fontSize) || 12));
  }, [estiloTexto.fontSize]);
  useEffect(() => {
    const cor = estiloTexto.color || "#203453";
    const rgb = cor.match(/rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)/);
    setHex(
      rgb
        ? "#" +
            rgb
              .slice(1)
              .map((v) => Number(v).toString(16).padStart(2, "0"))
              .join("")
        : cor,
    );
  }, [estiloTexto.color]);
  useEffect(() => {
    if (!menu) return;
    const fechar = (e) => {
      if (!barraRef.current?.contains(e.target)) setMenu(null);
    };
    const teclado = (e) => {
      if (e.key === "Escape") {
        setMenu(null);
        editor?.commands.focus();
      }
    };
    document.addEventListener("pointerdown", fechar);
    document.addEventListener("keydown", teclado);
    return () => {
      document.removeEventListener("pointerdown", fechar);
      document.removeEventListener("keydown", teclado);
    };
  }, [menu, editor]);
  if (!editor) return null;
  const comando = (action) => action(editor.chain().focus()).run();
  const botao = (texto, Icone, action, ativo = undefined, disabled = false) => (
    <button
      type="button"
      className="doc-tool-icon"
      title={texto}
      aria-label={texto}
      aria-pressed={ativo}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => {
        comando(action);
        setMenu(null);
      }}
    >
      <Icone size={17} />
    </button>
  );
  const aplicarTamanho = (numero) => {
    if (Number(numero) >= 6 && Number(numero) <= 96)
      comando((c) => c.setFontSize(`${numero}pt`));
  };
  const aplicarCor = (cor) => {
    setHex(cor);
    comando((c) => c.setColor(cor));
  };
  return (
    <div
      className={`editor-wrap ${className.includes("contract-draft") ? "contract-draft-editor" : ""}`}
    >
      <div
        className="doc-toolbar"
        ref={barraRef}
        role="toolbar"
        aria-label="Formatação do documento"
      >
        <div className="doc-toolbar-row">
          <div className="doc-tool-group" aria-label="Histórico de edição">
            {botao(
              "Desfazer (Ctrl+Z)",
              Undo2,
              (c) => c.undo(),
              undefined,
              !editor.can().undo(),
            )}
            {botao(
              "Refazer (Ctrl+Shift+Z)",
              Redo2,
              (c) => c.redo(),
              undefined,
              !editor.can().redo(),
            )}
          </div>
          <div className="doc-tool-group">
            <SelectPesquisavel
              aria-label="Estilo do parágrafo"
              title="Estilo do parágrafo"
              value={
                editor.isActive("heading", { level: 1 })
                  ? "1"
                  : editor.isActive("heading", { level: 2 })
                    ? "2"
                    : "0"
              }
              onChange={(e) =>
                comando((c) =>
                  Number(e.target.value)
                    ? c.setHeading({ level: Number(e.target.value) })
                    : c.setParagraph(),
                )
              }
            >
              <option value="0">Texto normal</option>
              <option value="1">Título</option>
              <option value="2">Subtítulo</option>
            </SelectPesquisavel>
          </div>
          <div className="doc-tool-group doc-font-group">
            <SelectPesquisavel
              aria-label="Fonte"
              title="Fonte"
              value={estiloTexto.fontFamily || "Noto Sans"}
              onChange={(e) => comando((c) => c.setFontFamily(e.target.value))}
            >
              {["Noto Sans", "Noto Serif", "Noto Sans Mono"].map((f) => (
                <option key={f}>{f}</option>
              ))}
            </SelectPesquisavel>
            <div className="doc-font-size">
              {botao("Diminuir fonte", Minus, (c) =>
                c.setFontSize(`${Math.max(6, Number(tamanho) - 1)}pt`),
              )}
              <input
                aria-label="Tamanho da fonte em pontos"
                title="Tamanho da fonte em pontos"
                inputMode="decimal"
                value={tamanho}
                onChange={(e) => {
                  setTamanho(e.target.value);
                  aplicarTamanho(e.target.value);
                }}
                onBlur={() => {
                  if (Number(tamanho) < 6 || Number(tamanho) > 96)
                    setTamanho(String(parseFloat(estiloTexto.fontSize) || 12));
                }}
              />
              {botao("Aumentar fonte", Plus, (c) =>
                c.setFontSize(`${Math.min(96, Number(tamanho) + 1)}pt`),
              )}
            </div>
          </div>
        </div>
        <div className="doc-toolbar-row">
          <div className="doc-tool-group">
            {botao(
              "Negrito (Ctrl+B)",
              Bold,
              (c) => c.toggleBold(),
              editor.isActive("bold"),
            )}
            {botao(
              "Itálico (Ctrl+I)",
              Italic,
              (c) => c.toggleItalic(),
              editor.isActive("italic"),
            )}
            {botao(
              "Sublinhado (Ctrl+U)",
              Underline,
              (c) => c.toggleUnderline(),
              editor.isActive("underline"),
            )}
            {botao(
              "Tachado",
              Strikethrough,
              (c) => c.toggleStrike(),
              editor.isActive("strike"),
            )}
            <div className="doc-menu-anchor">
              <button
                type="button"
                className="doc-color-trigger"
                aria-label="Cor do texto"
                title="Cor do texto"
                aria-haspopup="dialog"
                aria-expanded={menu === "cor"}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setMenu(menu === "cor" ? null : "cor")}
              >
                <span className="doc-color-symbol" style={{ borderColor: hex }}>
                  <Type size={18} />
                </span>
                <ChevronDown size={12} />
              </button>
              {menu === "cor" && (
                <div
                  className="doc-popover"
                  role="dialog"
                  aria-label="Escolher cor do texto"
                >
                  <strong>Cor do texto</strong>
                  <div className="doc-color-grid">
                    {[
                      "#000000",
                      "#203453",
                      "#666666",
                      "#ffffff",
                      "#e02626",
                      "#e67e22",
                      "#e6bc18",
                      "#1b9565",
                      "#0077cc",
                      "#1264e8",
                      "#7a3bc2",
                      "#b83280",
                    ].map((cor) => (
                      <button
                        type="button"
                        key={cor}
                        title={cor}
                        aria-label={`Aplicar cor ${cor}`}
                        style={{ background: cor }}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          aplicarCor(cor);
                          setMenu(null);
                        }}
                      />
                    ))}
                  </div>
                  <label>
                    Personalizada{" "}
                    <input
                      type="color"
                      aria-label="Cor personalizada"
                      value={/^#[0-9a-f]{6}$/i.test(hex) ? hex : "#203453"}
                      onInput={(e) => aplicarCor(e.currentTarget.value)}
                    />
                  </label>
                  <label>
                    Hexadecimal{" "}
                    <input
                      aria-label="Cor hexadecimal"
                      maxLength={7}
                      value={hex}
                      onChange={(e) => {
                        setHex(e.target.value);
                        if (/^#[0-9a-f]{6}$/i.test(e.target.value))
                          aplicarCor(e.target.value);
                      }}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
          <div className="doc-tool-group">
            {[
              ["Alinhar à esquerda", "left", AlignLeft],
              ["Centralizar", "center", AlignCenter],
              ["Alinhar à direita", "right", AlignRight],
              ["Justificar", "justify", AlignJustify],
            ].map(([l, a, Icone]) => (
              <React.Fragment key={a}>
                {botao(
                  l,
                  Icone,
                  (c) => c.setTextAlign(a),
                  editor.isActive({ textAlign: a }),
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="doc-tool-group">
            {botao(
              "Lista com marcadores",
              List,
              (c) => c.toggleBulletList(),
              editor.isActive("bulletList"),
            )}
            {botao(
              "Lista numerada",
              ListOrdered,
              (c) => c.toggleOrderedList(),
              editor.isActive("orderedList"),
            )}
            <div className="doc-menu-anchor">
              <button
                type="button"
                className="doc-tool-icon"
                aria-label="Tabela"
                title="Tabela"
                aria-haspopup="menu"
                aria-expanded={menu === "tabela"}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setMenu(menu === "tabela" ? null : "tabela")}
              >
                <Table2 size={17} />
                <ChevronDown size={11} />
              </button>
              {menu === "tabela" && (
                <div
                  className="doc-popover doc-table-menu"
                  role="menu"
                  aria-label="Ferramentas de tabela"
                >
                  <button
                    role="menuitem"
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      comando((c) =>
                        c.insertTable({
                          rows: 3,
                          cols: 2,
                          withHeaderRow: true,
                        }),
                      );
                      setMenu(null);
                    }}
                  >
                    Inserir tabela (3 × 2)
                  </button>
                  {editor.isActive("table") &&
                    [
                      ["Adicionar linha", "addRowAfter"],
                      ["Adicionar coluna", "addColumnAfter"],
                      ["Excluir linha", "deleteRow"],
                      ["Excluir coluna", "deleteColumn"],
                      ["Excluir tabela", "deleteTable"],
                    ].map(([l, action]) => (
                      <button
                        role="menuitem"
                        type="button"
                        key={action}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          comando((c) => c[action]());
                          setMenu(null);
                        }}
                      >
                        {l}
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>
          <div className="doc-tool-group">
            {botao("Limpar formatação", RemoveFormatting, (c) =>
              c.unsetAllMarks().clearNodes(),
            )}
          </div>
        </div>
      </div>
      <div className="doc-sheet-workspace">
        <EditorContent editor={editor} />
        {sugestao &&
          createPortal(
            <div
              className="doc-variable-suggestions"
              role="listbox"
              aria-label="Sugestões de variáveis"
              style={{
                left: sugestao.left,
                top: sugestao.top,
                maxHeight: sugestao.maxHeight,
                overflowY: "auto",
              }}
            >
              <small>Variáveis do modelo</small>
              {sugestao.itens.length ? (
                sugestao.itens.map((variavel, indice) => (
                  <button
                    type="button"
                    role="option"
                    aria-selected={indice === sugestao.indice}
                    key={variavel}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() =>
                      editor
                        .chain()
                        .focus()
                        .insertContentAt(
                          { from: sugestao.from, to: sugestao.to },
                          variavel + " ",
                        )
                        .run()
                    }
                  >
                    {variavel}
                  </button>
                ))
              ) : (
                <p>Nenhuma variável encontrada</p>
              )}
              <footer>↑ ↓ selecionar · Enter inserir · Esc fechar</footer>
            </div>,
            document.body,
          )}
      </div>
      <div className="doc-statusbar">
        <span>
          {editor.getText().trim()
            ? editor.getText().trim().split(/\s+/).length
            : 0}{" "}
          palavras
        </span>
        <span>Fonte em pontos · Assinaturas automáticas no PDF</span>
      </div>
    </div>
  );
}

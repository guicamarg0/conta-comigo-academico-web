import { unzipSync, strFromU8 } from "fflate";
export const COLUNAS = [
  "CODIGO",
  "DESC",
  "UNIDADE DE MEDIDA",
  "VALOR UNITARIO",
];
const normalizar = (s) =>
  String(s ?? "")
    .trim()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase();
export function lerCsv(texto) {
  texto = texto.replace(/^\uFEFF/, "");
  const primeira = texto.split(/\r?\n/)[0];
  const separador = [";", "|", "\t", ","].sort(
    (a, b) => primeira.split(b).length - primeira.split(a).length,
  )[0];
  const linhas = [];
  let linha = [],
    campo = "",
    aspas = false;
  for (let n = 0; n < texto.length; n++) {
    const c = texto[n];
    if (c === '"') {
      if (aspas && texto[n + 1] === '"') {
        campo += '"';
        n++;
      } else aspas = !aspas;
    } else if (c === separador && !aspas) {
      linha.push(campo);
      campo = "";
    } else if ((c === "\n" || c === "\r") && !aspas) {
      if (c === "\r" && texto[n + 1] === "\n") n++;
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = "";
    } else campo += c;
  }
  if (aspas) throw new Error("CSV contém aspas sem fechamento.");
  if (campo || linha.length) {
    linha.push(campo);
    linhas.push(linha);
  }
  return linhas;
}
export function valorNumerico(valor) {
  if (typeof valor === "number") return valor;
  let s = String(valor)
    .trim()
    .replace(/^R\$\s*/, "")
    .replace(/\s/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) throw new Error("valor unitário inválido");
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0 || n > 9999999999999.99)
    throw new Error("valor fora do limite");
  return n;
}
const medidas = {
  UN: "UN",
  UNIDADE: "UN",
  UNIDADES: "UN",
  PC: "UN",
  PCS: "UN",
  PECA: "UN",
  PECAS: "UN",
  H: "Hora",
  HORA: "Hora",
  HORAS: "Hora",
  DIA: "Diária",
  DIARIA: "Diária",
  M: "MT",
  MT: "MT",
  METRO: "MT",
  M2: "M²",
  "M²": "M²",
  METRO_QUADRADO: "M²",
  KG: "KG",
  QUILOGRAMA: "KG",
  L: "LT",
  LT: "LT",
  LITRO: "LT",
};
export function validarLinhas(linhas) {
  const cabecalho = linhas.shift()?.map(normalizar);
  if (
    !cabecalho ||
    cabecalho.length !== 4 ||
    !cabecalho.every(
      (c, n) => c === COLUNAS[n] || (n === 1 && c === "DESCRICAO"),
    )
  )
    throw new Error(
      "Use as quatro colunas nesta ordem: CODIGO | DESC | UNIDADE DE MEDIDA | VALOR UNITARIO.",
    );
  const registros = [];
  const erros = [];
  const codigos = new Set();
  linhas.forEach((linha, n) => {
    if (linha.every((c) => String(c ?? "").trim() === "")) return;
    try {
      if (linha.length !== 4)
        throw new Error("a linha deve ter quatro colunas");
      const [codigo, descricao, unidade, valor] = linha.map((c) =>
        String(c ?? "").trim(),
      );
      if (!codigo || codigo.length > 80)
        throw new Error("informe um código de até 80 caracteres");
      if (!descricao || descricao.length > 120)
        throw new Error("informe uma descrição de até 120 caracteres");
      if (!unidade || unidade.length > 60)
        throw new Error("informe uma unidade de medida de até 60 caracteres");
      if ([codigo, descricao, unidade].some((c) => /^[=+@]/.test(c)))
        throw new Error("fórmulas não são aceitas");
      if (codigos.has(normalizar(codigo)))
        throw new Error("código repetido na planilha");
      const registro = {
        codigo,
        descricao,
        unidade: medidas[normalizar(unidade)] || unidade,
        valor: valorNumerico(valor),
        linha: n + 2,
      };
      codigos.add(normalizar(codigo));
      registros.push(registro);
    } catch (e) {
      erros.push(`Linha ${n + 2}: ${e.message}.`);
    }
  });
  if (registros.length + erros.length > 500)
    throw new Error("Importe até 500 linhas por arquivo.");
  if (!registros.length && !erros.length)
    throw new Error("A planilha não tem itens.");
  return { registros, erros };
}
function xml(texto) {
  const doc = new DOMParser().parseFromString(texto, "application/xml");
  if (doc.querySelector("parsererror"))
    throw new Error("Arquivo Excel inválido.");
  return doc;
}
export function lerXlsx(bytes) {
  let tamanho = 0;
  const arquivos = unzipSync(bytes, {
    filter: (f) => {
      tamanho += f.originalSize;
      if (tamanho > 15 * 1024 * 1024) throw new Error("Planilha muito grande.");
      return /^(xl\/(worksheets\/sheet\d+\.xml|sharedStrings\.xml|workbook\.xml|_rels\/workbook\.xml.rels))$/.test(
        f.name,
      );
    },
  });
  const nomes = Object.keys(arquivos)
    .filter((n) => n.startsWith("xl/worksheets/"))
    .sort();
  if (!nomes.length) throw new Error("O arquivo não contém uma aba de itens.");
  let aba = nomes[0];
  if (arquivos["xl/workbook.xml"] && arquivos["xl/_rels/workbook.xml.rels"]) {
    const folha = xml(strFromU8(arquivos["xl/workbook.xml"])).querySelector(
      "sheet",
    );
    const id = folha?.getAttribute("r:id");
    const rel = [
      ...xml(
        strFromU8(arquivos["xl/_rels/workbook.xml.rels"]),
      ).querySelectorAll("Relationship"),
    ].find((r) => r.getAttribute("Id") === id);
    const destino = rel?.getAttribute("Target");
    if (destino)
      aba = destino.startsWith("/")
        ? destino.slice(1)
        : "xl/" + destino.replace(/^\.\//, "");
  }
  if (!arquivos[aba]) throw new Error("A primeira aba deve conter os itens.");
  const compartilhados = arquivos["xl/sharedStrings.xml"]
    ? [
        ...xml(strFromU8(arquivos["xl/sharedStrings.xml"])).querySelectorAll(
          "si",
        ),
      ].map((si) =>
        [...si.querySelectorAll("t")].map((t) => t.textContent).join(""),
      )
    : [];
  return [
    ...xml(strFromU8(arquivos[aba])).querySelectorAll("sheetData row"),
  ].map((row) => {
    const valores = [];
    for (const cell of row.querySelectorAll("c")) {
      if (cell.querySelector("f"))
        throw new Error(
          `Linha ${row.getAttribute("r")}: substitua fórmulas por valores.`,
        );
      const letras = cell.getAttribute("r")?.match(/^[A-Z]+/)?.[0] || "A";
      let coluna = 0;
      for (const letra of letras)
        coluna = coluna * 26 + letra.charCodeAt(0) - 64;
      const tipo = cell.getAttribute("t");
      const v = cell.querySelector("v")?.textContent ?? "";
      valores[coluna - 1] =
        tipo === "s"
          ? (compartilhados[Number(v)] ?? "")
          : tipo === "inlineStr"
            ? [...cell.querySelectorAll("t")].map((t) => t.textContent).join("")
            : v;
    }
    return Array.from(
      { length: Math.max(4, valores.length) },
      (_, n) => valores[n] ?? "",
    );
  });
}
export async function lerPlanilha(arquivo) {
  if (arquivo.size > 5 * 1024 * 1024)
    throw new Error("Escolha um arquivo de até 5 MB.");
  const ext = arquivo.name.split(".").pop().toLowerCase();
  if (ext === "xlsx")
    return validarLinhas(lerXlsx(new Uint8Array(await arquivo.arrayBuffer())));
  if (ext === "csv") {
    const bytes = await arquivo.arrayBuffer();
    let texto = new TextDecoder("utf-8").decode(bytes);
    if (texto.includes("\uFFFD"))
      texto = new TextDecoder("windows-1252").decode(bytes);
    return validarLinhas(lerCsv(texto));
  }
  throw new Error("Use CSV ou Excel .xlsx. Converta arquivos .xls para .xlsx.");
}
export function baixarModelo(formato) {
  const link=document.createElement('a');
  link.href=`${import.meta.env.BASE_URL}modelos/modelo-itens.${formato}`;
  link.download=`modelo-itens.${formato}`;
  document.body.appendChild(link);link.click();link.remove();
}

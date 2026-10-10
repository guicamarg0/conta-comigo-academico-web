const ASSETS_MARCA = "/marca/conta-comigo-v3";

/** escuro mantém o uso anterior: letras escuras para fundos claros. */
export default function Marca({
  escuro = false,
  className = "",
  variante = "horizontal",
}) {
  const composicao = variante === "compacta" ? "compacta" : "horizontal";
  const cor = escuro ? "principal" : "branca";
  return (
    <img
      className={`logo marca-img ${escuro ? "dark" : ""} ${className}`.trim()}
      src={`${ASSETS_MARCA}/logo-${composicao}-${cor}.svg`}
      alt="Conta Comigo"
      draggable="false"
    />
  );
}

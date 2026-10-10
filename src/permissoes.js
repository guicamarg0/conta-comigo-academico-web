export const gerencia = (modo, usuario) =>
  modo !== "api" || ["ADMIN", "GESTOR"].includes(usuario?.perfil);
export function permiteRota(path, modo, usuario) {
  if (modo !== "api") return true;
  if (path.startsWith("/cadastros/usuarios")) return gerencia(modo, usuario);
  if (path.startsWith("/contratos/novo"))
    return ["ADMIN", "GESTOR", "OPERADOR"].includes(usuario?.perfil);
  if (
    path.startsWith("/cadastros/modelos-contrato/novo") ||
    path.startsWith("/cadastros/modelos-contrato/editar")
  )
    return gerencia(modo, usuario);
  return true;
}

// Os destinos dependem dos vínculos devolvidos pela API, nunca de nomes locais.
export function retornoConvite(valor) {
  if (!valor?.startsWith("/")) return null;
  try {
    const url = new URL(valor, "https://conta-comigo.invalid");
    const codigo = url.searchParams.get("codigo");
    return url.origin === "https://conta-comigo.invalid" &&
      url.pathname === "/convite" &&
      codigo
      ? `/convite?codigo=${encodeURIComponent(codigo)}`
      : null;
  } catch {
    return null;
  }
}

export async function prepararEntrada(
  me,
  selecionar,
  { retorno, unidadeAnterior } = {},
) {
  const unidades = me.unidades || [];
  const convite = retornoConvite(retorno);
  if (convite) return { destino: convite, unidade: null };
  if (me.administradorGeral) {
    const anterior = unidades.find((u) => u.id === unidadeAnterior);
    return anterior
      ? { destino: "/", unidade: await selecionar(anterior.id) }
      : { destino: "/administracao-geral", unidade: null };
  }
  const anterior = unidades.find((u) => u.id === unidadeAnterior);
  if (anterior || unidades.length === 1) {
    const unidade = await selecionar((anterior || unidades[0]).id);
    return { destino: "/", unidade };
  }
  return { destino: "/selecionar-unidade", unidade: null };
}

export function usuarioAutenticado(me, unidade) {
  return {
    nome: me.nome,
    email: me.email,
    administradorGeral: me.administradorGeral === true,
    perfil: unidade?.perfil || "CONSULTA",
  };
}

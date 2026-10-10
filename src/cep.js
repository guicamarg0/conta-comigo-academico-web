const cache = new Map();
export const digitosCep = (valor) => String(valor || "").replace(/\D/g, "");
export const formatarCep = (valor) =>
  digitosCep(valor)
    .slice(0, 8)
    .replace(/^(\d{5})(\d)/, "$1-$2");

export async function consultarCep(valor, { signal, buscar = fetch } = {}) {
  const cep = digitosCep(valor);
  if (!/^\d{8}$/.test(cep)) throw new Error("Informe um CEP com 8 dígitos.");
  if (signal?.aborted)
    throw new DOMException("Consulta cancelada", "AbortError");
  if (cache.has(cep) && buscar === fetch) return { ...cache.get(cep) };
  const controle = new AbortController();
  const cancelar = () => controle.abort();
  signal?.addEventListener("abort", cancelar, { once: true });
  const timer = setTimeout(cancelar, 8000);
  try {
    // Serviço público: envia somente o CEP, sem token, unidade ou credenciais da aplicação.
    const resposta = await buscar(`https://viacep.com.br/ws/${cep}/json/`, {
      signal: controle.signal,
      credentials: "omit",
    });
    if (!resposta.ok)
      throw new Error(
        "Não foi possível consultar o CEP. Preencha o endereço manualmente ou tente novamente.",
      );
    const dados = await resposta.json();
    if (dados.erro)
      throw new Error(
        "CEP não encontrado. Confira o número ou preencha o endereço manualmente.",
      );
    if (
      typeof dados.localidade !== "string" ||
      !/^[A-Z]{2}$/.test(dados.uf || "")
    )
      throw new Error(
        "A consulta não retornou um endereço válido. Preencha manualmente ou tente novamente.",
      );
    const endereco = {
      logradouro: dados.logradouro || "",
      bairro: dados.bairro || "",
      cidade: dados.localidade,
      estado: dados.uf,
    };
    if (buscar === fetch) {
      if (cache.size >= 100) cache.delete(cache.keys().next().value);
      cache.set(cep, endereco);
    }
    return { ...endereco };
  } catch (erro) {
    if (signal?.aborted)
      throw new DOMException("Consulta cancelada", "AbortError");
    if (
      erro instanceof TypeError ||
      erro instanceof SyntaxError ||
      erro.name === "AbortError"
    )
      throw new Error(
        "A consulta de CEP está indisponível. Você pode preencher o endereço manualmente ou tentar novamente.",
      );
    throw erro;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", cancelar);
  }
}

export function aplicarEnderecoCep(atual, original, endereco, cep) {
  if (digitosCep(atual.cep) !== digitosCep(cep)) return atual;
  const novos = { ...atual };
  for (const campo of ["logradouro", "bairro", "cidade", "estado"])
    if ((atual[campo] || "") === (original[campo] || "") && endereco[campo])
      novos[campo] = endereco[campo];
  if (
    (atual.endereco || "") === (original.endereco || "") &&
    endereco.logradouro
  )
    novos.endereco = endereco.logradouro;
  return novos;
}

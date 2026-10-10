import { useEffect, useState } from "react";
import { useDados } from "../context.jsx";
import { PREFIXO_DEMO } from "../demo/armazenamento.js";

export function useCadastroDados(carregar, chave, inicial = []) {
  const { modo, unidade } = useDados();
  const [dados, setDados] = useState(inicial);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(modo === "api");
  const [versao, setVersao] = useState(0);
  const armazenamento = `${PREFIXO_DEMO}${unidade}.${chave}`;
  useEffect(() => {
    let ativo = true;
    setErro("");
    if (modo !== "api") {
      try {
        setDados(JSON.parse(localStorage.getItem(armazenamento)) || inicial);
      } catch {
        setDados(inicial);
      }
      setCarregando(false);
      return;
    }
    setCarregando(true);
    setDados(inicial);
    carregar()
      .then((resultado) => {
        if (ativo) setDados(resultado);
      })
      .catch((e) => {
        if (ativo) setErro(e.message);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [carregar, modo, armazenamento, versao]);
  const salvarDemo = (novos) => {
    localStorage.setItem(armazenamento, JSON.stringify(novos));
    setDados(novos);
    window.dispatchEvent(new Event("ederflexo:dados-alterados"));
  };
  return {
    dados,
    setDados,
    erro,
    setErro,
    carregando,
    recarregar: () => setVersao((v) => v + 1),
    salvarDemo,
    apiMode: modo === "api",
  };
}

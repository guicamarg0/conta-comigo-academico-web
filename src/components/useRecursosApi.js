import { useCallback, useEffect, useRef, useState } from "react";
export function useRecursosApi(carregadores, chave) {
  const funcoes = useRef(carregadores);
  funcoes.current = carregadores;
  const geracao = useRef(0),
    pedidos = useRef({});
  const [recursos, setRecursos] = useState(() =>
    Object.fromEntries(
      Object.keys(carregadores).map((nome) => [
        nome,
        { dados: null, carregando: true, erro: "" },
      ]),
    ),
  );
  const carregar = useCallback(async (nome) => {
    const epoca = geracao.current,
      pedido = (pedidos.current[nome] || 0) + 1;
    pedidos.current[nome] = pedido;
    setRecursos((atual) => ({
      ...atual,
      [nome]: { ...atual[nome], carregando: true, erro: "" },
    }));
    try {
      const dados = await funcoes.current[nome]();
      if (epoca === geracao.current && pedidos.current[nome] === pedido)
        setRecursos((atual) => ({
          ...atual,
          [nome]: { dados, carregando: false, erro: "" },
        }));
    } catch (e) {
      if (epoca === geracao.current && pedidos.current[nome] === pedido)
        setRecursos((atual) => ({
          ...atual,
          [nome]: { ...atual[nome], carregando: false, erro: e.message },
        }));
    }
  }, []);
  useEffect(() => {
    geracao.current++;
    setRecursos(
      Object.fromEntries(
        Object.keys(funcoes.current).map((nome) => [
          nome,
          { dados: null, carregando: true, erro: "" },
        ]),
      ),
    );
    Object.keys(funcoes.current).forEach(carregar);
    return () => {
      geracao.current++;
    };
  }, [chave, carregar]);
  return { recursos, recarregar: carregar };
}

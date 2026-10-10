import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  agendaInicial,
  clientesIniciais,
  contratosIniciais,
  maoObraIniciais,
  modelosContratoIniciais,
  orcamentosIniciais,
  pecasIniciais,
  servicosIniciais,
} from "./data.js";
import { lerDemo, gravarDemo, limparDemo } from "./demo/armazenamento.js";

const DadosContexto = createContext(null);
export const useDados = () => useContext(DadosContexto);
const ler = (chave, base) => {
  try {
    return lerDemo(localStorage, chave, base);
  } catch {
    return base;
  }
};
export function DadosProvider({ children }) {
  const [clientes, setClientes] = useState(() =>
    ler("clientes", clientesIniciais),
  );
  const [orcamentos, setOrcamentos] = useState(() =>
    ler("orcamentos", orcamentosIniciais).map((o) => ({
      ...o,
      status: o.status === "Enviado" ? "Emitido" : o.status,
    })),
  );
  const [contratos, setContratos] = useState(() =>
    ler("contratos", contratosIniciais),
  );
  const [modelosContrato, setModelosContrato] = useState(() =>
    ler("modelosContrato", modelosContratoIniciais),
  );
  const [servicos, setServicos] = useState(() =>
    ler("servicos", servicosIniciais),
  );
  const [pecas, setPecas] = useState(() => ler("pecas", pecasIniciais));
  const [maoObra, setMaoObra] = useState(() => ler("maoObra", maoObraIniciais));
  const [agenda, setAgenda] = useState(() => ler("agenda", agendaInicial));
  const [avisos, setAvisos] = useState([]);
  const removerAviso = useCallback(
    (id) => setAvisos((atual) => atual.filter((a) => a.id !== id)),
    [],
  );
  const setToast = useCallback((aviso) => {
    if (!aviso) {
      setAvisos((atual) => atual.slice(1));
      return;
    }
    const item =
      typeof aviso === "string"
        ? { mensagem: aviso, tipo: "sucesso" }
        : aviso instanceof Error
          ? { mensagem: aviso.message, tipo: "erro" }
          : aviso;
    setAvisos((atual) =>
      atual.some((a) => a.mensagem === item.mensagem && a.tipo === item.tipo)
        ? atual
        : [...atual, { tipo: "sucesso", ...item, id: crypto.randomUUID() }],
    );
  }, []);
  const [usuario, setUsuario] = useState(() =>
    sessionStorage.getItem("ederflexo.token")
      ? { nome: "", email: "", perfil: "CONSULTA" }
      : ler("usuario", {
          nome: "Pessoa da demonstração",
          email: "usuario@exemplo.test",
          perfil: "Administrador",
        }),
  );
  const [unidade, setUnidade] = useState(() =>
    ler("unidade", "Unidade de demonstração"),
  );
  const [unidades, setUnidades] = useState([]);
  const [modo, setModoAtual] = useState(() =>
    sessionStorage.getItem("ederflexo.token") ? "api" : "demo",
  );
  const colecoes = {
    clientes,
    orcamentos,
    contratos,
    modelosContrato,
    servicos,
    pecas,
    maoObra,
    agenda,
  };
  const setters = {
    clientes: setClientes,
    orcamentos: setOrcamentos,
    contratos: setContratos,
    modelosContrato: setModelosContrato,
    servicos: setServicos,
    pecas: setPecas,
    maoObra: setMaoObra,
    agenda: setAgenda,
  };
  useEffect(() => {
    if (modo !== "demo") return;
    Object.entries(colecoes).forEach(([chave, valor]) =>
      gravarDemo(localStorage, chave, valor),
    );
  }, [
    clientes,
    orcamentos,
    contratos,
    modelosContrato,
    servicos,
    pecas,
    maoObra,
    agenda,
    modo,
  ]);
  useEffect(() => {
    if (modo !== "demo") return;
    gravarDemo(localStorage, "usuario", usuario);
    gravarDemo(localStorage, "unidade", unidade);
  }, [usuario, unidade, modo]);
  const usuarioDemo = {
    nome: "Usuário de demonstração",
    email: "demo@example.com",
    perfil: "Administrador",
  };
  const setModo = (valor) => {
    if (valor === "demo" && modo !== "demo") {
      setUsuario(ler("usuario", usuarioDemo));
      setUnidade(ler("unidade", "Unidade de demonstração"));
    }
    setModoAtual(valor);
  };
  const restaurarDemo = () => {
    if (modo !== "demo") return;
    const bases = {
      clientes: clientesIniciais,
      orcamentos: orcamentosIniciais,
      contratos: contratosIniciais,
      modelosContrato: modelosContratoIniciais,
      servicos: servicosIniciais,
      pecas: pecasIniciais,
      maoObra: maoObraIniciais,
      agenda: agendaInicial,
    };
    limparDemo(localStorage, [...Object.keys(bases), "usuario", "unidade"]);
    Object.entries(bases).forEach(([chave, valor]) =>
      setters[chave](structuredClone(valor)),
    );
    setUsuario(usuarioDemo);
    setUnidade("Unidade de demonstração");
    setToast("Demonstração restaurada.");
    window.dispatchEvent(new Event("ederflexo:dados-alterados"));
  };
  const salvar = (tipo, item, campo = "id") =>
    setters[tipo]((atual) => {
      const existe = atual.some((registro) => registro[campo] === item[campo]);
      return existe
        ? atual.map((registro) =>
            registro[campo] === item[campo]
              ? { ...registro, ...item }
              : registro,
          )
        : [item, ...atual];
    });
  const valor = {
    ...colecoes,
    salvar,
    restaurarDemo,
    toast: avisos[0]?.mensagem || "",
    avisos,
    removerAviso,
    setToast,
    usuario,
    setUsuario,
    unidade,
    setUnidade,
    unidades,
    setUnidades,
    modo,
    setModo,
  };
  return (
    <DadosContexto.Provider value={valor}>{children}</DadosContexto.Provider>
  );
}

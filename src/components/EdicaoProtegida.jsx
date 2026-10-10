import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useBlocker, UNSAFE_DataRouterContext } from "react-router-dom";
import { Modal } from "../components.jsx";
const Contexto = createContext({
  registrar: () => () => {},
  confirmar: async () => true,
});
function BloqueioRotas({ alterado, confirmar }) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !(
        !sessionStorage.getItem("ederflexo.token") &&
        nextLocation.pathname === "/login"
      ) &&
      alterado() &&
      (currentLocation.pathname !== nextLocation.pathname ||
        currentLocation.search !== nextLocation.search),
  );
  useEffect(() => {
    if (blocker.state === "blocked")
      confirmar().then((ok) => (ok ? blocker.proceed() : blocker.reset()));
  }, [blocker, confirmar]);
  return null;
}
export function EdicaoProvider({ children }) {
  const registros = useRef(new Map()),
    pendente = useRef(null);
  const [pergunta, setPergunta] = useState(false);
  const alterado = useCallback(
    () => [...registros.current.values()].some((fn) => fn()),
    [],
  );
  const registrar = useCallback((id, fn) => {
    registros.current.set(id, fn);
    return () => registros.current.delete(id);
  }, []);
  const confirmar = useCallback(
    () =>
      new Promise((resolve) => {
        if (pendente.current) return resolve(false);
        pendente.current = resolve;
        setPergunta(true);
      }),
    [],
  );
  const responder = (ok) => {
    setPergunta(false);
    const resolver = pendente.current;
    pendente.current = null;
    resolver?.(ok);
  };
  useEffect(() => {
    const sair = (e) => {
      if (alterado()) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", sair);
    return () => window.removeEventListener("beforeunload", sair);
  }, [alterado]);
  const dataRouter = useContext(UNSAFE_DataRouterContext);
  return (
    <Contexto.Provider value={{ registrar, confirmar }}>
      {dataRouter && (
        <BloqueioRotas alterado={alterado} confirmar={confirmar} />
      )}{" "}
      {children}
      {pergunta && (
        <Modal
          title="Descartar alterações?"
          proteger={false}
          onClose={() => responder(false)}
          footer={
            <>
              <button className="btn outline" onClick={() => responder(false)}>
                Continuar editando
              </button>
              <button
                className="btn danger-outline"
                onClick={() => responder(true)}
              >
                Descartar alterações
              </button>
            </>
          }
        >
          <p>
            Há alterações que ainda não foram salvas. Ao sair, elas serão
            perdidas.
          </p>
        </Modal>
      )}
    </Contexto.Provider>
  );
}
export function useEdicaoProtegida(valor, ativo = true) {
  const { registrar } = useContext(Contexto),
    id = useRef(Symbol()),
    base = useRef(null),
    atual = useRef(""),
    ligado = useRef(false);
  atual.current = JSON.stringify(valor);
  ligado.current = ativo;
  if (ativo && base.current === null) base.current = atual.current;
  useEffect(
    () =>
      registrar(
        id.current,
        () =>
          ligado.current &&
          base.current !== null &&
          base.current !== atual.current,
      ),
    [registrar],
  );
  const confirmarSalvo = useCallback((novo) => {
    base.current = novo === undefined ? atual.current : JSON.stringify(novo);
    if (novo !== undefined) atual.current = base.current;
  }, []);
  return confirmarSalvo;
}
export const useConfirmarDescarte = () => useContext(Contexto).confirmar;
export function useRegistrarEdicao(alterado) {
  const { registrar } = useContext(Contexto),
    id = useRef(Symbol()),
    verificar = useRef(alterado);
  verificar.current = alterado;
  useEffect(
    () => registrar(id.current, () => verificar.current()),
    [registrar],
  );
}

import React, { useEffect, useState } from "react";
import { Card, Field, PageHeading } from "../components.jsx";
import { useDados } from "../context.jsx";
import { api } from "../api.js";
import { AvisoErro } from "../components/Feedback.jsx";
import { useEdicaoProtegida } from "../components/EdicaoProtegida.jsx";
import { gerencia } from "../permissoes.js";
import { PREFIXO_DEMO } from "../demo/armazenamento.js";
const padrao = {
  prefixoOrcamento: "ORC",
  digitosOrcamento: 1,
  prefixoPeca: "PC",
  separadorPeca: "-",
  digitosPeca: 4,
};
export function ConfiguracoesConectadas() {
  const { modo, unidade, usuario, setToast } = useDados();
  const [config, setConfig] = useState(padrao),
    [erro, setErro] = useState(""),
    [carregando, setCarregando] = useState(true),
    [versao, setVersao] = useState(0),
    [salvando, setSalvando] = useState(false),
    [carregado, setCarregado] = useState(false);
  const confirmarSalvo = useEdicaoProtegida(config, !carregando),
    podeEditar = gerencia(modo, usuario);
  const chave = `${PREFIXO_DEMO}${unidade}.codigos`;
  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setCarregado(false);
    setErro("");
    const carregar =
      modo === "api"
        ? api.codigosUnidade()
        : Promise.resolve().then(() => ({
            ...padrao,
            ...JSON.parse(localStorage.getItem(chave) || "{}"),
          }));
    carregar
      .then((d) => {
        if (ativo) {
          setConfig(d);
          setCarregado(true);
          confirmarSalvo(d);
        }
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
  }, [modo, chave, versao, confirmarSalvo]);
  const alterar = (chave, valor) =>
    setConfig((atual) => ({ ...atual, [chave]: valor }));
  const exemplo = (tipo) =>
    tipo === "orcamento"
      ? `${config.prefixoOrcamento}-${String(1).padStart(Number(config.digitosOrcamento) || 1, "0")}`
      : `${config.prefixoPeca}${config.separadorPeca}${String(1).padStart(Number(config.digitosPeca) || 1, "0")}`;
  async function salvar(e) {
    e.preventDefault();
    if (salvando) return;
    setSalvando(true);
    setErro("");
    try {
      const dados = {
        ...config,
        digitosOrcamento: Number(config.digitosOrcamento),
        digitosPeca: Number(config.digitosPeca),
      };
      const salvo =
        modo === "api" ? await api.salvarCodigosUnidade(dados) : dados;
      if (modo !== "api") localStorage.setItem(chave, JSON.stringify(salvo));
      setConfig(salvo);
      confirmarSalvo(salvo);
      window.dispatchEvent(new Event("ederflexo:dados-alterados"));
      setToast("Padrões de códigos salvos para esta unidade.");
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  }
  return (
    <>
      <PageHeading
        title="Configurações"
        subtitle={`Padrões de códigos · ${unidade}`}
      />
      <AvisoErro
        erro={erro}
        onRetry={!carregado ? () => setVersao((v) => v + 1) : undefined}
      />
      {carregando ? (
        <p role="status">Carregando configurações...</p>
      ) : (
        <Card title="Códigos automáticos">
          <p className="muted">
            Aplicados aos próximos orçamentos e itens sem código informado. Os
            códigos existentes são preservados; a sequência não reinicia ao
            mudar o formato.
          </p>
          {!podeEditar && (
            <p>
              Seu perfil permite consultar os padrões. Para alterar, fale com um
              gestor.
            </p>
          )}
          <form onSubmit={salvar} aria-busy={salvando}>
            <fieldset disabled={!podeEditar || salvando || !carregado}>
              <div className="settings-code-grid">
                {["Orçamento", "Peça"].map((titulo) => {
                  const tipo = titulo === "Orçamento" ? "Orcamento" : "Peca";
                  return (
                    <section key={tipo}>
                      <h3>
                        {titulo === "Orçamento"
                          ? "Orçamentos"
                          : "Peças e itens do catálogo"}
                      </h3>
                      <div className="form-grid">
                        <Field label={`Prefixo de ${titulo.toLowerCase()} *`}>
                          <input
                            name={`prefixo${tipo}`}
                            maxLength={10}
                            pattern="[A-Z][A-Z0-9]{0,9}"
                            title="Comece por uma letra e use até 10 letras maiúsculas ou números."
                            value={config[`prefixo${tipo}`]}
                            onChange={(e) =>
                              alterar(
                                `prefixo${tipo}`,
                                e.target.value.toUpperCase(),
                              )
                            }
                          />
                        </Field>
                        {tipo === "Peca" && (
                          <Field label="Separador">
                            <input
                              name="separadorPeca"
                              maxLength={3}
                              pattern="[-_.]{0,3}"
                              title="Use até três separadores: hífen, ponto ou sublinhado."
                              value={config.separadorPeca}
                              onChange={(e) =>
                                alterar("separadorPeca", e.target.value)
                              }
                            />
                          </Field>
                        )}
                        <Field label={`Dígitos de ${titulo.toLowerCase()} *`}>
                          <input
                            name={`digitos${tipo}`}
                            type="number"
                            min={1}
                            max={8}
                            step={1}
                            value={config[`digitos${tipo}`]}
                            onChange={(e) =>
                              alterar(`digitos${tipo}`, e.target.value)
                            }
                          />
                        </Field>
                      </div>
                      <p className="notice info">
                        Exemplo de formato:{" "}
                        <strong>
                          {exemplo(tipo === "Orcamento" ? "orcamento" : "peca")}
                        </strong>
                      </p>
                    </section>
                  );
                })}
              </div>
              {podeEditar && (
                <div className="form-actions">
                  <button className="btn primary" type="submit">
                    {salvando ? "Salvando..." : "Salvar padrões"}
                  </button>
                </div>
              )}
            </fieldset>
          </form>
        </Card>
      )}
    </>
  );
}

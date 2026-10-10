import React, { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useDados } from "../context.jsx";
import { Card, PageHeading } from "../components.jsx";

export function AdministracaoGeralPage() {
  const { usuario, modo, setUsuario, setUnidade, setUnidades, setToast } =
    useDados();
  const navigate = useNavigate();
  const [unidades, setLista] = useState([]);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const inicial = {
    nome: "",
    nomeAdministrador: "",
    emailAdministrador: "",
    senhaAdministrador: "",
  };
  const [form, setForm] = useState(inicial);
  async function carregar() {
    const lista = await api.unidadesGerais();
    setLista(lista);
    setUnidades(lista);
  }
  useEffect(() => {
    if (modo !== "api" || !usuario.administradorGeral) return;
    carregar()
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, [modo, usuario.administradorGeral]);
  if (modo !== "api" || !sessionStorage.getItem("ederflexo.token"))
    return <Navigate to="/login" replace />;
  if (!usuario.administradorGeral) return <Navigate to="/" replace />;
  async function criar(e) {
    e.preventDefault();
    setErro("");
    setOcupado(true);
    try {
      await api.criarUnidadeGeral({
        ...form,
        senhaAdministrador: form.senhaAdministrador || null,
      });
      setForm(inicial);
      setToast("Unidade criada e administrador definido.");
      await carregar();
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setOcupado(false);
    }
  }
  async function acessar(unidade) {
    setErro("");
    setOcupado(true);
    try {
      const escolhida = await api.selecionarUnidade(unidade.id);
      sessionStorage.setItem("ederflexo.unidadeId", escolhida.id);
      setUnidade(escolhida.nome);
      setUsuario((u) => ({ ...u, perfil: "ADMIN" }));
      navigate("/");
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setOcupado(false);
    }
  }
  return (
    <>
      <PageHeading
        title="Administração geral"
        subtitle="Crie unidades, defina administradores e gerencie cada unidade."
      />
      {erro && (
        <p role="alert" className="form-error">
          {erro}
        </p>
      )}
      <Card title="Unidades">
        {carregando ? (
          <p role="status">Carregando unidades…</p>
        ) : unidades.length === 0 ? (
          <p>Nenhuma unidade cadastrada. Crie a primeira abaixo.</p>
        ) : (
          <div className="global-unit-list">
            {unidades.map((u) => (
              <div key={u.id} className="global-unit-row">
                <strong>{u.nome}</strong>
                <button
                  disabled={ocupado}
                  className="btn outline"
                  onClick={() => acessar(u)}
                >
                  Acessar unidade
                </button>
              </div>
            ))}
          </div>
        )}
        <p>
          Ao acessar uma unidade, use Cadastros → Usuários para definir, alterar
          ou inativar seus administradores e equipe.
        </p>
      </Card>
      <Card title="Criar unidade e definir administrador">
        <form onSubmit={criar} className="global-unit-form">
          <label>
            Nome da unidade
            <input
              required
              maxLength={120}
              value={form.nome}
              onChange={(e) => setForm((v) => ({ ...v, nome: e.target.value }))}
            />
          </label>
          <label>
            Nome do administrador
            <input
              required
              maxLength={120}
              value={form.nomeAdministrador}
              onChange={(e) =>
                setForm((v) => ({ ...v, nomeAdministrador: e.target.value }))
              }
            />
          </label>
          <label>
            E-mail do administrador
            <input
              required
              type="email"
              maxLength={254}
              value={form.emailAdministrador}
              onChange={(e) =>
                setForm((v) => ({ ...v, emailAdministrador: e.target.value }))
              }
            />
          </label>
          <label>
            Senha inicial para conta nova
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              value={form.senhaAdministrador}
              onChange={(e) =>
                setForm((v) => ({ ...v, senhaAdministrador: e.target.value }))
              }
            />
          </label>
          <p>
            Para vincular uma conta já cadastrada, deixe a senha vazia. O acesso
            geral permanece exclusivo da sua conta.
          </p>
          <button disabled={ocupado} className="btn primary" type="submit">
            {ocupado ? "Aguarde…" : "Criar unidade"}
          </button>
        </form>
      </Card>
    </>
  );
}

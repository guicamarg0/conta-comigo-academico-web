import { gerencia } from "../permissoes.js";
import { SelectPesquisavel } from "../components/SelectPesquisavel";
import React, { useState } from "react";
import { Users, Link } from "lucide-react";
import { api } from "../api.js";
import { useDados } from "../context.jsx";
import { Field, Modal, SelectFilter } from "../components.jsx";
import { CadastroLista } from "../components/CadastroLista.jsx";
import { useCadastroDados } from "../components/useCadastroDados.js";
const vazio = { nome: "", email: "", senha: "", perfil: "OPERADOR" };
const perfis = {
  ADMIN: "Administrador",
  GESTOR: "Gestor",
  OPERADOR: "Usuário",
  CONSULTA: "Consulta",
};
export function UsuariosPage() {
  const dados = useCadastroDados(api.listarUsuarios, "usuarios"),
    lista = dados.dados;
  const { usuario, setToast } = useDados();
  const podeEditar = gerencia(dados.apiMode ? "api" : "demo", usuario);
  const [busca, setBusca] = useState(""),
    [status, setStatus] = useState("ATIVO"),
    [perfil, setPerfil] = useState(""),
    [selecionado, setSelecionado] = useState(null),
    [modal, setModal] = useState(false),
    [convite, setConvite] = useState(false),
    [perfilConvite, setPerfilConvite] = useState("OPERADOR"),
    [link, setLink] = useState(""),
    [form, setForm] = useState(vazio),
    [salvando, setSalvando] = useState(false);
  const erro = dados.erro,
    setErro = dados.setErro;
  const visiveis = lista.filter(
    (u) =>
      `${u.nome} ${u.email}`.toLowerCase().includes(busca.toLowerCase()) &&
      (!perfil || u.perfil === perfil) &&
      (!status || (u.ativa !== false ? "ATIVO" : "INATIVO") === status),
  );
  const abrir = (item) => {
    setForm(item ? { ...item, senha: "" } : { ...vazio });
    setErro("");
    setModal(true);
  };
  async function salvar(e) {
    e.preventDefault();
    if (salvando) return;
    setSalvando(true);
    setErro("");
    try {
      const salvo = dados.apiMode
        ? await (form.id
            ? api.atualizarUsuario(form.id, {
                nome: form.nome,
                email: form.email,
                perfil: form.perfil,
              })
            : api.criarUsuarioUnidade(form))
        : {
            id: form.id || crypto.randomUUID(),
            nome: form.nome,
            email: form.email,
            perfil: form.perfil,
            ativa: form.ativa !== false,
          };
      const novas = form.id
        ? lista.map((u) => (u.id === salvo.id ? salvo : u))
        : [...lista, salvo];
      if (dados.apiMode) dados.setDados(novas);
      else dados.salvarDemo(novas);
      setSelecionado(salvo);
      setModal(false);
      setForm({ ...vazio });
      setToast("Usuário salvo com sucesso.");
    } catch (f) {
      setErro(f.message);
    } finally {
      setSalvando(false);
    }
  }
  async function inativar() {
    if (salvando) return;
    setSalvando(true);
    setErro("");
    try {
      const ativa = selecionado.ativa === false;
      if (dados.apiMode) {
        if (ativa) await api.reativarUsuario(selecionado.id);
        else await api.desativarUsuario(selecionado.id);
      }
      const novas = lista.map((u) =>
        u.id === selecionado.id ? { ...u, ativa } : u,
      );
      if (dados.apiMode) dados.setDados(novas);
      else dados.salvarDemo(novas);
      setSelecionado(null);
      setToast(ativa ? "Acesso reativado." : "Acesso inativado.");
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  }
  async function gerarConvite() {
    if (salvando) return;
    setSalvando(true);
    setErro("");
    try {
      const criado = await api.criarConvite(perfilConvite);
      setLink(
        `${window.location.origin}/convite?codigo=${encodeURIComponent(criado.codigoConvite)}`,
      );
    } catch (f) {
      setErro(f.message);
    } finally {
      setSalvando(false);
    }
  }
  async function recuperarSenha() {
    if (salvando) return;
    setSalvando(true);
    setErro("");
    try {
      if (!dados.apiMode)
        throw new Error(
          "O envio de e-mails está disponível ao conectar à API.",
        );
      await api.enviarRecuperacaoUsuario(selecionado.id);
      setToast(
        "Solicitação de redefinição enviada. Confira o e-mail do usuário.",
      );
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  }
  return (
    <>
      <CadastroLista
        onRetry={dados.recarregar}
        titulo="Usuários"
        descricao="Gerencie quem pode acessar esta unidade."
        novoTexto="Novo usuário"
        onNovo={podeEditar ? () => abrir() : undefined}
        icone={Users}
        acaoExtra={
          podeEditar &&
          dados.apiMode && (
            <button
              className="btn outline"
              onClick={() => {
                setErro("");
                setLink("");
                setConvite(true);
              }}
            >
              <Link size={16} />
              Gerar convite
            </button>
          )
        }
        indicadores={[
          { label: "Usuários com acesso", value: lista.length },
          {
            label: "Administradores e gestores",
            value: lista.filter((u) => ["ADMIN", "GESTOR"].includes(u.perfil))
              .length,
            tone: "green",
          },
          {
            label: "Usuários operacionais",
            value: lista.filter((u) => u.perfil === "OPERADOR").length,
          },
          {
            label: "Somente consulta",
            value: lista.filter((u) => u.perfil === "CONSULTA").length,
          },
        ]}
        rows={visiveis}
        busca={busca}
        setBusca={setBusca}
        placeholder="Buscar por nome ou e-mail..."
        filtros={
          <>
            <SelectFilter
              label="Status"
              valorPadrao="ATIVO"
              value={status}
              onChange={setStatus}
              options={[
                "Todos",
                { value: "ATIVO", label: "Ativos" },
                { value: "INATIVO", label: "Inativos" },
              ]}
            />
            <SelectFilter
              label="Perfil"
              value={perfil}
              onChange={setPerfil}
              options={[
                "Todos",
                ...Object.entries(perfis).map(([value, label]) => ({
                  value,
                  label,
                })),
              ]}
            />
          </>
        }
        columns={[
          {
            key: "nome",
            label: "Nome",
            render: (u) => <strong>{u.nome}</strong>,
          },
          { key: "email", label: "E-mail" },
          { key: "perfil", label: "Perfil", render: (u) => perfis[u.perfil] },
          {
            key: "ativa",
            label: "Status",
            render: (u) => (u.ativa === false ? "Inativo" : "Ativo"),
          },
        ]}
        selecionado={selecionado}
        setSelecionado={setSelecionado}
        nome={selecionado?.nome}
        status={selecionado?.ativa === false ? "Inativo" : "Ativo"}
        detalhes={
          selecionado
            ? [
                ["Nome", selecionado.nome],
                ["E-mail", selecionado.email],
                ["Perfil", perfis[selecionado.perfil]],
                [
                  "Acesso",
                  selecionado.ativa === false
                    ? "Inativado nesta unidade"
                    : "Habilitado nesta unidade",
                ],
              ]
            : []
        }
        rodape={
          podeEditar &&
          (!dados.apiMode ||
            usuario.perfil === "ADMIN" ||
            selecionado?.perfil !== "ADMIN") && (
            <>
              <button
                className="btn danger-outline"
                disabled={salvando}
                data-salvando={salvando || undefined}
                onClick={inativar}
              >
                {selecionado?.ativa === false
                  ? "Reativar acesso"
                  : "Inativar acesso"}
              </button>
              <button
                className="btn primary"
                disabled={salvando || selecionado?.ativa === false}
                onClick={() => abrir(selecionado)}
              >
                Editar usuário
              </button>
              {selecionado?.ativa !== false && (
                <button
                  className="btn outline"
                  disabled={salvando}
                  data-salvando={salvando || undefined}
                  onClick={recuperarSenha}
                >
                  Enviar link de redefinição
                </button>
              )}
            </>
          )
        }
        erro={!modal && !convite ? erro : ""}
        carregando={dados.carregando}
      />
      {modal && (
        <Modal
          busy={salvando}
          title={form.id ? "Editar usuário" : "Novo usuário"}
          onClose={() => setModal(false)}
          footer={
            <>
              <button className="btn outline" onClick={() => setModal(false)}>
                Cancelar
              </button>
              <button
                className="btn primary"
                form="usuario-form"
                disabled={salvando}
                data-salvando={salvando || undefined}
              >
                {salvando ? "Salvando..." : "Salvar usuário"}
              </button>
            </>
          }
        >
          <form id="usuario-form" className="form-grid" onSubmit={salvar}>
            <Field label="Nome *">
              <input
                required
                value={form.nome}
                placeholder="Nome completo"
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
              />
            </Field>
            <Field label="E-mail *">
              <input
                required
                type="email"
                value={form.email}
                placeholder="usuario@example.com"
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            {!form.id && (
              <Field label="Senha temporária *">
                <input
                  required
                  type="password"
                  minLength="8"
                  value={form.senha}
                  placeholder="Mínimo de 8 caracteres"
                  onChange={(e) => setForm({ ...form, senha: e.target.value })}
                />
              </Field>
            )}
            <Field label="Perfil *">
              <SelectPesquisavel
                value={form.perfil}
                onChange={(e) => setForm({ ...form, perfil: e.target.value })}
              >
                {Object.entries(perfis)
                  .filter(
                    ([id]) =>
                      !dados.apiMode ||
                      usuario.perfil === "ADMIN" ||
                      id !== "ADMIN",
                  )
                  .map(([id, nome]) => (
                    <option key={id} value={id}>
                      {nome}
                    </option>
                  ))}
              </SelectPesquisavel>
            </Field>
            {erro && (
              <p className="inline-error" role="alert">
                {erro}
              </p>
            )}
          </form>
        </Modal>
      )}
      {convite && (
        <Modal
          title="Gerar convite de acesso"
          onClose={() => setConvite(false)}
          footer={
            <>
              <button className="btn outline" onClick={() => setConvite(false)}>
                Fechar
              </button>
              <button
                className="btn primary"
                onClick={gerarConvite}
                disabled={salvando}
                data-salvando={salvando || undefined}
              >
                Gerar link
              </button>
            </>
          }
        >
          <Field label="Perfil">
            <SelectPesquisavel
              value={perfilConvite}
              onChange={(e) => setPerfilConvite(e.target.value)}
            >
              {Object.entries(perfis)
                .filter(
                  ([id]) =>
                    !dados.apiMode ||
                    usuario.perfil === "ADMIN" ||
                    id !== "ADMIN",
                )
                .map(([id, nome]) => (
                  <option key={id} value={id}>
                    {nome}
                  </option>
                ))}
            </SelectPesquisavel>
          </Field>
          {link && (
            <Field label="Link de acesso">
              <input readOnly value={link} />
            </Field>
          )}
          {erro && (
            <p className="inline-error" role="alert">
              {erro}
            </p>
          )}
        </Modal>
      )}
    </>
  );
}

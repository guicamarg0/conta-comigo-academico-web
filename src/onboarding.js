export const etapasOnboarding = [
  {
    nome: "Empresa",
    rota: "/cadastros/empresas",
    descricao:
      "Cadastre uma empresa ativa. Seus dados e a logo serão usados nos documentos.",
    gestor: true,
  },
  {
    nome: "Forma de pagamento",
    rota: "/cadastros/formas-pagamento",
    descricao:
      "Adicione uma forma de pagamento ativa para reutilizar suas condições.",
    gestor: true,
  },
  {
    nome: "Configurações",
    rota: "/configuracoes",
    descricao: "Revise e salve os padrões de códigos da unidade.",
    gestor: true,
  },
  {
    nome: "Modelo de contrato",
    rota: "/cadastros/modelos-contrato",
    descricao:
      "Publique um modelo com o texto e as variáveis dos seus contratos.",
    gestor: true,
  },
  {
    nome: "Clientes e itens",
    rota: "/clientes",
    descricao:
      "Cadastre um cliente e um item do catálogo. Itens manuais continuam disponíveis.",
    alternativa: "/pecas",
    alternativaNome: "Abrir catálogo",
  },
  {
    nome: "Primeiro orçamento",
    rota: "/orcamentos/novo",
    descricao:
      "Salve seu primeiro orçamento. Um rascunho também conta e permite gerar PDF.",
  },
  {
    nome: "Primeiro contrato",
    rota: "/contratos/novo",
    descricao: "Gere e salve um contrato a partir de um orçamento aprovado.",
    gestor: true,
  },
  {
    nome: "Primeiro serviço",
    rota: "/servicos",
    descricao: "Cadastre seu primeiro serviço e informe o período programado.",
  },
];
export function resumoOnboarding(etapas = []) {
  const concluidas = etapasOnboarding.map((_, i) => etapas[i] === true);
  const quantidade = concluidas.filter(Boolean).length;
  return {
    concluidas,
    quantidade,
    percentual: Math.round((quantidade / etapasOnboarding.length) * 100),
    atual: concluidas.findIndex((v) => !v),
    completo: quantidade === etapasOnboarding.length,
  };
}
export function combinarEtapas(anteriores, novas) {
  return etapasOnboarding.map(
    (_, i) => anteriores?.[i] === true || novas?.[i] === true,
  );
}
export function etapasDemo(dados, unidade, ler) {
  const empresas = ler("empresas", []),
    formas = ler("formasPagamento", {}).formasRecebimento || [];
  return [
    empresas.some((e) => e.ativo !== false),
    formas.some((f) => f.ativa !== false),
    Boolean(ler("codigos", null)),
    dados.modelosContrato.some((m) =>
      ["Publicado", "PUBLICADO"].includes(m.status),
    ),
    dados.clientes.some((c) => c.ativo !== false) &&
      dados.pecas.some((p) => p.ativo !== false),
    dados.orcamentos.length > 0,
    dados.contratos.length > 0,
    dados.servicos.length > 0,
  ];
}

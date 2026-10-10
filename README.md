# Conta Comigo — frontend acadêmico

Interface React do sistema acadêmico para orçamentos, contratos e serviços. Esta é uma cópia independente do código atual, com histórico próprio e configuração local, sem credenciais ou dados do ambiente original.

## Executar o sistema completo

Instale Git e Docker Desktop (ou Docker Engine + Compose v2). Mantenha os dois clones lado a lado:

```sh
git clone https://github.com/guicamarg0/conta-comigo-academico-api.git
git clone https://github.com/guicamarg0/conta-comigo-academico-web.git
cd conta-comigo-academico-api
cp .env.example .env
docker compose up --build -d --wait --wait-timeout 300
```

No PowerShell, substitua `cp .env.example .env` por `Copy-Item .env.example .env`.

Abra http://localhost:3000. Com os valores fictícios do exemplo, use `admin@academico.test` e `Academico-local-2026!`, crie uma unidade e siga os cadastros iniciais. Essas credenciais são exclusivas da demonstração local.

O Compose principal da API sobe banco, backend e interface e persiste os dados em um volume próprio. Consulte o [README da API](https://github.com/guicamarg0/conta-comigo-academico-api#readme) para trocar portas, parar serviços, reiniciar ou apagar o banco acadêmico local.

## Rodar somente a interface no Docker

Se a API já estiver rodando no host na porta 8080:

```sh
docker compose up --build -d
```

Este Compose sobe apenas o frontend e usa `host.docker.internal:8080` como destino da API. `API_UPSTREAM` e `WEB_PORT` podem ser definidos por ambiente para mudar o destino e a porta. Ele não cria banco nem backend. Evite iniciar os dois Composes de frontend ao mesmo tempo na mesma porta.

## Desenvolvimento com Vite

Requer Node 22.12 ou superior dentro da série 22 suportada pelo Vite e npm:

```sh
cp .env.example .env
npm ci
npm run dev
```

Abra http://localhost:3000. O Vite encaminha `/api` para a API local em `http://localhost:8080`. Ajuste `VITE_API_PROXY_TARGET` se necessário. A demonstração fictícia pode ser explorada sem conectar o banco; os fluxos reais exigem a API.

```sh
npm test
npm run build
npm run preview
```

Não abra `index.html` pelo sistema de arquivos: o projeto depende do servidor, das rotas e do build. Variáveis `VITE_*` são públicas no navegador e não devem conter segredos.

## Estrutura

- `src`: páginas, componentes, módulos conectados, cliente HTTP e lógica da demonstração.
- `test`, `tests` e testes em `src`: validação da lógica e dos adaptadores.
- `public`: fontes licenciadas, marca e modelos de importação necessários à interface.
- `docker`: configuração do Nginx para SPA e proxy da API.
- `functions`: adaptador HTTP alternativo preservado com seus testes; não é usado pelo Compose.

## Cofre da disciplina

O cofre fica na API para evitar duas versões divergentes. Abra `conta-comigo-academico-api/cofre` no Obsidian:

- [Índice](https://github.com/guicamarg0/conta-comigo-academico-api/blob/main/cofre/Inicio.md)
- [Regras de negócio](https://github.com/guicamarg0/conta-comigo-academico-api/blob/main/cofre/Regras%20de%20negocio.md)
- [Arquitetura](https://github.com/guicamarg0/conta-comigo-academico-api/blob/main/cofre/Arquitetura.md)

Não há sincronização automática com os repositórios originais nem publicação automática no deploy do produto.

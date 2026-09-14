# Gestão Financeira Familiar — Fase 1

Sistema web de controle financeiro para um casal, construído em módulos independentes conforme o roadmap do requisito 29 do projeto original.

**Stack:** Node.js + Express + SQLite (backend) · React + Vite + Tailwind (frontend)

## O que está implementado nesta Fase 1

- ✅ Estrutura do projeto (backend/frontend separados)
- ✅ Banco de dados (SQLite, schema em `server/src/db/schema.sql`)
- ✅ Autenticação (registro/login com JWT, senhas com bcrypt — nunca em texto puro)
- ✅ Dashboard principal com todos os indicadores do requisito 1 (saldo atual, entradas/saídas do mês, contas pagas/pendentes/vencidas, saldo projetado, déficit, renda adicional necessária, semáforo verde/amarelo/vermelho)
- ✅ Controle de Entradas (CRUD completo, recorrência, status previsto/recebido/cancelado)
- ✅ Controle de Saídas (CRUD completo, recorrência, status pendente/pago/vencido/cancelado)
- ✅ Contas a Pagar (agrupadas por hoje / 7 / 15 / 30 dias / depois, com ação "marcar como paga")
- ✅ Contas a Receber (com ação "confirmar recebimento")
- ✅ Categorias e Contas bancárias (CRUD via API — tela de configurações fica para uma fase seguinte)
- ✅ Filtros por status, pessoa e busca textual
- ✅ Confirmação antes de excluir, mensagens de sucesso/erro compreensíveis

## O que fica para as próximas fases (conforme o roadmap original)

- Gráficos (entradas x saídas, evolução do saldo, gastos por categoria/pessoa, etc.)
- Planejamento financeiro mensal e previsão de déficit detalhada
- Tarefas do mês, Bloco de notas, Lembretes, Calendário
- Central "Gerar Renda" e Metas
- Orçamento por categoria com alertas de 50/80/100%
- Relatórios e exportação (Excel/CSV/PDF)
- Tela de Configurações (nome de usuários, moeda, categorias, etc. via interface)

A arquitetura já está pronta para receber esses módulos: cada um vira uma nova rota no backend (`server/src/routes`) e uma nova página no frontend (`client/src/pages`), sem tocar no que já existe.

## Como rodar localmente

### 1. Backend

```bash
cd server
cp .env.example .env      # ajuste o JWT_SECRET para uma string aleatória sua
npm install
npm run seed              # opcional: cria categorias padrão (alimentação, moradia, etc.)
npm run dev                # inicia em http://localhost:3001
```

### 2. Frontend

Em outro terminal:

```bash
cd client
cp .env.example .env       # já vem apontando para http://localhost:3001/api
npm install
npm run dev                 # inicia em http://localhost:5173
```

Abra `http://localhost:5173`, clique em **Criar conta** e cadastre você e, depois, sua esposa (cada um com seu próprio login — os dados financeiros são compartilhados entre os dois).

## Estrutura de pastas

```
gestao-financeira/
├── server/
│   ├── index.js                 # ponto de entrada da API
│   ├── src/
│   │   ├── config/db.js         # conexão SQLite + aplica o schema
│   │   ├── db/schema.sql        # estrutura do banco
│   │   ├── db/seed.js           # categorias padrão
│   │   ├── middleware/          # autenticação JWT, tratamento de erros
│   │   ├── routes/              # auth, transacoes, categorias, contas, dashboard
│   │   └── utils/               # validação, precisão monetária
│   └── package.json
└── client/
    ├── src/
    │   ├── pages/                # Login, Dashboard, Entradas, Saídas, Contas a Pagar/Receber
    │   ├── components/           # Sidebar, Topbar, Cards, Modais, Toast
    │   ├── context/AuthContext.jsx
    │   └── services/api.js       # cliente axios com token JWT
    └── package.json
```

## Decisões técnicas importantes

- **Entradas e saídas** compartilham a mesma tabela (`transacoes`, campo `tipo`), evitando duplicação de código — mas cada uma tem seu próprio conjunto de status e regras de validação no backend.
- **Recorrência**: ao marcar uma transação como recorrente, o sistema gera automaticamente as próximas 11 ocorrências (agrupadas por `grupo_recorrencia`). Isso só acontece quando o usuário configura a recorrência explicitamente — nunca de forma automática (requisito 27.2).
- **Precisão monetária**: cálculos usam arredondamento em centavos (`server/src/utils/money.js`) para evitar erros de ponto flutuante.
- **Segurança**: todas as queries usam *prepared statements* do `better-sqlite3` (proteção contra SQL Injection), senhas com `bcrypt`, rotas protegidas por JWT, CORS restrito à origem do frontend.
- **Situação financeira (verde/amarelo/vermelho)**: a régua usada é "saldo projetado negativo = crítico" e "saldo projetado menor que 15% das contas a pagar restantes (ou R$100, o que for maior) = atenção". É uma regra de exibição, ajustável em `server/src/routes/dashboard.js` — nenhum valor financeiro é assumido pelo sistema.

## Próximo passo sugerido

Validar esta Fase 1 em uso real por alguns dias e então avançar para os Gráficos e o Planejamento Mensal (itens 9 e 10 do roadmap), que dependem diretamente dos dados já coletados nesta fase.

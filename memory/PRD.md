# PRD — Gestão Financeira Familiar (Painel do Casal)

## Problema original
Sistema web completo de gestão financeira para um casal (marido e esposa) controlarem juntos entradas, saídas, contas a pagar/receber, planejamento, tarefas, notas, lembretes, calendário, metas de renda e orçamento. Objetivo: responder em segundos "Quanto temos? Quanto entra? Quanto sai? O que pagar? Vai faltar? Quanto gerar?". PT-BR, moeda R$.

## Decisões de arquitetura
- Stack: React (CRA) + FastAPI + MongoDB (motor).
- Auth: JWT email/senha (bcrypt), via cookie httpOnly + fallback Bearer no localStorage. Dados são compartilhados (workspace único do casal).
- Modelo unificado `transactions` (tipo entrada/saida) cobre Entradas, Saídas, Contas a Pagar (saida/pendente) e Contas a Receber (entrada/previsto). Recorrência gera 5 ocorrências futuras (series_id).
- Coleções: users, transactions, categories, accounts, tasks, reminders, notes, opportunities, goals, settings.
- Frontend: Layout com sidebar (14 seções) + topbar com filtros globais (mês/ano/pessoa), indicador de saúde e central de alertas. Contextos AuthContext e AppContext. Recharts para gráficos. shadcn/ui + Tailwind, tema claro/escuro.

## Credenciais
casal@financas.com / familia123 (ver /app/memory/test_credentials.md)

## Implementado (2026-06 / iteração 1) — TODOS os módulos
- Autenticação (login/registro/logout/me), dados demo semeados no startup.
- Dashboard: 12 cards (saldo atual, entradas/saídas, pagas/pendentes/vencidas, a receber, saldo projetado, valor p/ fechar, disponível, renda adicional) + banner de saúde verde/amarelo/vermelho + contas próximas do vencimento + 2 gráficos.
- Entradas e Saídas: CRUD completo, busca, filtro de status, marcar recebido/pago, total.
- Contas a Pagar: agrupamento por buckets (Atrasadas/Hoje/7/15/30/Depois), marcar como paga.
- Contas a Receber: listagem previstos, marcar recebido.
- Planejamento Mensal: composição do saldo projetado, status saudável/déficit, quanto gastar/economizar.
- Gráficos: 6 visualizações (entradas x saídas, evolução saldo, categoria, gastos/entradas por pessoa, pagas x pendentes).
- Gerar Renda: metas com barra de progresso + oportunidades (CRUD).
- Tarefas: CRUD, prioridade, status, concluir via checkbox, filtro.
- Calendário: grade mensal com eventos (transações/tarefas/lembretes), modal por dia.
- Notas: CRUD, fixar, pesquisar.
- Lembretes: CRUD com frequência.
- Relatórios: por categoria/pessoa/orçamento + exportação CSV.
- Configurações: nomes/moeda/primeiro dia, contas/cartões/formas de pagamento, categorias + limites (orçamento).
- Alertas automáticos (vencimentos, pendências, metas).

## Testes
Backend 22/22 (pytest). Frontend 100% dos fluxos testados pelo testing agent. Marcar conta como paga reflete no dashboard em tempo real.

## Backlog (P1/P2)
- P1: Exportação Excel/PDF (além de CSV já feito).
- P1: DatePicker shadcn no lugar do input nativo de data.
- P2: Edição de ocorrência única vs série na UI (backend já suporta scope=series).
- P2: Notificações push/email; recorrência avançada; perfis por usuário separados.
- P2 (manutenção): dividir server.py em routers/models/services; migrar on_event para lifespan.

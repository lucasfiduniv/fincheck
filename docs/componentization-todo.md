# Componentization TODO

## Frontend

### Alta prioridade
- [ ] `frontend/src/view/pages/Vehicles/index.tsx`: extrair modais restantes (`Novo Veiculo`, `Nova peca / troca`) e blocos de resumo/odometro/metricas em subcomponentes.
- [x] `frontend/src/view/pages/SavingsBoxes/index.tsx`: extrair modais de configuracao (`meta`, `recorrencia`, `rendimento`, `amigos`).
- [x] `frontend/src/view/pages/SavingsBoxes/index.tsx`: extrair seccoes de historico/planejamento em componentes menores.
- [x] `frontend/src/view/pages/Settings/index.tsx`: separar painel de preferencias e notificacoes em componentes de secao.
- [ ] `frontend/src/view/pages/Dashboard/components/Transactions/index.tsx`: separar tabela/lista, filtros e acoes realtime em componentes/hooks.

### Media prioridade
- [ ] `frontend/src/view/pages/Dashboard/modals/EditCreditCardPurchaseModal/index.tsx`: quebrar formularios por aba e hook de validacao.
- [ ] `frontend/src/view/pages/Dashboard/components/Accounts/SummaryModal/CreditCardSummaryContent.tsx`: separar cards de KPI, lista de compras e bloco de fatura.
- [ ] `frontend/src/view/pages/Reports/index.tsx`: separar filtros, KPIs e blocos de graficos.

## Backend

### Alta prioridade
- [x] `api/src/modules/savings-boxes/services/savings-boxes.service.ts`: extrair calculos/projecoes para service utilitario.
- [x] `api/src/modules/savings-boxes/services/savings-boxes.service.ts`: extrair fluxo de alertas/notificacao para service dedicado.
- [ ] `api/src/modules/credit-cards/services/credit-cards.service.ts`: separar fluxos em read/write/import use-cases.
- [ ] `api/src/modules/credit-cards/use-cases/import-credit-card-statement.use-case.ts`: mover parser matching/dedupe para helper service.
- [ ] `api/src/modules/transactions/services/transactions-import.use-case.service.ts`: continuar fatiamento em colaborador de deduplicacao e colaborador de classificacao.

### Media prioridade
- [ ] `api/src/modules/vehicles/vehicles-read.use-case.service.ts`: separar agregacoes (fuel/maintenance/odometer) em query services.
- [ ] `api/src/modules/transactions/services/transactions-create.use-case.service.ts`: separar validacoes/enriquecimento de criacao.
- [ ] `api/src/modules/notifications/notifications.service.ts`: separar providers de entrega e logica de retry.

## Criterio de pronto
- [ ] Nenhum arquivo de regra de negocio acima de ~500 linhas.
- [ ] Fluxos com teste de regressao basico (unitario ou integracao) apos extracao.
- [x] Build frontend e api verdes apos este lote de refatoracao.

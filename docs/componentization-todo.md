# Componentization TODO

## Frontend

### Alta prioridade
- [x] `frontend/src/view/pages/Vehicles/index.tsx`: modais e blocos de resumo/odometro/metricas extraidos em subcomponentes.
- [x] `frontend/src/view/pages/SavingsBoxes/index.tsx`: extrair modais de configuracao (`meta`, `recorrencia`, `rendimento`, `amigos`).
- [x] `frontend/src/view/pages/SavingsBoxes/index.tsx`: extrair seccoes de historico/planejamento em componentes menores.
- [x] `frontend/src/view/pages/Settings/index.tsx`: separar painel de preferencias e notificacoes em componentes de secao.
- [x] `frontend/src/view/pages/Dashboard/components/Transactions/index.tsx`: lista, realtime e bloco de filtros/cabecalho extraidos em componentes/hooks.

### Media prioridade
- [ ] `frontend/src/view/pages/Dashboard/modals/EditCreditCardPurchaseModal/index.tsx`: quebrar formularios por aba e hook de validacao.
- [ ] `frontend/src/view/pages/Dashboard/components/Accounts/SummaryModal/CreditCardSummaryContent.tsx`: separar cards de KPI, lista de compras e bloco de fatura.
- [ ] `frontend/src/view/pages/Reports/index.tsx`: separar filtros, KPIs e blocos de graficos.

## Backend

### Alta prioridade
- [x] `api/src/modules/savings-boxes/services/savings-boxes.service.ts`: extrair calculos/projecoes para service utilitario.
- [x] `api/src/modules/savings-boxes/services/savings-boxes.service.ts`: extrair fluxo de alertas/notificacao para service dedicado.
- [ ] `api/src/modules/credit-cards/services/credit-cards.service.ts`: decomposicao avancou com colaboradores de metadados, calendario/parcelas e escrita de compras (`CreditCardPurchaseMetadataService`, `CreditCardStatementScheduleService`, `CreditCardPurchasesWriteService`); continuar split de leitura/import.
- [ ] `api/src/modules/credit-cards/use-cases/import-credit-card-statement.use-case.ts`: parser/dedupe, pagamento importado e criacao de compras extraidos para colaboradores (`CreditCardStatementParserService`, `CreditCardStatementPaymentImportService`, `CreditCardStatementPurchaseImportService`); manter fatiamento da orquestracao/progresso.
- [ ] `api/src/modules/transactions/services/transactions-import.use-case.service.ts`: deduplicacao e transferencia importada extraidas para colaboradores (`TransactionsImportDeduplicationService`, `TransactionsImportTransferService`); continuar split da classificacao/orquestracao.

### Media prioridade
- [ ] `api/src/modules/vehicles/vehicles-read.use-case.service.ts`: separar agregacoes (fuel/maintenance/odometer) em query services.
- [ ] `api/src/modules/transactions/services/transactions-create.use-case.service.ts`: separar validacoes/enriquecimento de criacao.
- [ ] `api/src/modules/notifications/notifications.service.ts`: separar providers de entrega e logica de retry.

## Criterio de pronto
- [ ] Nenhum arquivo de regra de negocio acima de ~500 linhas.
- [ ] Fluxos com teste de regressao basico (unitario ou integracao) apos extracao.
- [x] Build frontend e api verdes apos este lote de refatoracao.

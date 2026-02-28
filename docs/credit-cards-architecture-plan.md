# Arquitetura de Cartões de Crédito (Plano Funcional e Técnico)

## Objetivo
Adicionar **cartões de crédito vinculados a contas bancárias** sem distorcer o saldo disponível da conta.

## Princípios de cálculo (regra de ouro)
1. **Compra no cartão não altera saldo da conta bancária no ato**.
2. Compra no cartão **consome limite disponível do cartão** imediatamente.
3. **Saldo da conta só muda no pagamento da fatura** (ou pagamento parcial).
4. Parcelas já lançadas/pagas preservam histórico; alterações valem para o futuro.

---

## Escopo funcional (MVP)
- Cadastro de cartão de crédito
  - Nome, banco/conta vinculada, limite total, dia de fechamento, dia de vencimento, cor, ativo/inativo.
- Lançamento de compra no cartão
  - Compra à vista ou parcelada no cartão.
  - Categoria, descrição, valor, data da compra, cartão.
- Fatura mensal por cartão
  - Status: `OPEN`, `CLOSED`, `PAID`, `OVERDUE`.
  - Totais: valor atual, créditos/estornos, valor mínimo (fase 2), valor a pagar.
- Pagamento de fatura
  - Gera transação de saída `POSTED` na conta bancária vinculada (ou escolhida no pagamento).
  - Atualiza status e saldo da fatura.

---

## Modelo de dados sugerido (genérico e reutilizável)

## 1) `CreditCard`
- `id`, `userId`
- `bankAccountId` (conta principal para pagamento)
- `name` (ex: Nubank Roxinho)
- `brand` (Visa/Master/Amex, opcional)
- `creditLimit`
- `closingDay` (1..31)
- `dueDay` (1..31)
- `isActive`
- `createdAt`, `updatedAt`

## 2) `CreditCardPurchase`
- `id`, `userId`, `creditCardId`
- `categoryId`
- `description`
- `purchaseDate`
- `amount`
- `type` (`ONE_TIME`, `INSTALLMENT`)
- `installmentCount` (null para à vista)
- `status` (`CONFIRMED`, `CANCELED`, `DISPUTED`)
- `recurrenceGroupId` (opcional se quiser agrupar parcelas)
- `createdAt`, `updatedAt`

## 3) `CreditCardInstallment` (recomendado para controle fino)
- `id`, `purchaseId`, `creditCardId`, `userId`
- `installmentNumber`, `installmentCount`
- `amount`
- `statementYear`, `statementMonth` (competência da fatura)
- `status` (`PLANNED`, `BILLED`, `PAID`, `CANCELED`)
- `dueDate`

> Observação: separar compra e parcela facilita estorno parcial, antecipação, reajuste futuro e auditoria.

## 4) `CreditCardStatement`
- `id`, `userId`, `creditCardId`
- `month`, `year`
- `closingDate`, `dueDate`
- `totalAmount`
- `totalPaid`
- `status` (`OPEN`, `CLOSED`, `PAID`, `OVERDUE`)
- `paidAt` (opcional)

## 5) `CreditCardStatementPayment`
- `id`, `statementId`, `userId`
- `bankAccountId` (de onde saiu o dinheiro)
- `amount`
- `paymentDate`
- `status` (`POSTED`, `REVERSED`)
- `bankTransactionId` (link para `Transaction` existente)

---

## Regras de competência da fatura
1. Definir uma função única: `resolveStatementForPurchase(purchaseDate, closingDay, dueDay)`.
2. Se compra ocorrer **até fechamento** => cai na fatura atual; após fechamento => próxima fatura.
3. Parcelado: cada parcela vira competência mensal subsequente.
4. Mês com menos dias (fev/30): usar normalização para último dia válido.

---

## Limite do cartão
- `availableLimit = creditLimit - (sum(parcelas BILLED/PLANNED não canceladas) - créditos aplicáveis)`
- Pagamento de fatura **recompõe limite** (total ou parcial).
- Estorno/cancelamento recompõe limite conforme regras da bandeira.

---

## Integração com módulo atual de `Transaction`
- **Não criar `Transaction` para cada compra do cartão** no MVP (evita duplicidade no saldo da conta).
- Criar `Transaction` apenas no evento de `StatementPayment`.
- Dashboard passa a ter dois blocos:
  - `Saldo disponível em conta` (real)
  - `Compromissos de cartão` (faturas e limite usado)

---

## APIs sugeridas (MVP)

### Cartões
- `POST /credit-cards`
- `GET /credit-cards`
- `PUT /credit-cards/:id`
- `DELETE /credit-cards/:id`

### Compras
- `POST /credit-cards/:id/purchases`
- `GET /credit-cards/:id/purchases?month&year`
- `PATCH /credit-card-purchases/:id/cancel`
- `PATCH /credit-card-purchases/:id/adjust-future-installments` (opcional fase 2)

### Faturas
- `GET /credit-cards/:id/statements?month&year`
- `GET /credit-card-statements/:id`
- `POST /credit-card-statements/:id/payments`

---

## UX recomendada (sem tela “chumbada”)
- Tela/lista de **Instrumentos financeiros**: contas + cartões.
- Modal de lançamento com seletor: `Conta` ou `Cartão`.
- Se escolher cartão:
  - Campos específicos: parcelas, cartão, competência estimada.
  - Preview: “vai entrar na fatura MM/AAAA; vencimento dia X”.
- Tela de fatura:
  - Lista de itens, total, pagamento, histórico de pagamento.

---

## Casos que costumam ser esquecidos (checklist)
- [ ] Compra no dia exato do fechamento (definir regra inclusiva).
- [ ] Fevereiro e meses com 30 dias para fechamento/vencimento.
- [ ] Estorno após fatura fechada (gera crédito na próxima).
- [ ] Pagamento parcial de fatura (fase 2).
- [ ] Troca da conta pagadora no momento do pagamento.
- [ ] Cartão adicional (titular x adicional).
- [ ] Cartão bloqueado/inativo sem perder histórico.
- [ ] Moeda estrangeira e IOF (fase 2).
- [ ] Categorização por item da fatura.
- [ ] Reversão de pagamento indevido.

---

## Fases de entrega

## Fase 1 — Base sólida
- Modelo de dados (cartão, compra/parcela, fatura, pagamento).
- Cadastro de cartão.
- Compra à vista e parcelada.
- Geração de fatura mensal.
- Pagamento de fatura criando `Transaction` na conta.

## Fase 2 — Operações reais
- Estorno/cancelamento.
- Pagamento parcial e saldo remanescente.
- Reajuste de parcelas futuras.
- Alertas de fechamento e vencimento.

## Fase 3 — Inteligência
- Projeção de limite e fluxo de caixa por 3/6/12 meses.
- Simulador “se comprar hoje cai em qual fatura”.
- Regras avançadas (juros rotativo, multas, renegociação).

---

## Decisões padrão recomendadas (para evitar ambiguidades)
1. Compra no dia do fechamento **entra na fatura que está fechando**.
2. Datas normalizadas em UTC calendário (evitar bug de fuso).
3. Parcelas geradas como registros explícitos (não cálculo on-the-fly).
4. No MVP, pagamento mínimo/rotativo fica fora (apenas pagamento integral).

---

## Critérios de aceite (MVP)
- Criar compra parcelada de 97 meses no cartão **não altera saldo da conta**.
- Limite disponível reduz corretamente após compra.
- Fatura do mês mostra itens corretos por competência.
- Pagar fatura gera saída única na conta e recompõe limite.
- Histórico permanece consistente após estorno/cancelamento simples.

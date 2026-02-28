import { CreditCard } from '../../../../../../app/entities/CreditCard'
import { BankAccount } from '../../../../../../app/entities/BankAccount'
import { useTransactions } from '../../../../../../app/hooks/useTransactions'
import { formatCurrency } from '../../../../../../app/utils/formatCurrency'
import { formatDate } from '../../../../../../app/utils/formatDate'
import { Modal } from '../../../../../components/Modal'
import { Button } from '../../../../../components/Button'
import { useQueries } from '@tanstack/react-query'
import { creditCardsService } from '../../../../../../app/services/creditCardsService'

interface SummaryModalProps {
  open: boolean
  onClose(): void
  account?: BankAccount | null
  creditCard?: CreditCard | null
  onEditAccount?(): void
  onDeleteAccount?(): void
  onCreateTransaction?(): void
  onEditCreditCard?(): void
  onNewCreditCardPurchase?(): void
  onPayCreditCardStatement?(): void
  onDeactivateCreditCard?(): void
  isDeletingAccount?: boolean
  isDeactivatingCreditCard?: boolean
}

const ACCOUNT_TYPE_LABEL: Record<BankAccount['type'], string> = {
  CHECKING: 'Conta corrente',
  CASH: 'Dinheiro',
  INVESTMENT: 'Investimento',
}

export function SummaryModal({
  open,
  onClose,
  account,
  creditCard,
  onEditAccount,
  onDeleteAccount,
  onCreateTransaction,
  onEditCreditCard,
  onNewCreditCardPurchase,
  onPayCreditCardStatement,
  onDeactivateCreditCard,
  isDeletingAccount = false,
  isDeactivatingCreditCard = false,
}: SummaryModalProps) {
  const isAccountSummary = !!account
  const now = new Date()

  const { transactions } = useTransactions({
    month: now.getMonth(),
    year: now.getFullYear(),
    bankAccountId: account?.id,
  })

  const accountIncomeMonth = transactions
    .filter((transaction) => transaction.type === 'INCOME')
    .reduce((total, transaction) => total + transaction.value, 0)

  const accountExpenseMonth = transactions
    .filter((transaction) => transaction.type === 'EXPENSE')
    .reduce((total, transaction) => total + transaction.value, 0)

  const lastTransactions = [...transactions]
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
    .slice(0, 5)

  const statementMonths = [0, 1, 2].map((offset) => {
    const statementDate = new Date(now.getFullYear(), now.getMonth() + offset, 1)

    return {
      month: statementDate.getMonth() + 1,
      year: statementDate.getFullYear(),
    }
  })

  const statementQueries = useQueries({
    queries: statementMonths.map(({ month, year }) => ({
      queryKey: ['creditCardStatement', creditCard?.id, month, year],
      queryFn: () =>
        creditCardsService.getStatementByMonth({
          creditCardId: creditCard!.id,
          month,
          year,
        }),
      enabled: !!creditCard?.id,
    })),
  })

  const nextStatements = statementQueries
    .map((query) => query.data)
    .filter((statement): statement is NonNullable<typeof statement> => !!statement)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isAccountSummary ? 'Resumo da conta' : 'Resumo do cartão'}
    >
      {account && (
        <div className="space-y-4">
          <div className="rounded-xl bg-gray-50 p-4 space-y-2">
            <strong className="text-gray-800 block text-lg tracking-[-0.5px]">{account.name}</strong>
            <span className="text-xs text-gray-600 block">{ACCOUNT_TYPE_LABEL[account.type]}</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Saldo atual</span>
              <strong className="text-gray-800">{formatCurrency(account.currentBalance)}</strong>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Saldo inicial</span>
              <strong className="text-gray-800">{formatCurrency(account.initialBalance)}</strong>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Entradas no mês</span>
              <strong className="text-green-800">{formatCurrency(accountIncomeMonth)}</strong>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Saídas no mês</span>
              <strong className="text-red-800">{formatCurrency(accountExpenseMonth)}</strong>
            </div>
          </div>

          <div className="space-y-2">
            <strong className="text-sm tracking-[-0.5px] text-gray-800 block">Últimas 5 transações</strong>

            {lastTransactions.length === 0 && (
              <span className="text-xs text-gray-600">Sem transações neste mês.</span>
            )}

            {lastTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between text-xs">
                <div className="flex flex-col pr-2">
                  <span className="text-gray-800 truncate">{transaction.name}</span>
                  <span className="text-gray-600">{formatDate(new Date(transaction.date))}</span>
                </div>

                <strong className={transaction.type === 'INCOME' ? 'text-green-800' : 'text-red-800'}>
                  {transaction.type === 'INCOME' ? '+' : '-'} {formatCurrency(transaction.value)}
                </strong>
              </div>
            ))}
          </div>

          <div className="pt-2 grid grid-cols-1 gap-2">
            <Button type="button" onClick={onEditAccount}>Editar conta</Button>
            <Button type="button" onClick={onCreateTransaction}>Nova transação</Button>
            <Button type="button" variant="danger" onClick={onDeleteAccount} isLoading={isDeletingAccount}>
              Excluir conta
            </Button>
          </div>
        </div>
      )}

      {creditCard && (
        <div className="space-y-4">
          <div className="rounded-xl bg-gray-50 p-4 space-y-2">
            <strong className="text-gray-800 block text-lg tracking-[-0.5px]">{creditCard.name}</strong>
            <span className="text-xs text-gray-600 block">{creditCard.brand ?? 'Cartão de crédito'}</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Limite total</span>
              <strong className="text-gray-800">{formatCurrency(creditCard.creditLimit)}</strong>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Limite usado</span>
              <strong className="text-red-800">{formatCurrency(creditCard.usedLimit)}</strong>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Limite disponível</span>
              <strong className="text-gray-800">{formatCurrency(creditCard.availableLimit)}</strong>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Fatura atual</span>
              <strong className="text-red-800">{formatCurrency(creditCard.currentStatementTotal)}</strong>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Fechamento</span>
              <strong className="text-gray-800">Dia {creditCard.closingDay}</strong>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Vencimento</span>
              <strong className="text-gray-800">Dia {creditCard.dueDay}</strong>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Próximo vencimento</span>
              <strong className="text-gray-800">
                {creditCard.nextDueDate ? formatDate(new Date(creditCard.nextDueDate)) : '--'}
              </strong>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Status</span>
              <strong className={creditCard.isActive ? 'text-green-800' : 'text-gray-700'}>
                {creditCard.isActive ? 'Ativo' : 'Inativo'}
              </strong>
            </div>
          </div>

          <div className="space-y-2">
            <strong className="text-sm tracking-[-0.5px] text-gray-800 block">Próximas 3 faturas</strong>

            {nextStatements.length === 0 && (
              <span className="text-xs text-gray-600">Sem faturas encontradas.</span>
            )}

            {nextStatements.map((statement) => (
              <div key={`${statement.year}-${statement.month}`} className="flex items-center justify-between text-xs">
                <span className="text-gray-700">
                  {statement.month.toString().padStart(2, '0')}/{statement.year} · vence {formatDate(new Date(statement.dueDate))}
                </span>
                <strong className="text-red-800">{formatCurrency(statement.pending)}</strong>
              </div>
            ))}
          </div>

          <div className="pt-2 grid grid-cols-1 gap-2">
            <Button type="button" onClick={onEditCreditCard}>Editar cartão</Button>
            <Button type="button" onClick={onNewCreditCardPurchase}>Nova compra</Button>
            <Button type="button" onClick={onPayCreditCardStatement}>Pagar fatura</Button>
            {creditCard.isActive && (
              <Button
                type="button"
                variant="danger"
                onClick={onDeactivateCreditCard}
                isLoading={isDeactivatingCreditCard}
              >
                Inativar cartão
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}

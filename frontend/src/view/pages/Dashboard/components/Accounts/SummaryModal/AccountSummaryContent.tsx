import { BankAccount } from '../../../../../../app/entities/BankAccount'
import { Transaction } from '../../../../../../app/entities/Transaction'
import { formatCurrency } from '../../../../../../app/utils/formatCurrency'
import { formatDate } from '../../../../../../app/utils/formatDate'
import { Button } from '../../../../../components/Button'

interface AccountSummaryContentProps {
  account: BankAccount
  accountIncomeMonth: number
  accountExpenseMonth: number
  lastTransactions: Transaction[]
  onEditAccount?(): void
  onDeleteAccount?(): void
  onCreateTransaction?(): void
  isDeletingAccount: boolean
}

const ACCOUNT_TYPE_LABEL: Record<BankAccount['type'], string> = {
  CHECKING: 'Conta corrente',
  CASH: 'Dinheiro',
  INVESTMENT: 'Investimento',
}

export function AccountSummaryContent({
  account,
  accountIncomeMonth,
  accountExpenseMonth,
  lastTransactions,
  onEditAccount,
  onDeleteAccount,
  onCreateTransaction,
  isDeletingAccount,
}: AccountSummaryContentProps) {
  return (
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
  )
}
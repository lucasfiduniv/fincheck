import { CreditCard, CreditCardStatementInstallment } from '../../../../../../app/entities/CreditCard'
import { BankAccount } from '../../../../../../app/entities/BankAccount'
import { useTransactions } from '../../../../../../app/hooks/useTransactions'
import { Modal } from '../../../../../components/Modal'
import { useQueries } from '@tanstack/react-query'
import { creditCardsService } from '../../../../../../app/services/creditCardsService'
import { AccountSummaryContent } from './AccountSummaryContent'
import { CreditCardSummaryContent } from './CreditCardSummaryContent'

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
  onEditCreditCardPurchase?(purchase: CreditCardStatementInstallment): void
  isDeletingAccount?: boolean
  isDeactivatingCreditCard?: boolean
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
  onEditCreditCardPurchase,
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

  const statementMonths = Array.from({ length: 17 }, (_, index) => index - 14).map((offset) => {
    const statementDate = new Date(now.getFullYear(), now.getMonth() + offset, 1)

    return {
      month: statementDate.getMonth(),
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

  const allStatements = statementQueries
    .map((query) => query.data)
    .filter((statement): statement is NonNullable<typeof statement> => !!statement)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isAccountSummary ? 'Resumo da conta' : 'Resumo do cartão'}
      contentClassName={creditCard ? 'max-w-[400px] lg:max-w-[860px]' : undefined}
    >
      {account && (
        <AccountSummaryContent
          account={account}
          accountIncomeMonth={accountIncomeMonth}
          accountExpenseMonth={accountExpenseMonth}
          lastTransactions={lastTransactions}
          onEditAccount={onEditAccount}
          onDeleteAccount={onDeleteAccount}
          onCreateTransaction={onCreateTransaction}
          isDeletingAccount={isDeletingAccount}
        />
      )}

      {creditCard && (
        <CreditCardSummaryContent
          creditCard={creditCard}
          monthlyStatements={allStatements}
          onEditCreditCard={onEditCreditCard}
          onNewCreditCardPurchase={onNewCreditCardPurchase}
          onPayCreditCardStatement={onPayCreditCardStatement}
          onDeactivateCreditCard={onDeactivateCreditCard}
          onEditCreditCardPurchase={onEditCreditCardPurchase}
          isDeactivatingCreditCard={isDeactivatingCreditCard}
        />
      )}
    </Modal>
  )
}

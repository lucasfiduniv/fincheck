import { Transaction } from '../../../../../../app/entities/Transaction'
import { BankAccount } from '../../../../../../app/entities/BankAccount'
import { formatCurrency } from '../../../../../../app/utils/formatCurrency'
import { formatDate } from '../../../../../../app/utils/formatDate'
import { formatStatusLabel } from '../../../../../../app/utils/formatStatusLabel'
import { resolveBankBrand } from '../../../../../../app/utils/resolveBankBrand'
import { cn } from '../../../../../../app/utils/cn'
import { RecurrenceAdjustmentScope } from '../../../../../../app/services/transactionsService/adjustFutureValuesByGroup'
import { Spinner } from '../../../../../components/Spinner'
import { TransactionsIcon } from '../../../../../components/icons/TransactionsIcon'
import { CategoryIcon } from '../../../../../components/icons/categories/CategoryIcon'
import { EditTransactionModal } from '../../../modals/EditTransactionModal'
import emptyStateImage from '../../../../../../assets/empty-state.svg'

export type DisplayTransactionItem =
  | {
    kind: 'SINGLE'
    id: string
    transaction: Transaction
  }
  | {
    kind: 'TRANSFER_PAIR'
    id: string
    outgoing: Transaction
    incoming: Transaction
  }

interface TransactionsListProps {
  importNotice:
    | {
      source: 'BANK_STATEMENT' | 'CREDIT_CARD_STATEMENT' | 'REALTIME'
      importedCount: number
    }
    | null
  isLoading: boolean
  hasTransactions: boolean
  transactionBeingEdited: Transaction | null
  isEditModalOpen: boolean
  onCloseEditModal: () => void
  onAdjustFutureValuesByGroup: (params: {
    recurrenceGroupId: string
    transactionId?: string
    value: number
    scope?: RecurrenceAdjustmentScope
    fromDate?: string
  }) => Promise<void>
  isAdjustingFutureValues: boolean
  displayTransactions: DisplayTransactionItem[]
  accountsById: Map<string, BankAccount>
  animatedTransactionIds: string[]
  onOpenEditModal: (transaction: Transaction) => void
  areValuesVisible: boolean
  onMarkAsPosted: (transactionId: string) => Promise<void>
  isMarkingAsPosted: boolean
  onOpenNewTransactionModal: (type: 'INCOME' | 'EXPENSE', bankAccountId?: string) => void
  onOpenCategoriesModal: () => void
}

export function TransactionsList({
  importNotice,
  isLoading,
  hasTransactions,
  transactionBeingEdited,
  isEditModalOpen,
  onCloseEditModal,
  onAdjustFutureValuesByGroup,
  isAdjustingFutureValues,
  displayTransactions,
  accountsById,
  animatedTransactionIds,
  onOpenEditModal,
  areValuesVisible,
  onMarkAsPosted,
  isMarkingAsPosted,
  onOpenNewTransactionModal,
  onOpenCategoriesModal,
}: TransactionsListProps) {
  return (
    <div className="mt-4 space-y-2 flex-1 overflow-y-auto">
      {importNotice && (
        <div className="transaction-import-notice rounded-xl border border-teal-200 bg-teal-50 px-3 py-2">
          <p className="text-xs text-teal-900 font-medium">
            {importNotice.source === 'BANK_STATEMENT'
              ? `${importNotice.importedCount} transação(ões) do extrato chegaram agora no menu.`
              : importNotice.source === 'CREDIT_CARD_STATEMENT'
                ? `${importNotice.importedCount} pagamento(s) de fatura refletiram agora no menu.`
                : `${importNotice.importedCount} nova(s) transação(ões) chegaram em tempo real.`}
          </p>
        </div>
      )}

      {isLoading && (
        <div className="flex flex-col items-center justify-center h-full">
          <Spinner className="w-10 h-10" />
        </div>
      )}

      {!hasTransactions && !isLoading && (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <img src={emptyStateImage} alt="Empty state" />
          <p className="text-gray-700 mt-1">Nenhuma transação ainda.</p>
          <p className="text-sm text-gray-600 mt-1">Comece com uma despesa rápida.</p>

          <button
            className="mt-4 text-sm px-3 py-2 rounded-lg bg-teal-900 text-white hover:bg-teal-800 transition-colors"
            onClick={() => onOpenNewTransactionModal('EXPENSE')}
          >
            Lançar primeira transação
          </button>

          <button
            className="mt-2 text-xs text-gray-600 hover:text-gray-800 underline underline-offset-2"
            onClick={onOpenCategoriesModal}
          >
            Criar categoria primeiro
          </button>
        </div>
      )}

      {hasTransactions && !isLoading && (
        <>
          {transactionBeingEdited && (
            <EditTransactionModal
              open={isEditModalOpen}
              onClose={onCloseEditModal}
              transaction={transactionBeingEdited}
              onAdjustFutureValuesByGroup={onAdjustFutureValuesByGroup}
              isAdjustingFutureValues={isAdjustingFutureValues}
            />
          )}

          {displayTransactions.map((item) => {
            if (item.kind === 'TRANSFER_PAIR') {
              const outgoingAccount = accountsById.get(item.outgoing.bankAccountId)
              const incomingAccount = accountsById.get(item.incoming.bankAccountId)
              const outgoingBrand = outgoingAccount
                ? resolveBankBrand(outgoingAccount.name, outgoingAccount.type)
                : null
              const incomingBrand = incomingAccount
                ? resolveBankBrand(incomingAccount.name, incomingAccount.type)
                : null
              const outgoingAnimationIndex = animatedTransactionIds.indexOf(item.outgoing.id)
              const incomingAnimationIndex = animatedTransactionIds.indexOf(item.incoming.id)
              const animationIndex = outgoingAnimationIndex >= 0
                ? outgoingAnimationIndex
                : incomingAnimationIndex

              return (
                <div
                  key={item.id}
                  className={cn(
                    'bg-white p-4 rounded-2xl flex items-center justify-between gap-4 cursor-pointer',
                    animationIndex >= 0 && 'transaction-import-enter ring-1 ring-teal-200',
                  )}
                  style={animationIndex >= 0
                    ? { animationDelay: `${animationIndex * 90}ms` }
                    : undefined}
                  role="button"
                  onClick={() => onOpenEditModal(item.outgoing)}
                >
                  <div className="flex-1 flex items-center gap-3">
                    <TransactionsIcon />
                    <div>
                      <strong className="font-bold tracking-[-0.5px] block">
                        Transferência entre contas próprias
                      </strong>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-gray-600">
                          {formatDate(new Date(item.outgoing.date))}
                        </span>

                        {outgoingBrand && (
                          <span className="inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 max-w-[160px]">
                            <img
                              src={outgoingBrand.logoSrc}
                              alt={outgoingBrand.displayName}
                              className="w-3.5 h-3.5 rounded-full object-contain bg-white"
                            />
                            <span className="truncate">{outgoingAccount?.name}</span>
                          </span>
                        )}

                        <span className="text-xs text-gray-500">→</span>

                        {incomingBrand && (
                          <span className="inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 max-w-[160px]">
                            <img
                              src={incomingBrand.logoSrc}
                              alt={incomingBrand.displayName}
                              className="w-3.5 h-3.5 rounded-full object-contain bg-white"
                            />
                            <span className="truncate">{incomingAccount?.name}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span
                    className={cn(
                      'tracking-[-0.5px] font-medium text-gray-700',
                      !areValuesVisible && 'blur-md',
                    )}
                  >
                    {formatCurrency(Math.abs(item.outgoing.value))}
                  </span>
                </div>
              )
            }

            const transaction = item.transaction
            const account = accountsById.get(transaction.bankAccountId)
            const bankBrand = account
              ? resolveBankBrand(account.name, account.type)
              : null
            const isTransfer = transaction.type === 'TRANSFER'
            const isIncome = transaction.type === 'INCOME'
            const categoryType = isIncome ? 'INCOME' : 'EXPENSE'
            const transferIsOutgoing = transaction.value < 0
            const amountClassName = isTransfer
              ? 'text-gray-700'
              : isIncome
                ? 'text-green-800'
                : 'text-red-800'
            const amountSignal = isTransfer
              ? transferIsOutgoing
                ? '- '
                : '+ '
              : isIncome
                ? '+ '
                : '- '

            const animationIndex = animatedTransactionIds.indexOf(transaction.id)

            return (
              <div
                key={item.id}
                className={cn(
                  'bg-white p-4 rounded-2xl flex items-center justify-between gap-4',
                  animationIndex >= 0 && 'transaction-import-enter ring-1 ring-teal-200',
                  'cursor-pointer',
                )}
                style={animationIndex >= 0
                  ? { animationDelay: `${animationIndex * 90}ms` }
                  : undefined}
                role="button"
                onClick={() => onOpenEditModal(transaction)}
              >
                <div className="flex-1 flex items-center gap-3">
                  {isTransfer ? <TransactionsIcon /> : (
                    <CategoryIcon
                      type={categoryType}
                      category={transaction.category?.icon}
                    />
                  )}
                  <div>
                    <strong className="font-bold tracking-[-0.5px] block">
                      {transaction.name}
                    </strong>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">
                        {formatDate(new Date(transaction.date))}
                      </span>

                      {bankBrand && (
                        <span className="inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 max-w-[160px]">
                          <img
                            src={bankBrand.logoSrc}
                            alt={bankBrand.displayName}
                            className="w-3.5 h-3.5 rounded-full object-contain bg-white"
                          />
                          <span className="truncate">{account?.name}</span>
                        </span>
                      )}

                      {transaction.status === 'PLANNED' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 font-medium">
                          {formatStatusLabel(transaction.status)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {transaction.status === 'PLANNED' && (
                    <button
                      className="text-xs px-2 py-1 rounded-lg bg-teal-900 text-white disabled:opacity-50"
                      onClick={(event) => {
                        event.stopPropagation()
                        void onMarkAsPosted(transaction.id)
                      }}
                      disabled={isMarkingAsPosted}
                    >
                      Efetivar
                    </button>
                  )}

                  <span
                    className={cn(
                      'tracking-[-0.5px] font-medium',
                      amountClassName,
                      !areValuesVisible && 'blur-md',
                    )}
                  >
                    {amountSignal}
                    {formatCurrency(Math.abs(transaction.value))}
                  </span>
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

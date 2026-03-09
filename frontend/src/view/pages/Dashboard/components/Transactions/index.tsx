import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTransactionsController } from './useTransactionsController'
import { cn } from '../../../../../app/utils/cn'
import { Spinner } from '../../../../components/Spinner'
import { formatStatusLabel } from '../../../../../app/utils/formatStatusLabel.ts'
import { useDashboard } from '../DashboardContext/useDashboard.ts'
import { useBankAccounts } from '../../../../../app/hooks/useBankAccounts.ts'
import { TransactionsList, type DisplayTransactionItem } from './components/TransactionsList.tsx'
import { useTransactionsRealtime } from './hooks/useTransactionsRealtime.ts'
import { TransactionsFiltersHeader } from './components/TransactionsFiltersHeader.tsx'

export function Transactions() {
  const queryClient = useQueryClient()
  const [showAttentionDetails, setShowAttentionDetails] = useState(false)

  const {
    openCategoriesModal,
    openNewTransactionModal,
  } = useDashboard()
  const { accounts } = useBankAccounts()

  const {
    areValuesVisible,
    isLoading,
    isInitialLoading,
    hasTransactions,
    isFiltersModalOpen,
    handleCloseFiltersModal,
    handleOpenFiltersModal,
    handleChangeFilters,
    transactions,
    filters,
    handleApplyFilters,
    handleOpenEditModal,
    handleCloseEditModal,
    isEditModalOpen,
    transactionBeingEdited,
    categoryBudgets,
    isLoadingCategoryBudgets,
    alertBudgetsCount,
    isBudgetsModalOpen,
    handleOpenBudgetsModal,
    handleCloseBudgetsModal,
    dueAlerts,
    isLoadingDueAlerts,
    alertDueRemindersCount,
    handleMarkAsPosted,
    handleAdjustFutureValuesByGroup,
    isMarkingAsPosted,
    isAdjustingFutureValues,
  } = useTransactionsController()

  const accountsById = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts],
  )

  const {
    importNotice,
    animatedTransactionIds,
  } = useTransactionsRealtime(queryClient, transactions)

  const displayTransactions = useMemo(() => {
    const usedTransactionIds = new Set<string>()
    const items: DisplayTransactionItem[] = []
    const toMoneyCents = (value: number) => Math.round(value * 100)

    for (const transaction of transactions) {
      if (usedTransactionIds.has(transaction.id)) {
        continue
      }

      if (transaction.type !== 'TRANSFER') {
        usedTransactionIds.add(transaction.id)
        items.push({
          kind: 'SINGLE',
          id: transaction.id,
          transaction,
        })
        continue
      }

      const transactionDateKey = new Date(transaction.date).toISOString().slice(0, 10)
      const transactionValueInCents = toMoneyCents(Math.abs(transaction.value))

      const counterpart = transactions.find((candidate) => {
        if (candidate.id === transaction.id || usedTransactionIds.has(candidate.id)) {
          return false
        }

        if (candidate.type !== 'TRANSFER' || candidate.bankAccountId === transaction.bankAccountId) {
          return false
        }

        const candidateDateKey = new Date(candidate.date).toISOString().slice(0, 10)

        if (candidateDateKey !== transactionDateKey) {
          return false
        }

        const candidateValueInCents = toMoneyCents(Math.abs(candidate.value))

        if (candidateValueInCents !== transactionValueInCents) {
          return false
        }

        return transaction.value < 0 ? candidate.value > 0 : candidate.value < 0
      })

      if (!counterpart) {
        usedTransactionIds.add(transaction.id)
        items.push({
          kind: 'SINGLE',
          id: transaction.id,
          transaction,
        })
        continue
      }

      const outgoing = transaction.value < 0 ? transaction : counterpart
      const incoming = transaction.value > 0 ? transaction : counterpart

      usedTransactionIds.add(outgoing.id)
      usedTransactionIds.add(incoming.id)

      items.push({
        kind: 'TRANSFER_PAIR',
        id: `pair:${outgoing.id}:${incoming.id}`,
        outgoing,
        incoming,
      })
    }

    return items
  }, [transactions])

  const dueSummary = isLoadingDueAlerts
    ? 'Carregando vencimentos...'
    : alertDueRemindersCount > 0
      ? `${alertDueRemindersCount} vencimento(s) em alerta`
      : 'Nenhum vencimento em alerta'

  const budgetSummary = isLoadingCategoryBudgets
    ? 'Carregando orçamentos...'
    : alertBudgetsCount > 0
      ? `${alertBudgetsCount} categoria(s) em alerta`
      : 'Nenhum alerta de orçamento'

  const priorityActionLabel = alertDueRemindersCount > 0
    ? 'Resolver vencimentos'
    : alertBudgetsCount > 0
      ? 'Ajustar orçamento'
      : 'Ver detalhes'

  function handlePriorityAttentionAction() {
    if (alertDueRemindersCount > 0) {
      setShowAttentionDetails(true)
      return
    }

    if (alertBudgetsCount > 0) {
      handleOpenBudgetsModal()
      return
    }

    setShowAttentionDetails((state) => !state)
  }

  if (isInitialLoading) {
    return (
      <div className="bg-gray-100 rounded-2xl w-full h-full px-4 py-8 lg:p-10 flex flex-col">
        <div className="w-full h-full flex items-center justify-center">
          <Spinner className="w-10 h-10" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-100 rounded-2xl w-full h-full px-4 py-8 lg:p-10 flex flex-col">
      <TransactionsFiltersHeader
        isFiltersModalOpen={isFiltersModalOpen}
        onCloseFiltersModal={handleCloseFiltersModal}
        onOpenFiltersModal={handleOpenFiltersModal}
        onApplyFilters={handleApplyFilters}
        filters={filters}
        handleChangeFilters={handleChangeFilters}
        isBudgetsModalOpen={isBudgetsModalOpen}
        onCloseBudgetsModal={handleCloseBudgetsModal}
        categoryBudgets={categoryBudgets}
      />

      <section className="mt-4 p-3 rounded-2xl bg-white space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <strong className="text-sm tracking-[-0.5px] text-gray-800 block">
              Atenções do mês
            </strong>
            <span className="text-xs text-gray-600 block mt-0.5">
              {dueSummary} • {budgetSummary}
            </span>
          </div>

          <button
            className="text-sm text-teal-900 font-medium"
            onClick={handlePriorityAttentionAction}
          >
            {priorityActionLabel}
          </button>
        </div>

        <div
          className={`overflow-hidden transition-all duration-200 ${
            showAttentionDetails ? 'max-h-[520px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="space-y-3 pt-1">
            <div className="rounded-xl border border-gray-200 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <strong className="text-xs tracking-[-0.3px] text-gray-800">Vencimentos</strong>
              </div>

              <div className="space-y-2 max-h-24 overflow-y-auto">
                {isLoadingDueAlerts && (
                  <div className="h-12 flex items-center justify-center">
                    <Spinner className="w-5 h-5" />
                  </div>
                )}

                {!isLoadingDueAlerts && dueAlerts.length === 0 && (
                  <div className="h-12 rounded-lg bg-gray-50 flex items-center justify-center text-xs text-gray-600">
                    Configure vencimento em transações recorrentes/parceladas.
                  </div>
                )}

                {!isLoadingDueAlerts && dueAlerts.slice(0, 3).map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between text-xs">
                    <span className="text-gray-700 truncate pr-2">
                      {alert.name} · dia {alert.dueDay}
                    </span>
                    <span className={cn(
                      'font-medium',
                      alert.status === 'OVERDUE' && 'text-red-800',
                      alert.status === 'DUE_TODAY' && 'text-yellow-700',
                      alert.status === 'UPCOMING' && 'text-yellow-700',
                      alert.status === 'FUTURE' && 'text-green-800'
                    )}>
                      {formatStatusLabel(alert.status, { daysUntilDue: alert.daysUntilDue })}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <strong className="text-xs tracking-[-0.3px] text-gray-800">Orçamento mensal</strong>
                <button
                  className="text-xs text-teal-900 font-medium"
                  onClick={handleOpenBudgetsModal}
                >
                  Ajustar orçamento
                </button>
              </div>

              <div className="space-y-2 max-h-28 overflow-y-auto">
                {isLoadingCategoryBudgets && (
                  <div className="h-12 flex items-center justify-center">
                    <Spinner className="w-5 h-5" />
                  </div>
                )}

                {!isLoadingCategoryBudgets && categoryBudgets.filter((budget) => budget.limit !== null).length === 0 && (
                  <div className="rounded-lg bg-gray-50 p-3 space-y-2">
                    <p className="text-xs text-gray-600">
                      Você ainda não definiu limites para este mês.
                    </p>

                    <button
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-teal-900 text-white hover:bg-teal-800 transition-colors"
                      onClick={handleOpenBudgetsModal}
                    >
                      Ajustar orçamento
                    </button>
                  </div>
                )}

                {!isLoadingCategoryBudgets && categoryBudgets
                  .filter((budget) => budget.limit !== null)
                  .map((budget) => (
                    <div key={budget.categoryId} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-700 truncate pr-2">{budget.categoryName}</span>
                        <span className={cn(
                          'font-medium',
                          budget.status === 'OVER' && 'text-red-800',
                          budget.status === 'WARNING' && 'text-yellow-700',
                          budget.status === 'SAFE' && 'text-green-800'
                        )}>
                          {Math.min(999, Math.round(budget.percentageUsed ?? 0))}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            budget.status === 'OVER' && 'bg-red-800',
                            budget.status === 'WARNING' && 'bg-yellow-700',
                            budget.status === 'SAFE' && 'bg-green-800'
                          )}
                          style={{ width: `${Math.min(100, budget.percentageUsed ?? 0)}%` }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <TransactionsList
        importNotice={importNotice}
        isLoading={isLoading}
        hasTransactions={hasTransactions}
        transactionBeingEdited={transactionBeingEdited}
        isEditModalOpen={isEditModalOpen}
        onCloseEditModal={handleCloseEditModal}
        onAdjustFutureValuesByGroup={handleAdjustFutureValuesByGroup}
        isAdjustingFutureValues={isAdjustingFutureValues}
        displayTransactions={displayTransactions}
        accountsById={accountsById}
        animatedTransactionIds={animatedTransactionIds}
        onOpenEditModal={handleOpenEditModal}
        areValuesVisible={areValuesVisible}
        onMarkAsPosted={handleMarkAsPosted}
        isMarkingAsPosted={isMarkingAsPosted}
        onOpenNewTransactionModal={openNewTransactionModal}
        onOpenCategoriesModal={openCategoriesModal}
      />
    </div>
  )
}

import { useMemo, useState } from 'react'
import { FilterIcon } from '../../../../components/icons/FilterIcon'
import { TransactionsIcon } from '../../../../components/icons/TransactionsIcon'
import { Swiper, SwiperSlide } from 'swiper/react'
import { MONTHS } from '../../../../../app/config/constants'
import { SliderOption } from './SliderOption'
import { SliderNavigation } from './SliderNavigation'
import { formatCurrency } from '../../../../../app/utils/formatCurrency'
import { CategoryIcon } from '../../../../components/icons/categories/CategoryIcon'
import { useTransactionsController } from './useTransactionsController'
import { cn } from '../../../../../app/utils/cn'
import { Spinner } from '../../../../components/Spinner'
import emptyStateImage from '../../../../../assets/empty-state.svg'
import { TransactionTypeDropdown } from './TransactionTypeDropdown.tsx'
import { FiltersModal } from './FiltersModal/index.tsx'
import { formatDate } from '../../../../../app/utils/formatDate.ts'
import { EditTransactionModal } from '../../modals/EditTransactionModal/index.tsx'
import { BudgetsModal } from '../../modals/BudgetsModal/index.tsx'
import { formatStatusLabel } from '../../../../../app/utils/formatStatusLabel.ts'
import { useDashboard } from '../DashboardContext/useDashboard.ts'
import { useBankAccounts } from '../../../../../app/hooks/useBankAccounts.ts'
import { resolveBankBrand } from '../../../../../app/utils/resolveBankBrand.ts'

export function Transactions() {
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
      <FiltersModal
        open={isFiltersModalOpen}
        currentFilters={filters}
        onApplyFilters={handleApplyFilters}
        onClose={handleCloseFiltersModal}
      />
      <BudgetsModal
        open={isBudgetsModalOpen}
        onClose={handleCloseBudgetsModal}
        month={filters.month}
        year={filters.year}
        budgets={categoryBudgets}
      />
      <header>
        <div className="flex justify-between items-center">
          <TransactionTypeDropdown
            onSelect={handleChangeFilters('type')}
            selectedType={filters.type === 'TRANSFER' ? undefined : filters.type}
          />

          <button onClick={handleOpenFiltersModal}>
            <FilterIcon />
          </button>
        </div>

        <div className="mt-6 relative">
          <Swiper
            slidesPerView={3}
            centeredSlides
            initialSlide={filters.month}
            onSlideChange={(swiper) => {
              handleChangeFilters('month')(swiper.realIndex)
            }}
          >
            <SliderNavigation />
            {MONTHS.map((month, index) => (
              <SwiperSlide key={month}>
                {({ isActive }) => (
                  <SliderOption
                    index={index}
                    isActive={isActive}
                    month={month}
                  />
                )}
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </header>

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

      <div className="mt-4 space-y-2 flex-1 overflow-y-auto">
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
              onClick={() => openNewTransactionModal('EXPENSE')}
            >
              Lançar primeira transação
            </button>

            <button
              className="mt-2 text-xs text-gray-600 hover:text-gray-800 underline underline-offset-2"
              onClick={openCategoriesModal}
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
                onClose={handleCloseEditModal}
                transaction={transactionBeingEdited}
                onAdjustFutureValuesByGroup={handleAdjustFutureValuesByGroup}
                isAdjustingFutureValues={isAdjustingFutureValues}
              />
            )}

            {transactions.map((transaction) => {
              const account = accountsById.get(transaction.bankAccountId)
              const bankBrand = account ? resolveBankBrand(account.name) : null
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

              return (
              <div
                key={transaction.id}
                className={cn(
                  'bg-white p-4 rounded-2xl flex items-center justify-between gap-4',
                  !isTransfer && 'cursor-pointer'
                )}
                role={!isTransfer ? 'button' : undefined}
                onClick={!isTransfer ? () => handleOpenEditModal(transaction) : undefined}
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
                        handleMarkAsPosted(transaction.id)
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
                      !areValuesVisible && 'blur-md'
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
    </div>
  )
}

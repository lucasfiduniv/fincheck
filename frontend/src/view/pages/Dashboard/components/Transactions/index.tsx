import { FilterIcon } from '../../../../components/icons/FilterIcon'
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

export function Transactions() {
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
  } = useTransactionsController()

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
            selectedType={filters.type}
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
              Orçamento mensal
            </strong>
            <span className={cn(
              'text-xs text-gray-600',
              alertBudgetsCount > 0 && 'text-red-800 font-medium'
            )}>
              {alertBudgetsCount > 0
                ? `${alertBudgetsCount} categoria(s) em alerta`
                : 'Nenhum alerta de orçamento'}
            </span>
          </div>

          <button
            className="text-sm text-teal-900 font-medium"
            onClick={handleOpenBudgetsModal}
          >
            Definir limites
          </button>
        </div>

        <div className="space-y-2 max-h-28 overflow-y-auto">
          {isLoadingCategoryBudgets && (
            <div className="h-12 flex items-center justify-center">
              <Spinner className="w-5 h-5" />
            </div>
          )}

          {!isLoadingCategoryBudgets && categoryBudgets.filter((budget) => budget.limit !== null).length === 0 && (
            <div className="h-12 rounded-lg bg-gray-50 flex items-center justify-center text-xs text-gray-600">
              Você ainda não definiu limites para este mês.
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
      </section>

      <div className="mt-4 space-y-2 flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-full">
            <Spinner className="w-10 h-10" />
          </div>
        )}

        {!hasTransactions && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full">
            <img src={emptyStateImage} alt="Empty state" />
            <p className="text-gray-700">Não encontramos nenhuma transação!</p>
          </div>
        )}

        {hasTransactions && !isLoading && (
          <>
            {transactionBeingEdited && (
              <EditTransactionModal
                open={isEditModalOpen}
                onClose={handleCloseEditModal}
                transaction={transactionBeingEdited}
              />
            )}

            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="bg-white p-4 rounded-2xl flex items-center justify-between gap-4"
                role="button"
                onClick={() => handleOpenEditModal(transaction)}
              >
                <div className="flex-1 flex items-center gap-3">
                  <CategoryIcon
                    type={transaction.type}
                    category={transaction.category?.icon}
                  />
                  <div>
                    <strong className="font-bold tracking-[-0.5px] block">
                      {transaction.name}
                    </strong>
                    <span className="text-sm text-gray-600">
                      {formatDate(new Date(transaction.date))}
                    </span>
                  </div>
                </div>

                <span
                  className={cn(
                    'tracking-[-0.5px] font-medium',
                    transaction.type === 'EXPENSE'
                      ? 'text-red-800'
                      : 'text-green-800',
                    !areValuesVisible && 'blur-md'
                  )}
                >
                  {transaction.type === 'EXPENSE' ? '- ' : '+ '}
                  {formatCurrency(transaction.value)}
                </span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

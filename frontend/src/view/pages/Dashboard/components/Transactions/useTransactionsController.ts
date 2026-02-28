import { useEffect, useState } from 'react'
import { useDashboard } from '../DashboardContext/useDashboard'
import { useTransactions } from '../../../../../app/hooks/useTransactions'
import { TransactionsFilters } from '../../../../../app/services/transactionsService/getAll'
import { Transaction } from '../../../../../app/entities/Transaction'
import { useCategoryBudgets } from '../../../../../app/hooks/useCategoryBudgets'

export function useTransactionsController() {
  const { areValuesVisible } = useDashboard()

  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false)
  const [isBudgetsModalOpen, setIsBudgetsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [transactionBeingEdited, setTransactionBeingEdited] = useState<Transaction | null>(null)
  const [filters, setFilters] = useState<TransactionsFilters>({
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
  })

  const { transactions, isLoading, isInitialLoading, refetchTransactions } =
    useTransactions(filters)
  const {
    categoryBudgets,
    isLoadingCategoryBudgets,
    refetchCategoryBudgets,
  } = useCategoryBudgets({ month: filters.month, year: filters.year })

  useEffect(() => {
    refetchTransactions()
  }, [filters, refetchTransactions])

  useEffect(() => {
    refetchCategoryBudgets()
  }, [filters, refetchCategoryBudgets])

  function handleChangeFilters<TFilter extends keyof TransactionsFilters>(
    filter: TFilter
  ) {
    return (value: TransactionsFilters[TFilter]) => {
      if (value === filters[filter]) return

      setFilters((prevState) => ({
        ...prevState,
        [filter]: value,
      }))
    }
  }

  function handleApplyFilters({
    bankAccountId,
    year,
  }: {
    bankAccountId: string | undefined;
    year: number;
  }) {
    handleChangeFilters('bankAccountId')(bankAccountId)
    handleChangeFilters('year')(year)
    handleCloseFiltersModal()
  }

  function handleOpenFiltersModal() {
    setIsFiltersModalOpen(true)
  }

  function handleCloseFiltersModal() {
    setIsFiltersModalOpen(false)
  }

  function handleOpenBudgetsModal() {
    setIsBudgetsModalOpen(true)
  }

  function handleCloseBudgetsModal() {
    setIsBudgetsModalOpen(false)
  }

  function handleOpenEditModal(transaction: Transaction) {
    setIsEditModalOpen(true)
    setTransactionBeingEdited(transaction)
  }

  function handleCloseEditModal() {
    setIsEditModalOpen(false)
    setTransactionBeingEdited(null)
  }

  const hasTransactions = transactions.length > 0
  const alertBudgetsCount = categoryBudgets.filter((budget) => budget.hasAlert).length

  return {
    areValuesVisible,
    transactions,
    hasTransactions,
    isInitialLoading,
    isLoading,
    isFiltersModalOpen,
    isBudgetsModalOpen,
    filters,
    categoryBudgets,
    isLoadingCategoryBudgets,
    alertBudgetsCount,
    handleOpenFiltersModal,
    handleCloseFiltersModal,
    handleOpenBudgetsModal,
    handleCloseBudgetsModal,
    handleChangeFilters,
    handleApplyFilters,
    isEditModalOpen,
    transactionBeingEdited,
    handleOpenEditModal,
    handleCloseEditModal
  }
}

import { useEffect, useState } from 'react'
import { useDashboard } from '../DashboardContext/useDashboard'
import { useTransactions } from '../../../../../app/hooks/useTransactions'
import { TransactionsFilters } from '../../../../../app/services/transactionsService/getAll'
import { Transaction } from '../../../../../app/entities/Transaction'
import { useCategoryBudgets } from '../../../../../app/hooks/useCategoryBudgets'
import { useTransactionDueAlerts } from '../../../../../app/hooks/useTransactionDueAlerts'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { transactionsService } from '../../../../../app/services/transactionsService'
import { toast } from 'react-hot-toast'

export function useTransactionsController() {
  const { areValuesVisible } = useDashboard()
  const queryClient = useQueryClient()

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
  const { dueAlerts, isLoadingDueAlerts, refetchDueAlerts } =
    useTransactionDueAlerts({ month: filters.month, year: filters.year })

  const { mutateAsync: markTransactionAsPosted, isLoading: isMarkingAsPosted } =
    useMutation(transactionsService.updateStatus)

  const {
    mutateAsync: adjustFutureValuesByGroup,
    isLoading: isAdjustingFutureValues,
  } = useMutation(transactionsService.adjustFutureValuesByGroup)

  useEffect(() => {
    refetchTransactions()
  }, [filters, refetchTransactions])

  useEffect(() => {
    refetchCategoryBudgets()
  }, [filters, refetchCategoryBudgets])

  useEffect(() => {
    refetchDueAlerts()
  }, [filters, refetchDueAlerts])

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

  async function handleMarkAsPosted(transactionId: string) {
    try {
      await markTransactionAsPosted({ id: transactionId, status: 'POSTED' })

      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['bankAccounts'] })
      queryClient.invalidateQueries({ queryKey: ['categoryBudgets'] })

      toast.success('Transação efetivada com sucesso!')
    } catch {
      toast.error('Erro ao efetivar transação!')
    }
  }

  async function handleAdjustFutureValuesByGroup(params: {
    recurrenceGroupId: string;
    value: number;
    fromDate?: string;
  }) {
    try {
      await adjustFutureValuesByGroup(params)

      queryClient.invalidateQueries({ queryKey: ['transactions'] })

      toast.success('Reajuste aplicado nas transações futuras!')
    } catch {
      toast.error('Erro ao reajustar transações futuras!')
    }
  }

  const hasTransactions = transactions.length > 0
  const alertBudgetsCount = categoryBudgets.filter((budget) => budget.hasAlert).length
  const alertDueRemindersCount = dueAlerts.filter((alert) => alert.hasAlert).length

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
    dueAlerts,
    isLoadingCategoryBudgets,
    isLoadingDueAlerts,
    alertBudgetsCount,
    alertDueRemindersCount,
    handleOpenFiltersModal,
    handleCloseFiltersModal,
    handleOpenBudgetsModal,
    handleCloseBudgetsModal,
    handleChangeFilters,
    handleApplyFilters,
    isEditModalOpen,
    transactionBeingEdited,
    handleOpenEditModal,
    handleCloseEditModal,
    handleMarkAsPosted,
    handleAdjustFutureValuesByGroup,
    isMarkingAsPosted,
    isAdjustingFutureValues,
  }
}

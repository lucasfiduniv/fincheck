import { useEffect, useMemo, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { useQueryClient } from '@tanstack/react-query'
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
import {
  FINANCIAL_IMPORT_COMPLETED_EVENT,
  FinancialImportCompletedDetail,
} from '../../../../../app/utils/financialImportRealtime.ts'
import { localStorageKeys } from '../../../../../app/config/localStorageKeys.ts'
import { Transaction } from '../../../../../app/entities/Transaction.ts'

interface ImportNoticeState {
  source: FinancialImportCompletedDetail['source'] | 'REALTIME'
  importedCount: number
}

interface TransactionsChangedRealtimeEvent {
  action: 'CREATED' | 'UPDATED' | 'DELETED' | 'IMPORTED'
  count?: number
  source?: 'MANUAL' | 'BANK_IMPORT' | 'SYSTEM'
  emittedAt: string
}

type DisplayTransactionItem =
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

export function Transactions() {
  const queryClient = useQueryClient()
  const [showAttentionDetails, setShowAttentionDetails] = useState(false)
  const [importNotice, setImportNotice] = useState<ImportNoticeState | null>(null)
  const [animatedTransactionIds, setAnimatedTransactionIds] = useState<string[]>([])
  const previousTransactionIdsRef = useRef<string[]>([])
  const pendingImportRef = useRef<ImportNoticeState | null>(null)

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

  useEffect(() => {
    function handleFinancialImportCompleted(event: Event) {
      const customEvent = event as CustomEvent<FinancialImportCompletedDetail>
      const detail = customEvent.detail

      if (!detail || detail.importedCount <= 0) {
        return
      }

      pendingImportRef.current = {
        source: detail.source,
        importedCount: detail.importedCount,
      }

      setImportNotice({
        source: detail.source,
        importedCount: detail.importedCount,
      })
    }

    window.addEventListener(FINANCIAL_IMPORT_COMPLETED_EVENT, handleFinancialImportCompleted)

    return () => {
      window.removeEventListener(FINANCIAL_IMPORT_COMPLETED_EVENT, handleFinancialImportCompleted)
    }
  }, [])

  useEffect(() => {
    const accessToken = localStorage.getItem(localStorageKeys.ACCESS_TOKEN)

    if (!accessToken) {
      return
    }

    const socket = io(import.meta.env.VITE_API_URL, {
      transports: ['websocket'],
      auth: {
        token: accessToken,
      },
    })

    socket.on('transactions.changed', (event: TransactionsChangedRealtimeEvent) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['bankAccounts'] })
      queryClient.invalidateQueries({ queryKey: ['categoryBudgets'] })
      queryClient.invalidateQueries({ queryKey: ['transactionDueAlerts'] })

      if (event.action === 'CREATED' || event.action === 'IMPORTED') {
        const importedCount = Math.max(1, event.count ?? 1)

        pendingImportRef.current = {
          source: 'REALTIME',
          importedCount,
        }

        setImportNotice({
          source: 'REALTIME',
          importedCount,
        })
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [queryClient])

  useEffect(() => {
    const currentIds = transactions.map((transaction) => transaction.id)
    const previousIds = previousTransactionIdsRef.current

    if (pendingImportRef.current) {
      const newIds = currentIds.filter((id) => !previousIds.includes(id))

      if (newIds.length > 0) {
        const maxAnimatedItems = Math.max(1, Math.min(newIds.length, pendingImportRef.current.importedCount))
        const idsToAnimate = newIds.slice(0, maxAnimatedItems)

        setAnimatedTransactionIds(idsToAnimate)

        window.setTimeout(() => {
          setAnimatedTransactionIds([])
        }, 3200)
      }

      pendingImportRef.current = null
    }

    previousTransactionIdsRef.current = currentIds
  }, [transactions])

  useEffect(() => {
    if (!importNotice) {
      return
    }

    const timeout = window.setTimeout(() => {
      setImportNotice(null)
    }, 5000)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [importNotice])

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
                    onClick={() => handleOpenEditModal(item.outgoing)}
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
                  'cursor-pointer'
                )}
                style={animationIndex >= 0
                  ? { animationDelay: `${animationIndex * 90}ms` }
                  : undefined}
                role="button"
                onClick={() => handleOpenEditModal(transaction)}
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

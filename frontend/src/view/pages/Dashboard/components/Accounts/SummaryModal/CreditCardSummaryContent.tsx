import {
  CreditCard,
  CreditCardStatement,
  CreditCardStatementInstallment,
} from '../../../../../../app/entities/CreditCard'
import { ChevronLeftIcon, ChevronRightIcon, UploadIcon } from '@radix-ui/react-icons'
import { useEffect, useMemo, useRef, useState } from 'react'
import { formatCurrency } from '../../../../../../app/utils/formatCurrency'
import { formatDate } from '../../../../../../app/utils/formatDate'
import { cn } from '../../../../../../app/utils/cn'
import { Button } from '../../../../../components/Button'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { creditCardsService } from '../../../../../../app/services/creditCardsService'
import toast from 'react-hot-toast'
import { revalidateFinancialQueries } from '../../../../../../app/utils/revalidateFinancialQueries'
import { notifyFinancialImportCompleted } from '../../../../../../app/utils/financialImportRealtime'
import {
  connectFinancialImportSocket,
  FINANCIAL_IMPORT_PROGRESS_SOCKET_EVENT,
  FinancialImportProgressSocketEvent,
} from '../../../../../../app/utils/financialImportSocket'

interface CreditCardSummaryContentProps {
  creditCard: CreditCard
  monthlyStatements: CreditCardStatement[]
  onEditCreditCard?(): void
  onNewCreditCardPurchase?(): void
  onPayCreditCardStatement?(): void
  onDeactivateCreditCard?(): void
  onEditCreditCardPurchase?(purchase: CreditCardStatementInstallment): void
  isDeactivatingCreditCard: boolean
}

function getCreditLimitUsagePercentage(creditCard: CreditCard) {
  return Math.min(100, Math.round((creditCard.usedLimit / Math.max(creditCard.creditLimit, 1)) * 100))
}

function getStatementKey(statement: CreditCardStatement) {
  return `${statement.year}-${statement.month}`
}

function formatStatementMonth(month: number, year: number) {
  return new Date(year, month, 1)
    .toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
    .replace('.', '')
}

function getCurrentCycleRange(statement: CreditCardStatement, closingDay: number) {
  const cycleEndMaxDay = new Date(statement.year, statement.month + 1, 0).getDate()
  const cycleEndDay = Math.min(closingDay, cycleEndMaxDay)
  const cycleEnd = new Date(statement.year, statement.month, cycleEndDay)

  const previousMonthDate = new Date(statement.year, statement.month - 1, 1)
  const previousMonthMaxDay = new Date(
    previousMonthDate.getFullYear(),
    previousMonthDate.getMonth() + 1,
    0,
  ).getDate()
  const previousClosingDay = Math.min(closingDay, previousMonthMaxDay)
  const cycleStart = new Date(
    previousMonthDate.getFullYear(),
    previousMonthDate.getMonth(),
    previousClosingDay,
  )
  cycleStart.setDate(cycleStart.getDate() + 1)

  return { cycleStart, cycleEnd }
}

function formatSeconds(valueInMs?: number) {
  if (!valueInMs || valueInMs <= 0) {
    return '0s'
  }

  const totalSeconds = Math.max(0, Math.round(valueInMs / 1000))

  if (totalSeconds < 60) {
    return `${totalSeconds}s`
  }

  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}m ${seconds}s`
}

export function CreditCardSummaryContent({
  creditCard,
  monthlyStatements,
  onEditCreditCard,
  onNewCreditCardPurchase,
  onPayCreditCardStatement,
  onDeactivateCreditCard,
  onEditCreditCardPurchase,
  isDeactivatingCreditCard,
}: CreditCardSummaryContentProps) {
  const queryClient = useQueryClient()
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const importRequestIdRef = useRef<string | null>(null)
  const [importProgress, setImportProgress] = useState(0)
  const [importStatus, setImportStatus] = useState('')
  const [importTimingLabel, setImportTimingLabel] = useState('')
  const creditLimitUsagePercentage = getCreditLimitUsagePercentage(creditCard)
  const now = new Date()
  const sortedStatements = useMemo(
    () => [...monthlyStatements].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
    [monthlyStatements],
  )
  const [selectedStatementKey, setSelectedStatementKey] = useState('')
  const selectedMonthlyStatement = useMemo(() => {
    const foundStatement = sortedStatements.find((statement) => getStatementKey(statement) === selectedStatementKey)

    if (foundStatement) {
      return foundStatement
    }

    // Default to the next statement that is still open to avoid focusing a paid cycle.
    const nextOpenStatement = sortedStatements.find((statement) => statement.status !== 'PAID')

    if (nextOpenStatement) {
      return nextOpenStatement
    }

    const currentMonthStatement = sortedStatements.find(
      (statement) => statement.month === now.getMonth() && statement.year === now.getFullYear(),
    )

    return currentMonthStatement ?? sortedStatements[sortedStatements.length - 1]
  }, [selectedStatementKey, sortedStatements, now])
  const selectedMonthlyStatementKey = selectedMonthlyStatement ? getStatementKey(selectedMonthlyStatement) : ''
  const selectedMonthlyStatementIndex = selectedMonthlyStatement
    ? sortedStatements.findIndex((statement) => getStatementKey(statement) === selectedMonthlyStatementKey)
    : -1
  const selectedCycle = selectedMonthlyStatement
    ? getCurrentCycleRange(selectedMonthlyStatement, creditCard.closingDay)
    : null

  function handleGoToPreviousMonth() {
    if (selectedMonthlyStatementIndex <= 0) {
      return
    }

    const previousStatement = sortedStatements[selectedMonthlyStatementIndex - 1]

    setSelectedStatementKey(getStatementKey(previousStatement))
  }

  function handleGoToNextMonth() {
    if (
      selectedMonthlyStatementIndex < 0 ||
      selectedMonthlyStatementIndex >= sortedStatements.length - 1
    ) {
      return
    }

    const nextStatement = sortedStatements[selectedMonthlyStatementIndex + 1]

    setSelectedStatementKey(getStatementKey(nextStatement))
  }

  const limitUsageTone = useMemo(() => {
    if (creditLimitUsagePercentage >= 90) {
      return {
        text: 'text-red-800',
        bar: 'bg-red-800',
      }
    }

    if (creditLimitUsagePercentage >= 75) {
      return {
        text: 'text-yellow-800',
        bar: 'bg-yellow-700',
      }
    }

    return {
      text: 'text-gray-800',
      bar: 'bg-teal-800',
    }
  }, [creditLimitUsagePercentage])

  const { mutateAsync: importStatementMutation, isLoading: isImportingStatement } = useMutation(
    ({
      params,
      onUploadProgress,
    }: {
      params: Parameters<typeof creditCardsService.importStatement>[0]
      onUploadProgress?: (percentage: number) => void
    }) => creditCardsService.importStatement(params, { onUploadProgress }),
  )

  useEffect(() => {
    const socket = connectFinancialImportSocket()

    if (!socket) {
      return
    }

    function handleImportProgress(event: FinancialImportProgressSocketEvent) {
      if (event.source !== 'CREDIT_CARD_STATEMENT') {
        return
      }

      if (event.creditCardId !== creditCard.id) {
        return
      }

      if (!importRequestIdRef.current || event.requestId !== importRequestIdRef.current) {
        return
      }

      setImportProgress(event.progress)
      setImportStatus(event.message || 'Processando fatura...')

      const etaLabel = event.etaMs && event.etaMs > 0
        ? ` • ETA ${formatSeconds(event.etaMs)}`
        : ''
      setImportTimingLabel(`Tempo ${formatSeconds(event.elapsedMs)}${etaLabel}`)
    }

    socket.on(FINANCIAL_IMPORT_PROGRESS_SOCKET_EVENT, handleImportProgress)

    return () => {
      socket.off(FINANCIAL_IMPORT_PROGRESS_SOCKET_EVENT, handleImportProgress)
      socket.disconnect()
    }
  }, [creditCard.id])

  async function handleImportStatementFile(file?: File) {
    if (!file) {
      return
    }

    try {
      const requestId = crypto.randomUUID()
      importRequestIdRef.current = requestId

      setImportProgress(0)
      setImportStatus(`Lendo ${file.name}...`)
      setImportTimingLabel('')

      const content = await file.text()

      setImportProgress(0)
      setImportStatus('Enviando arquivo para importação...')

      const response = await importStatementMutation({
        params: {
          creditCardId: creditCard.id,
          bank: 'NUBANK',
          csvContent: content,
          requestId,
        },
      })

      await revalidateFinancialQueries(queryClient)

      if ((response.importedPaymentsCount ?? 0) > 0) {
        notifyFinancialImportCompleted({
          source: 'CREDIT_CARD_STATEMENT',
          importedCount: response.importedPaymentsCount ?? 0,
        })
      }

      setImportProgress(100)
      setImportStatus('Importação concluída.')
      setImportTimingLabel('')

      toast.success(
        `Importação concluída: ${response.importedCount} compra(s), ${response.importedPaymentsCount ?? 0} pagamento(s), ${response.skippedCount} ignorado(s).`,
      )
    } catch {
      setImportStatus('Falha na importação.')
      setImportTimingLabel('')
      toast.error('Não foi possível importar a fatura do cartão.')
    } finally {
      setTimeout(() => {
        setImportProgress(0)
        setImportStatus('')
        setImportTimingLabel('')
        importRequestIdRef.current = null
      }, 1200)
    }
  }

  return (
    <div className="max-h-[72vh] overflow-y-auto pr-1">
      <div className="space-y-4">
        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 lg:p-5 space-y-4">
          <input
            ref={importInputRef}
            type="file"
            accept=".csv,.ofx,text/csv,application/vnd.ms-excel"
            className="hidden"
            onChange={(event) => {
              void handleImportStatementFile(event.target.files?.[0])
              event.target.value = ''
            }}
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <strong className="text-gray-800 block text-xl tracking-[-0.5px]">{creditCard.name}</strong>
              <span className="text-xs text-gray-600 block mt-1">{creditCard.brand ?? 'Cartão de crédito'}</span>
              <span className="text-xs text-gray-500 block mt-1">
                Fecha dia {creditCard.closingDay} • Vence dia {creditCard.dueDay}
              </span>
              {selectedCycle && (
                <span className="text-xs text-teal-800 block mt-1">
                  Ciclo atual: {formatDate(selectedCycle.cycleStart)} a {formatDate(selectedCycle.cycleEnd)} • Vence {selectedMonthlyStatement ? formatDate(new Date(selectedMonthlyStatement.dueDate)) : '--'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={cn(
                  'text-[10px] px-2 py-1 rounded-full font-medium',
                  creditCard.isActive ? 'text-green-800 bg-green-100' : 'text-gray-700 bg-gray-200',
                )}
              >
                {creditCard.isActive ? 'Ativo' : 'Inativo'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={onNewCreditCardPurchase}
              className="h-9 rounded-xl px-3 text-xs font-semibold tracking-[-0.2px]"
            >
              Nova compra
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="h-9 rounded-xl border-teal-200 bg-teal-50/70 text-teal-900 hover:bg-teal-100 px-3 text-xs font-semibold tracking-[-0.2px]"
              onClick={onPayCreditCardStatement}
            >
              Pagar fatura
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => importInputRef.current?.click()}
              isLoading={isImportingStatement}
              className="h-9 rounded-xl border-gray-200 bg-white text-gray-700 hover:bg-gray-50 px-3 text-xs font-semibold tracking-[-0.2px]"
            >
              <UploadIcon className="w-4 h-4 mr-1" />
              Importar fatura
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="h-9 rounded-xl border-violet-200 bg-violet-50/70 text-violet-900 hover:bg-violet-100 px-3 text-xs font-semibold tracking-[-0.2px]"
              onClick={onEditCreditCard}
            >
              Editar cartão
            </Button>

            {creditCard.isActive && (
              <Button
                type="button"
                variant="danger"
                onClick={onDeactivateCreditCard}
                isLoading={isDeactivatingCreditCard}
                className="h-9 rounded-xl px-3 text-xs font-semibold tracking-[-0.2px]"
              >
                Excluir cartão
              </Button>
            )}
          </div>

          {(isImportingStatement || importStatus) && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-700">
                <span>{importStatus || 'Importando...'}</span>
                <strong>{importProgress}%</strong>
              </div>
              {!!importTimingLabel && (
                <div className="text-[11px] text-gray-500">{importTimingLabel}</div>
              )}
              <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-teal-800 transition-all"
                  style={{ width: `${importProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div className="rounded-xl bg-gray-50 p-3">
              <span className="text-[11px] text-gray-600 block">Limite total</span>
              <strong className="text-sm text-gray-800">{formatCurrency(creditCard.creditLimit)}</strong>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <span className="text-[11px] text-gray-600 block">Disponível</span>
              <strong className="text-sm text-green-800">{formatCurrency(creditCard.availableLimit)}</strong>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <span className="text-[11px] text-gray-600 block">Usado</span>
              <strong className={cn('text-sm', limitUsageTone.text)}>{formatCurrency(creditCard.usedLimit)}</strong>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <span className="text-[11px] text-gray-600 block">Próx. vencimento</span>
              <strong className="text-sm text-gray-800">
                {creditCard.nextDueDate ? formatDate(new Date(creditCard.nextDueDate)) : '--'}
              </strong>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Uso do limite</span>
              <strong className="text-gray-800">{creditLimitUsagePercentage}%</strong>
            </div>
            <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', limitUsageTone.bar)}
                style={{ width: `${creditLimitUsagePercentage}%` }}
              />
            </div>
          </div>
        </section>

        <section>
          <div className="rounded-2xl border border-gray-100 p-4 lg:p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <strong className="text-sm tracking-[-0.5px] text-gray-800 block">Compras por mês</strong>
                {selectedMonthlyStatement && (
                  <span className="text-xs text-gray-600">{selectedMonthlyStatement.installments.length} item(ns)</span>
                )}
              </div>

              {sortedStatements.length === 0 && (
                <div className="h-20 rounded-xl border border-dashed border-gray-200 flex items-center justify-center text-xs text-gray-600">
                  Sem faturas para visualizar por mês.
                </div>
              )}

              {sortedStatements.length > 0 && selectedMonthlyStatement && (
                <>
                  <div className="rounded-xl border border-gray-200 bg-white p-2 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={handleGoToPreviousMonth}
                      disabled={selectedMonthlyStatementIndex <= 0}
                      className="h-8 w-8 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center"
                    >
                      <ChevronLeftIcon className="w-4 h-4" />
                    </button>

                    <div className="min-w-0 text-center">
                      <span className="text-xs font-semibold text-gray-800 block capitalize">
                        {formatStatementMonth(selectedMonthlyStatement.month, selectedMonthlyStatement.year)}
                      </span>
                      <span className="text-[11px] text-gray-500">
                        {selectedMonthlyStatementIndex + 1} de {sortedStatements.length}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleGoToNextMonth}
                      disabled={selectedMonthlyStatementIndex >= sortedStatements.length - 1}
                      className="h-8 w-8 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center"
                    >
                      <ChevronRightIcon className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="rounded-xl bg-gray-50 p-3 flex flex-col gap-1 text-xs text-gray-700">
                    <div className="flex items-center justify-between">
                      <span>Total</span>
                      <strong className="text-gray-800">{formatCurrency(selectedMonthlyStatement.total)}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Em aberto</span>
                      <strong className={cn(selectedMonthlyStatement.status === 'OVERDUE' ? 'text-red-800' : 'text-gray-800')}>
                        {formatCurrency(selectedMonthlyStatement.pending)}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Vencimento</span>
                      <strong className="text-gray-800">{formatDate(new Date(selectedMonthlyStatement.dueDate))}</strong>
                    </div>
                  </div>

                  {selectedMonthlyStatement.installments.length === 0 && (
                    <div className="h-20 rounded-xl border border-dashed border-gray-200 flex items-center justify-center text-xs text-gray-600">
                      Sem compras registradas neste mês.
                    </div>
                  )}

                  {selectedMonthlyStatement.installments.length > 0 && (
                    <div className="rounded-xl border border-gray-100 overflow-hidden">
                      <div className="divide-y divide-gray-100">
                        {selectedMonthlyStatement.installments.map((installment) => (
                          <div key={installment.id} className="px-3 py-2.5 flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <strong className="text-xs text-gray-800 block truncate">{installment.description}</strong>
                              <span className="text-[11px] text-gray-500 block mt-0.5">
                                {formatDate(new Date(installment.purchaseDate))} • {installment.installmentNumber}/{installment.installmentCount}
                              </span>
                            </div>
                            <div className="shrink-0 flex items-center gap-2">
                              <strong className="text-xs text-gray-800">{formatCurrency(installment.amount)}</strong>
                              {onEditCreditCardPurchase && installment.status !== 'CANCELED' && (
                                <button
                                  type="button"
                                  onClick={() => onEditCreditCardPurchase(installment)}
                                  className="text-[11px] px-2 py-1 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                                >
                                  Editar
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
        </section>
      </div>
    </div>
  )
}
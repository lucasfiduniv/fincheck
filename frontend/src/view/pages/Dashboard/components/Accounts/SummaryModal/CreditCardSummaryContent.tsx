import {
  CreditCard,
  CreditCardStatement,
  CreditCardStatementInstallment,
} from '../../../../../../app/entities/CreditCard'
import { Pencil2Icon, UploadIcon } from '@radix-ui/react-icons'
import { useMemo, useRef } from 'react'
import { formatCurrency } from '../../../../../../app/utils/formatCurrency'
import { formatDate } from '../../../../../../app/utils/formatDate'
import { formatStatusLabel } from '../../../../../../app/utils/formatStatusLabel'
import { cn } from '../../../../../../app/utils/cn'
import { Button } from '../../../../../components/Button'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { creditCardsService } from '../../../../../../app/services/creditCardsService'
import toast from 'react-hot-toast'

interface CreditCardSummaryContentProps {
  creditCard: CreditCard
  nextStatements: CreditCardStatement[]
  onEditCreditCard?(): void
  onNewCreditCardPurchase?(): void
  onPayCreditCardStatement?(): void
  onDeactivateCreditCard?(): void
  onEditCreditCardPurchase?(purchase: CreditCardStatementInstallment): void
  isDeactivatingCreditCard: boolean
}

const STATEMENT_STATUS_CLASS: Record<CreditCardStatement['status'], string> = {
  OPEN: 'text-yellow-800 bg-yellow-100',
  OVERDUE: 'text-red-800 bg-red-100',
  PAID: 'text-green-800 bg-green-100',
}

const INSTALLMENT_STATUS_CLASS: Record<CreditCardStatementInstallment['status'], string> = {
  PENDING: 'text-yellow-800 bg-yellow-100',
  PAID: 'text-green-800 bg-green-100',
  CANCELED: 'text-gray-700 bg-gray-200',
}

function getCreditLimitUsagePercentage(creditCard: CreditCard) {
  return Math.min(100, Math.round((creditCard.usedLimit / Math.max(creditCard.creditLimit, 1)) * 100))
}

export function CreditCardSummaryContent({
  creditCard,
  nextStatements,
  onEditCreditCard,
  onNewCreditCardPurchase,
  onPayCreditCardStatement,
  onDeactivateCreditCard,
  onEditCreditCardPurchase,
  isDeactivatingCreditCard,
}: CreditCardSummaryContentProps) {
  const queryClient = useQueryClient()
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const creditLimitUsagePercentage = getCreditLimitUsagePercentage(creditCard)
  const now = new Date()
  const currentStatement = useMemo(
    () =>
      nextStatements.find(
        (statement) => statement.month === now.getMonth() && statement.year === now.getFullYear(),
      ),
    [nextStatements, now],
  )
  const currentStatementInstallments = currentStatement?.installments ?? []
  const currentStatementPending = currentStatement?.pending ?? 0
  const currentStatementTotal = currentStatement?.total ?? 0
  const pendingPercentage = currentStatementTotal > 0
    ? Math.min(100, Math.round((currentStatementPending / currentStatementTotal) * 100))
    : 0

  const { mutateAsync: importStatementMutation, isLoading: isImportingStatement } = useMutation(
    creditCardsService.importStatement,
  )

  async function handleImportStatementFile(file?: File) {
    if (!file) {
      return
    }

    try {
      const content = await file.text()

      const response = await importStatementMutation({
        creditCardId: creditCard.id,
        bank: 'NUBANK',
        csvContent: content,
      })

      queryClient.invalidateQueries({ queryKey: ['creditCards'] })
      queryClient.invalidateQueries({ queryKey: ['creditCardStatement'] })

      toast.success(
        `Importação concluída: ${response.importedCount} importado(s), ${response.skippedCount} ignorado(s).`,
      )
    } catch {
      toast.error('Não foi possível importar a fatura do cartão.')
    }
  }

  return (
    <div className="max-h-[72vh] overflow-y-auto pr-1">
      <div className="space-y-4">
        <section className="relative rounded-2xl border border-gray-100 p-4 lg:p-5 space-y-4">
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

          <button
            type="button"
            title="Importar fatura Nubank"
            onClick={() => importInputRef.current?.click()}
            disabled={isImportingStatement}
            className="absolute top-4 right-4 h-8 w-8 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <UploadIcon className="w-4 h-4" />
          </button>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <strong className="text-gray-800 block text-xl tracking-[-0.5px]">{creditCard.name}</strong>
              <span className="text-xs text-gray-600 block mt-1">{creditCard.brand ?? 'Cartão de crédito'}</span>
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
              <span className="text-[10px] px-2 py-1 rounded-full font-medium text-gray-700 bg-gray-100">
                Fechamento dia {creditCard.closingDay}
              </span>
              <span className="text-[10px] px-2 py-1 rounded-full font-medium text-gray-700 bg-gray-100">
                Vencimento dia {creditCard.dueDay}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full sm:w-auto">
              <Button type="button" variant="ghost" className="h-9 rounded-xl border-teal-200 bg-teal-50/70 text-teal-900 hover:bg-teal-100 px-3 text-xs font-semibold tracking-[-0.2px]" onClick={onNewCreditCardPurchase}>
                Nova compra
              </Button>

              <Button type="button" variant="ghost" className="h-9 rounded-xl border-sky-200 bg-sky-50/70 text-sky-900 hover:bg-sky-100 px-3 text-xs font-semibold tracking-[-0.2px]" onClick={onPayCreditCardStatement}>
                Pagar fatura
              </Button>

              <Button type="button" variant="ghost" className="h-9 rounded-xl border-violet-200 bg-violet-50/70 text-violet-900 hover:bg-violet-100 px-3 text-xs font-semibold tracking-[-0.2px]" onClick={onEditCreditCard}>
                Editar cartão
              </Button>
            </div>

            {creditCard.isActive && (
              <Button
                type="button"
                variant="danger"
                onClick={onDeactivateCreditCard}
                isLoading={isDeactivatingCreditCard}
                className="h-9 rounded-xl px-3 text-xs font-semibold tracking-[-0.2px]"
              >
                Inativar cartão
              </Button>
            )}
          </div>

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
              <strong className="text-sm text-red-800">{formatCurrency(creditCard.usedLimit)}</strong>
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
                className={cn(
                  'h-full rounded-full transition-all',
                  creditLimitUsagePercentage >= 90 && 'bg-red-800',
                  creditLimitUsagePercentage >= 70 && creditLimitUsagePercentage < 90 && 'bg-yellow-700',
                  creditLimitUsagePercentage < 70 && 'bg-green-800',
                )}
                style={{ width: `${creditLimitUsagePercentage}%` }}
              />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4">
          <div className="rounded-2xl border border-gray-100 p-4 lg:p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <strong className="text-sm tracking-[-0.5px] text-gray-800 block">Compras da fatura atual</strong>
              <span className="text-xs text-gray-600">{currentStatementInstallments.length} item(ns)</span>
            </div>

            <div className="rounded-xl bg-gray-50 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Fatura em aberto</span>
                <strong className="text-gray-800">{formatCurrency(currentStatementPending)}</strong>
              </div>
              <div className="h-2 rounded-full bg-white overflow-hidden">
                <div
                  className="h-full rounded-full bg-yellow-700"
                  style={{ width: `${pendingPercentage}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-gray-600">
                <span>Total da fatura: {formatCurrency(currentStatementTotal)}</span>
                <span>{pendingPercentage}% pendente</span>
              </div>
            </div>

            {currentStatementInstallments.length === 0 && (
              <div className="h-20 rounded-xl border border-dashed border-gray-200 flex items-center justify-center text-xs text-gray-600">
                Sem compras nesta fatura.
              </div>
            )}

            {currentStatementInstallments.length > 0 && (
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <div className="hidden md:grid grid-cols-[1.7fr_0.7fr_0.7fr_0.8fr_0.6fr] gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100">
                  <span className="text-[11px] text-gray-500 font-medium">Descrição</span>
                  <span className="text-[11px] text-gray-500 font-medium">Data</span>
                  <span className="text-[11px] text-gray-500 font-medium">Parcela</span>
                  <span className="text-[11px] text-gray-500 font-medium">Status</span>
                  <span className="text-[11px] text-gray-500 font-medium text-right">Valor</span>
                </div>

                <div className="divide-y divide-gray-100">
                  {currentStatementInstallments.slice(0, 8).map((installment) => (
                    <div key={installment.id} className="px-3 py-2.5 md:py-2">
                      <div className="md:hidden space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <strong className="text-sm text-gray-800 block truncate">{installment.description}</strong>
                            <div className="flex items-center gap-1 text-[11px] text-gray-600 mt-0.5">
                              <span className="w-1 h-1 rounded-full bg-gray-400" />
                              <span>{formatDate(new Date(installment.purchaseDate))}</span>
                            </div>
                          </div>
                          <strong className="text-sm text-gray-800">{formatCurrency(installment.amount)}</strong>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] text-gray-600">
                            {installment.installmentNumber}/{installment.installmentCount}
                          </span>
                          <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', INSTALLMENT_STATUS_CLASS[installment.status])}>
                            {formatStatusLabel(installment.status)}
                          </span>
                        </div>
                      </div>

                      <div className="hidden md:grid grid-cols-[1.7fr_0.7fr_0.7fr_0.8fr_0.6fr] gap-2 items-center">
                        <div className="min-w-0">
                          <strong className="text-xs text-gray-800 block truncate">{installment.description}</strong>
                          <span className="text-[11px] text-gray-500 truncate block">
                            {installment.category?.name ?? 'Sem categoria'}
                          </span>
                        </div>

                        <span className="text-xs text-gray-600">{formatDate(new Date(installment.purchaseDate))}</span>
                        <span className="text-xs text-gray-600">{installment.installmentNumber}/{installment.installmentCount}</span>
                        <span className={cn('justify-self-start text-[10px] px-2 py-0.5 rounded-full font-medium', INSTALLMENT_STATUS_CLASS[installment.status])}>
                          {formatStatusLabel(installment.status)}
                        </span>
                        <strong className="text-xs text-gray-800 text-right">{formatCurrency(installment.amount)}</strong>
                      </div>

                      {installment.status === 'PENDING' && onEditCreditCardPurchase && (
                        <div className="mt-2 flex justify-end">
                          <button
                            type="button"
                            className="h-7 px-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors inline-flex items-center gap-1 text-[11px]"
                            onClick={() => onEditCreditCardPurchase(installment)}
                          >
                            <Pencil2Icon className="w-3.5 h-3.5" />
                            Editar
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="rounded-2xl border border-gray-100 p-4 space-y-3">
              <strong className="text-sm tracking-[-0.5px] text-gray-800 block">Próximas faturas</strong>

              {nextStatements.length === 0 && (
                <span className="text-xs text-gray-600">Sem faturas encontradas.</span>
              )}

              {nextStatements.map((statement) => (
                <div
                  key={`${statement.year}-${statement.month}`}
                  className="rounded-xl border border-gray-100 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs gap-2">
                    <strong className="text-gray-700">
                      {String(statement.month + 1).padStart(2, '0')}/{statement.year}
                    </strong>

                    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium', STATEMENT_STATUS_CLASS[statement.status])}>
                      {formatStatusLabel(statement.status)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Vence em {formatDate(new Date(statement.dueDate))}</span>
                    <strong className="text-red-800">{formatCurrency(statement.pending)}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
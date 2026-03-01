import { CreditCard, CreditCardStatement } from '../../../../../../app/entities/CreditCard'
import { formatCurrency } from '../../../../../../app/utils/formatCurrency'
import { formatDate } from '../../../../../../app/utils/formatDate'
import { formatStatusLabel } from '../../../../../../app/utils/formatStatusLabel'
import { cn } from '../../../../../../app/utils/cn'
import { Button } from '../../../../../components/Button'

interface CreditCardSummaryContentProps {
  creditCard: CreditCard
  nextStatements: CreditCardStatement[]
  onEditCreditCard?(): void
  onNewCreditCardPurchase?(): void
  onPayCreditCardStatement?(): void
  onDeactivateCreditCard?(): void
  isDeactivatingCreditCard: boolean
}

const STATEMENT_STATUS_CLASS: Record<CreditCardStatement['status'], string> = {
  OPEN: 'text-yellow-800 bg-yellow-100',
  OVERDUE: 'text-red-800 bg-red-100',
  PAID: 'text-green-800 bg-green-100',
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
  isDeactivatingCreditCard,
}: CreditCardSummaryContentProps) {
  const creditLimitUsagePercentage = getCreditLimitUsagePercentage(creditCard)

  return (
    <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
      <div className="lg:grid lg:grid-cols-[1fr_0.9fr] lg:gap-5">
        <div className="space-y-4 lg:pr-5 lg:border-r lg:border-gray-100">
          <div className="rounded-xl bg-gray-50 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <strong className="text-gray-800 block text-lg tracking-[-0.5px]">{creditCard.name}</strong>
                <span className="text-xs text-gray-600 block">{creditCard.brand ?? 'Cartão de crédito'}</span>
              </div>

              <span
                className={cn(
                  'text-[10px] px-2 py-0.5 rounded-full font-medium',
                  creditCard.isActive ? 'text-green-800 bg-green-100' : 'text-gray-700 bg-gray-200',
                )}
              >
                {creditCard.isActive ? 'Ativo' : 'Inativo'}
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-600">Uso do limite</span>
                <strong className="text-gray-800">{creditLimitUsagePercentage}%</strong>
              </div>
              <div className="h-2 rounded-full bg-white overflow-hidden">
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
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-gray-100 p-3">
              <span className="text-[11px] text-gray-600 block">Limite total</span>
              <strong className="text-sm text-gray-800">{formatCurrency(creditCard.creditLimit)}</strong>
            </div>

            <div className="rounded-xl border border-gray-100 p-3">
              <span className="text-[11px] text-gray-600 block">Limite disponível</span>
              <strong className="text-sm text-gray-800">{formatCurrency(creditCard.availableLimit)}</strong>
            </div>

            <div className="rounded-xl border border-gray-100 p-3">
              <span className="text-[11px] text-gray-600 block">Limite usado</span>
              <strong className="text-sm text-red-800">{formatCurrency(creditCard.usedLimit)}</strong>
            </div>

            <div className="rounded-xl border border-gray-100 p-3">
              <span className="text-[11px] text-gray-600 block">Fatura atual</span>
              <strong className="text-sm text-red-800">{formatCurrency(creditCard.currentStatementTotal)}</strong>
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 p-3 grid grid-cols-3 gap-2 text-center">
            <div>
              <span className="text-[11px] text-gray-600 block">Fechamento</span>
              <strong className="text-sm text-gray-800">Dia {creditCard.closingDay}</strong>
            </div>

            <div className="border-x border-gray-100">
              <span className="text-[11px] text-gray-600 block">Vencimento</span>
              <strong className="text-sm text-gray-800">Dia {creditCard.dueDay}</strong>
            </div>

            <div>
              <span className="text-[11px] text-gray-600 block">Próx. venc.</span>
              <strong className="text-sm text-gray-800">
                {creditCard.nextDueDate ? formatDate(new Date(creditCard.nextDueDate)) : '--'}
              </strong>
            </div>
          </div>
        </div>

        <div className="space-y-4 mt-4 lg:mt-0 lg:pl-1">
          <div className="space-y-2">
            <strong className="text-sm tracking-[-0.5px] text-gray-800 block">Próximas 3 faturas</strong>

            {nextStatements.length === 0 && (
              <span className="text-xs text-gray-600">Sem faturas encontradas.</span>
            )}

            {nextStatements.map((statement) => (
              <div
                key={`${statement.year}-${statement.month}`}
                className="rounded-xl border border-gray-100 p-3 space-y-2"
              >
                <div className="flex items-center justify-between text-xs gap-2">
                  <span className="text-gray-700">
                    {String(statement.month + 1).padStart(2, '0')}/{statement.year}
                  </span>

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

          <div className="pt-1 grid grid-cols-2 gap-2 lg:pt-2 lg:border-t lg:border-gray-100">
            <Button type="button" onClick={onEditCreditCard}>Editar cartão</Button>
            <Button type="button" onClick={onNewCreditCardPurchase}>Nova compra</Button>
            <Button type="button" onClick={onPayCreditCardStatement} className="col-span-2">Pagar fatura</Button>
            {creditCard.isActive && (
              <Button
                type="button"
                variant="danger"
                onClick={onDeactivateCreditCard}
                isLoading={isDeactivatingCreditCard}
                className="col-span-2"
              >
                Inativar cartão
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
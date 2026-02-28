import { CreditCard } from '../../../../../../app/entities/CreditCard'
import { cn } from '../../../../../../app/utils/cn'
import { formatCurrency } from '../../../../../../app/utils/formatCurrency'
import { formatDate } from '../../../../../../app/utils/formatDate'
import { useDashboard } from '../../DashboardContext/useDashboard'

interface CreditCardCardProps {
  data: CreditCard
  onClick?: (data: CreditCard) => void
}

export function CreditCardCard({ data, onClick }: CreditCardCardProps) {
  const { areValuesVisible } = useDashboard()

  return (
    <div
      className="relative overflow-hidden p-4 rounded-2xl h-[200px] flex flex-col justify-between border border-gray-100 bg-cover bg-center"
      style={{
        backgroundImage: `linear-gradient(135deg, ${data.color}26 0%, transparent 55%), url('/face=front.svg')`,
      }}
      role="button"
      onClick={() => onClick?.(data)}
    >
      <div className="relative z-10">
        <span className="text-gray-700 text-xs tracking-[-0.3px] uppercase block">
          {data.brand ?? 'Cartão de crédito'}
        </span>

        <strong className="text-gray-800 font-semibold tracking-[-0.5px] mt-1 block">
          {data.name}
        </strong>
      </div>

      <div className="relative z-10 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600">Limite disponível</span>
          <strong className={cn('text-sm text-gray-800', !areValuesVisible && 'blur-md')}>
            {formatCurrency(data.availableLimit)}
          </strong>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600">Fatura atual</span>
          <strong className={cn('text-sm text-red-800', !areValuesVisible && 'blur-md')}>
            {formatCurrency(data.currentStatementTotal)}
          </strong>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600">Próx. vencimento</span>
          <span className="text-xs text-gray-800 font-medium">
            {data.nextDueDate ? formatDate(new Date(data.nextDueDate)) : '--'}
          </span>
        </div>
      </div>
    </div>
  )
}

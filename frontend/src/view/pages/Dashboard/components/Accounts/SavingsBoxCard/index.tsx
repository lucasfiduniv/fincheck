import { Link } from 'react-router-dom'
import { SavingsBox } from '../../../../../../app/entities/SavingsBox'
import { cn } from '../../../../../../app/utils/cn'
import { formatCurrency } from '../../../../../../app/utils/formatCurrency'
import { useDashboard } from '../../DashboardContext/useDashboard'

interface SavingsBoxCardProps {
  data: SavingsBox
}

export function SavingsBoxCard({ data }: SavingsBoxCardProps) {
  const { areValuesVisible } = useDashboard()

  const progress = data.targetAmount && data.targetAmount > 0
    ? Math.min((data.currentBalance / data.targetAmount) * 100, 100)
    : 0

  return (
    <Link
      to="/savings-boxes"
      className="block p-4 bg-white rounded-2xl h-[176px] sm:h-[188px] border border-gray-100 overflow-hidden"
    >
      <div className="h-full flex flex-col justify-between">
        <div>
          <span className="text-[10px] text-gray-500 uppercase tracking-[0.08em] block">
            Caixinha
          </span>

          <strong className="text-gray-800 font-semibold tracking-[-0.5px] mt-1 block line-clamp-2">
            {data.name}
          </strong>
        </div>

        <div className="space-y-2">
          <div>
            <span className={cn('text-gray-800 text-xl font-semibold tracking-[-0.5px] block', !areValuesVisible && 'blur-md')}>
              {formatCurrency(data.currentBalance)}
            </span>
            <span className="text-gray-600 text-sm">Saldo guardado</span>
          </div>

          <div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-700"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-gray-600">Progresso</span>
              <span className="text-xs font-medium text-gray-800">
                {data.targetAmount ? `${progress.toFixed(0)}%` : 'Sem meta'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
import { EyeIcon } from '../../../../components/icons/EyeIcon'
import { cn } from '../../../../../app/utils/cn'
import { formatCurrency } from '../../../../../app/utils/formatCurrency'

interface TotalBalanceHeaderProps {
  currentBalance: number
  areValuesVisible: boolean
  onToggleValueVisibility(): void
}

export function TotalBalanceHeader({
  currentBalance,
  areValuesVisible,
  onToggleValueVisibility,
}: TotalBalanceHeaderProps) {
  return (
    <div>
      <span className="tracking-[-0.5px] text-white block">Saldo Total</span>

      <div className="flex items-center gap-2">
        <strong
          className={cn(
            'text-2xl tracking-[-1px] text-white',
            !areValuesVisible && 'blur-md'
          )}
        >
          {formatCurrency(currentBalance)}
        </strong>

        <button
          className="w-8 h-8 flex items-center justify-center"
          onClick={onToggleValueVisibility}
        >
          <EyeIcon open={!areValuesVisible} />
        </button>
      </div>
    </div>
  )
}
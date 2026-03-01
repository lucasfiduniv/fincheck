import { BankAccount } from '../../../../../../app/entities/BankAccount'
import { cn } from '../../../../../../app/utils/cn'
import { formatCurrency } from '../../../../../../app/utils/formatCurrency'
import { resolveBankBrand } from '../../../../../../app/utils/resolveBankBrand'
import { useDashboard } from '../../DashboardContext/useDashboard'

interface AccountCardProps {
  data: BankAccount
  onClick?: (data: BankAccount) => void
}

export function AccountCard({ data, onClick }: AccountCardProps) {
  const { color, name, currentBalance } = data
  const { areValuesVisible } = useDashboard()

  const bankBrand = resolveBankBrand(name)
  const showCustomName =
    bankBrand.displayName.toLowerCase() !== name.toLowerCase().trim()

  return (
    <div
      className="p-4 bg-white rounded-2xl h-[200px] flex flex-col justify-between border-b-4"
      style={{
        borderBottomColor: color,
      }}
      role="button"
      onClick={() => onClick?.(data)}
    >
      <div>
        <img
          src={bankBrand.logoSrc}
          alt={bankBrand.displayName}
          className="h-7 w-auto"
        />

        <span className="text-[10px] text-gray-500 uppercase tracking-[0.08em] mt-4 block">
          Conta bancária
        </span>

        <strong className="text-gray-800 font-semibold tracking-[-0.5px] mt-1 block">
          {name}
        </strong>

        {showCustomName && (
          <span className="text-gray-600 text-xs tracking-[-0.3px] mt-1 block">
            Marca: {bankBrand.displayName}
          </span>
        )}
      </div>

      <div>
        <span
          className={cn(
            'text-gray-800 text-xl font-semibold tracking-[-0.5px] block',
            !areValuesVisible && 'blur-md'
          )}
        >
          {formatCurrency(currentBalance)}
        </span>
        <span className="text-gray-600 text-sm">Saldo atual</span>
      </div>
    </div>
  )
}

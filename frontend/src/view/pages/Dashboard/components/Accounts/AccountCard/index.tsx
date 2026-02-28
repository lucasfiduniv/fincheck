import { BankAccount } from '../../../../../../app/entities/BankAccount'
import { cn } from '../../../../../../app/utils/cn'
import { formatCurrency } from '../../../../../../app/utils/formatCurrency'
import { useDashboard } from '../../DashboardContext/useDashboard'

interface AccountCardProps {
  data: BankAccount
}

interface BankBrand {
  displayName: string
  logoSrc: string
  aliases: string[]
}

const BANK_BRANDS: BankBrand[] = [
  {
    displayName: 'Nubank',
    logoSrc: '/bancos/nubank.svg',
    aliases: ['nubank', 'nu bank', 'nu'],
  },
  {
    displayName: 'Sicoob',
    logoSrc: '/bancos/sicoob.svg',
    aliases: ['sicoob'],
  },
]

function resolveBankBrand(accountName: string) {
  const normalizedName = accountName.toLowerCase().trim()

  const matchedBrand = BANK_BRANDS.find((brand) =>
    brand.aliases.some((alias) => normalizedName.includes(alias))
  )

  if (matchedBrand) {
    return matchedBrand
  }

  return {
    displayName: accountName,
    logoSrc: '/bancos/default-bank.svg',
  }
}

export function AccountCard({ data }: AccountCardProps) {
  const { color, name, currentBalance } = data
  const { areValuesVisible, openEditAccountModal } = useDashboard()

  const bankBrand = resolveBankBrand(name)
  const showCustomName =
    bankBrand.displayName.toLowerCase() !== name.toLowerCase().trim()

  return (
    <div
      className="relative overflow-hidden p-4 rounded-2xl h-[200px] flex flex-col justify-between border border-gray-100 bg-cover bg-center"
      style={{
        borderBottomColor: color,
        backgroundImage: `linear-gradient(135deg, ${color}1A 0%, transparent 55%), url('/face=front.svg')`,
      }}
      role="button"
      onClick={() => openEditAccountModal(data)}
    >
      <div className="relative z-10">
        <img
          src={bankBrand.logoSrc}
          alt={bankBrand.displayName}
          className="h-8 w-auto"
        />

       
        {showCustomName && (
          <span className="text-gray-600 text-xs tracking-[-0.3px] block">
            {name}
          </span>
        )}
      </div>

      <div className="relative z-10">
        <span
          className={cn(
            'text-gray-800 font-medium tracking-[-0.5px] block',
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

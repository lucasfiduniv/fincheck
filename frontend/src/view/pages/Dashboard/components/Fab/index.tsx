import { PlusIcon } from '@radix-ui/react-icons'
import { DropdownMenu } from '../../../../components/DropdownMenu'
import { CategoryIcon } from '../../../../components/icons/categories/CategoryIcon'
import { BankAccountIcon } from '../../../../components/icons/BankAccountIcon'
import { useDashboard } from '../DashboardContext/useDashboard'

interface FabAction {
  label: string
  onSelect(): void
  renderIcon(): React.ReactNode
}

export function Fab() {
  const {
    openNewAccountModal,
    openNewTransactionModal,
    openNewTransferModal,
    openCategoriesModal,
    openNewCreditCardModal,
    openNewCreditCardPurchaseModal,
    openPayCreditCardStatementModal,
  } = useDashboard()

  const actions: FabAction[] = [
    {
      label: 'Nova Despesa',
      onSelect: () => openNewTransactionModal('EXPENSE'),
      renderIcon: () => <CategoryIcon type="EXPENSE" />,
    },
    {
      label: 'Nova Receita',
      onSelect: () => openNewTransactionModal('INCOME'),
      renderIcon: () => <CategoryIcon type="INCOME" />,
    },
    {
      label: 'Nova Conta',
      onSelect: openNewAccountModal,
      renderIcon: () => (
        <div className="flex items-center justify-center">
          <BankAccountIcon />
        </div>
      ),
    },
    {
      label: 'Transferência',
      onSelect: openNewTransferModal,
      renderIcon: () => <BankAccountIcon />,
    },
    {
      label: 'Categorias',
      onSelect: openCategoriesModal,
      renderIcon: () => <CategoryIcon type="EXPENSE" />,
    },
    {
      label: 'Novo Cartão',
      onSelect: openNewCreditCardModal,
      renderIcon: () => <CategoryIcon type="INCOME" />,
    },
    {
      label: 'Compra no Cartão',
      onSelect: openNewCreditCardPurchaseModal,
      renderIcon: () => <CategoryIcon type="EXPENSE" />,
    },
    {
      label: 'Pagar Fatura',
      onSelect: openPayCreditCardStatementModal,
      renderIcon: () => <BankAccountIcon />,
    },
  ]

  return (
    <div className="fixed right-4 bottom-4">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <div className="bg-teal-900 w-12 h-12 rounded-full flex items-center justify-center text-white">
            <PlusIcon className="w-6 h-6" />
          </div>
        </DropdownMenu.Trigger>

        <DropdownMenu.Content className="data-[side=bottom]:animate-slide-down-and-fade">
          {actions.map((action) => (
            <DropdownMenu.Item key={action.label} className="gap-2" onSelect={action.onSelect}>
              {action.renderIcon()}
              {action.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  )
}

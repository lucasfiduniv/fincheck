import { Logo } from '../../components/Logo'
import { UserMenu } from '../../components/UserMenu'
import { Accounts } from './components/Accounts'
import { DashboardProvider } from './components/DashboardContext'
import { useDashboard } from './components/DashboardContext/useDashboard'
import { Fab } from './components/Fab'
import { Transactions } from './components/Transactions'
import { CategoriesModal } from './modals/CategoriesModal'
import { EditAccountModal } from './modals/EditAccountModal'
import { NewAccountModal } from './modals/NewAccountModal'
import { NewTransactionModal } from './modals/NewTransactionModal'
import { NewTransferModal } from './modals/NewTransferModal'
import { NewCreditCardModal } from './modals/NewCreditCardModal'
import { NewCreditCardPurchaseModal } from './modals/NewCreditCardPurchaseModal'
import { PayCreditCardStatementModal } from './modals/PayCreditCardStatementModal'
import { EditCreditCardModal } from './modals/EditCreditCardModal'

function DashboardContent() {
  const { accountBeingEdited, creditCardBeingEdited } = useDashboard()

  return (
    <div className="w-full h-full p-4 lg:px-8 lg:pt-6 lg:pb-8 flex flex-col gap-4">
      <header className="min-h-[48px] flex items-center justify-between gap-3">
        <Logo className="h-6 text-teal-900" />
        <UserMenu />
      </header>

      <main className="flex-1 flex flex-col lg:flex-row gap-4 max-h-full">
        <div className="w-full lg:w-1/2">
          <Accounts />
        </div>

        <div className="w-full lg:w-1/2">
          <Transactions />
        </div>
      </main>

      <Fab />

      <NewAccountModal />
      <NewTransactionModal />
      <NewTransferModal />
      <NewCreditCardModal />
      <NewCreditCardPurchaseModal />
      <PayCreditCardStatementModal />
      <CategoriesModal />
      {accountBeingEdited && <EditAccountModal />}
      {creditCardBeingEdited && <EditCreditCardModal />}
    </div>
  )
}

export function Dashboard() {
  return (
    <DashboardProvider>
      <DashboardContent />
    </DashboardProvider>
  )
}

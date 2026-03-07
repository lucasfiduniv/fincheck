import 'swiper/css'

import { useAccountsController } from './useAccountsController'
import { Spinner } from '../../../../components/Spinner'
import { useCreditCards } from '../../../../../app/hooks/useCreditCards'
import { useSavingsBoxes } from '../../../../../app/hooks/useSavingsBoxes'
import { SummaryModal } from './SummaryModal'
import { ConfirmDeleteModal } from '../../../../components/ConfirmDeleteModal'
import { useAccountsSummaryController } from './useAccountsSummaryController'
import { TotalBalanceHeader } from './TotalBalanceHeader'
import { EmptyAccountsState } from './EmptyAccountsState'
import { AccountsAndCardsList } from './AccountsAndCardsList'
import { EditCreditCardPurchaseModal } from '../../modals/EditCreditCardPurchaseModal'

export function Accounts() {
  const {
    sliderState,
    setSliderState,
    windowWidth,
    areValuesVisible,
    toggleValueVisibility,
    isLoading,
    accounts,
    openNewAccountModal,
    openNewCreditCardModal,
    currentBalance
  } = useAccountsController()

  const {
    selectedAccount,
    selectedCreditCard,
    purchaseBeingEdited,
    confirmAction,
    isRemovingAccount,
    isRemovingCreditCard,
    handleOpenAccountSummary,
    handleOpenCreditCardSummary,
    handleCloseSummary,
    handleOpenEditPurchaseFromSummary,
    handleCloseEditPurchaseModal,
    handleOpenConfirmDeleteAccount,
    handleOpenConfirmDeleteCard,
    handleCloseConfirmModal,
    handleEditAccountFromSummary,
    handleCreateTransactionFromSummary,
    handleEditCreditCardFromSummary,
    handleNewPurchaseFromSummary,
    handlePayStatementFromSummary,
    handleDeleteAccount,
    handleDeleteCreditCard,
  } = useAccountsSummaryController()

  const { creditCards } = useCreditCards()
  const { savingsBoxes, isLoadingSavingsBoxes } = useSavingsBoxes()
  const hasAnyFinancialItem =
    accounts.length > 0 || creditCards.length > 0 || savingsBoxes.length > 0

  if (isLoading || isLoadingSavingsBoxes) {
    return (
      <div className="bg-teal-900 rounded-2xl w-full h-full px-4 py-8 lg:p-10 flex flex-col">
        <div className="w-full h-full flex items-center justify-center">
          <Spinner className="text-teal-950/50 fill-white w-10 h-10" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-teal-900 rounded-2xl w-full h-full px-4 py-8 lg:p-10 flex flex-col overflow-hidden">
      {confirmAction === 'DELETE_ACCOUNT' && (
        <ConfirmDeleteModal
          title="Tem certeza que deseja excluir esta conta?"
          description="Ao excluir a conta, também serão excluídos todos os registros de receitas e despesas relacionados."
          isLoading={isRemovingAccount}
          onClose={handleCloseConfirmModal}
          onConfirm={handleDeleteAccount}
        />
      )}

      {confirmAction === 'DELETE_CARD' && (
        <ConfirmDeleteModal
          title="Tem certeza que deseja excluir este cartão?"
          description="Ao excluir o cartão, também serão removidas as compras e faturas vinculadas a ele."
          isLoading={isRemovingCreditCard}
          onClose={handleCloseConfirmModal}
          onConfirm={handleDeleteCreditCard}
        />
      )}

      <SummaryModal
        open={(!!selectedAccount || !!selectedCreditCard) && !confirmAction}
        onClose={handleCloseSummary}
        account={selectedAccount}
        creditCard={selectedCreditCard}
        onEditAccount={handleEditAccountFromSummary}
        onDeleteAccount={handleOpenConfirmDeleteAccount}
        onCreateTransaction={handleCreateTransactionFromSummary}
        onEditCreditCard={handleEditCreditCardFromSummary}
        onNewCreditCardPurchase={handleNewPurchaseFromSummary}
        onPayCreditCardStatement={handlePayStatementFromSummary}
        onEditCreditCardPurchase={handleOpenEditPurchaseFromSummary}
        onDeactivateCreditCard={handleOpenConfirmDeleteCard}
        isDeletingAccount={isRemovingAccount && confirmAction === 'DELETE_ACCOUNT'}
        isDeactivatingCreditCard={isRemovingCreditCard && confirmAction === 'DELETE_CARD'}
      />

      <EditCreditCardPurchaseModal
        open={!!purchaseBeingEdited}
        onClose={handleCloseEditPurchaseModal}
        purchase={purchaseBeingEdited}
      />

      <TotalBalanceHeader
        currentBalance={currentBalance}
        areValuesVisible={areValuesVisible}
        onToggleValueVisibility={toggleValueVisibility}
      />

      <div className="flex-1 min-h-0 mt-4 lg:mt-0">
        {!hasAnyFinancialItem && (
          <EmptyAccountsState onCreateAccount={openNewAccountModal} />
        )}
        {hasAnyFinancialItem && (
          <AccountsAndCardsList
            accounts={accounts}
            creditCards={creditCards}
            savingsBoxes={savingsBoxes}
            sliderState={sliderState}
            onSliderChange={setSliderState}
            slidesPerView={windowWidth >= 500 ? 2.1 : 1.2}
            onOpenAccountSummary={handleOpenAccountSummary}
            onOpenCreditCardSummary={handleOpenCreditCardSummary}
            onCreateAccount={openNewAccountModal}
            onCreateCreditCard={openNewCreditCardModal}
          />
        )}
      </div>
    </div>
  )
}

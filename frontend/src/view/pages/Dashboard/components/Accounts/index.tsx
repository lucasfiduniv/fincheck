import { Swiper, SwiperSlide } from 'swiper/react'
import 'swiper/css'

import { EyeIcon } from '../../../../components/icons/EyeIcon'
import { AccountCard } from './AccountCard'
import { SliderNavigation } from './SliderNavigation'
import { useAccountsController } from './useAccountsController'
import { useWindowWidth } from '../../../../../app/hooks/useWindowWidth'
import { formatCurrency } from '../../../../../app/utils/formatCurrency'
import { cn } from '../../../../../app/utils/cn'
import { Spinner } from '../../../../components/Spinner'
import { PlusIcon } from '@radix-ui/react-icons'
import { useCreditCards } from '../../../../../app/hooks/useCreditCards'
import { CreditCardCard } from './CreditCardCard'
import { useState } from 'react'
import { BankAccount } from '../../../../../app/entities/BankAccount'
import { CreditCard } from '../../../../../app/entities/CreditCard'
import { SummaryModal } from './SummaryModal'
import { useDashboard } from '../DashboardContext/useDashboard'
import { ConfirmDeleteModal } from '../../../../components/ConfirmDeleteModal'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { bankAccountsService } from '../../../../../app/services/bankAccounts'
import toast from 'react-hot-toast'
import { creditCardsService } from '../../../../../app/services/creditCardsService'

export function Accounts() {
  const {
    sliderState,
    setSliderState,
    areValuesVisible,
    toggleValueVisibility,
    isLoading,
    accounts,
    openNewAccountModal,
    currentBalance
  } = useAccountsController()
  const {
    openEditAccountModal,
    openNewTransactionModal,
    openEditCreditCardModal,
    openNewCreditCardPurchaseModal,
    openPayCreditCardStatementModal,
  } = useDashboard()
  const { creditCards } = useCreditCards()
  const queryClient = useQueryClient()
  const windowWidth = useWindowWidth()
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null)
  const [selectedCreditCard, setSelectedCreditCard] = useState<CreditCard | null>(null)
  const [confirmAction, setConfirmAction] = useState<'DELETE_ACCOUNT' | 'DEACTIVATE_CARD' | null>(null)

  const { mutateAsync: removeAccount, isLoading: isRemovingAccount } = useMutation(bankAccountsService.remove)
  const { mutateAsync: updateCreditCard, isLoading: isUpdatingCreditCard } = useMutation(creditCardsService.update)

  function handleOpenAccountSummary(account: BankAccount) {
    setSelectedCreditCard(null)
    setSelectedAccount(account)
  }

  function handleOpenCreditCardSummary(creditCard: CreditCard) {
    setSelectedAccount(null)
    setSelectedCreditCard(creditCard)
  }

  function handleCloseSummary() {
    setSelectedAccount(null)
    setSelectedCreditCard(null)
  }

  function handleOpenConfirmDeleteAccount() {
    setConfirmAction('DELETE_ACCOUNT')
  }

  function handleOpenConfirmDeactivateCard() {
    setConfirmAction('DEACTIVATE_CARD')
  }

  function handleCloseConfirmModal() {
    setConfirmAction(null)
  }

  function handleEditAccountFromSummary() {
    if (!selectedAccount) {
      return
    }

    openEditAccountModal(selectedAccount)
    handleCloseSummary()
  }

  function handleCreateTransactionFromSummary() {
    if (!selectedAccount) {
      return
    }

    openNewTransactionModal('EXPENSE', selectedAccount.id)
    handleCloseSummary()
  }

  function handleEditCreditCardFromSummary() {
    if (!selectedCreditCard) {
      return
    }

    openEditCreditCardModal(selectedCreditCard)
    handleCloseSummary()
  }

  function handleNewPurchaseFromSummary() {
    if (!selectedCreditCard) {
      return
    }

    openNewCreditCardPurchaseModal(selectedCreditCard.id)
    handleCloseSummary()
  }

  function handlePayStatementFromSummary() {
    if (!selectedCreditCard) {
      return
    }

    openPayCreditCardStatementModal(selectedCreditCard.id)
    handleCloseSummary()
  }

  async function handleDeleteAccount() {
    if (!selectedAccount) {
      return
    }

    try {
      await removeAccount(selectedAccount.id)

      queryClient.invalidateQueries({ queryKey: ['bankAccounts'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      toast.success('Conta excluída com sucesso!')

      handleCloseConfirmModal()
      handleCloseSummary()
    } catch {
      toast.error('Erro ao excluir conta!')
    }
  }

  async function handleDeactivateCreditCard() {
    if (!selectedCreditCard) {
      return
    }

    try {
      await updateCreditCard({ id: selectedCreditCard.id, isActive: false })

      queryClient.invalidateQueries({ queryKey: ['creditCards'] })
      queryClient.invalidateQueries({ queryKey: ['creditCardStatement'] })
      toast.success('Cartão inativado com sucesso!')

      handleCloseConfirmModal()
      handleCloseSummary()
    } catch {
      toast.error('Erro ao inativar cartão!')
    }
  }

  if (isLoading) {
    return (
      <div className="bg-teal-900 rounded-2xl w-full h-full px-4 py-8 lg:p-10 flex flex-col">
        <div className="w-full h-full flex items-center justify-center">
          <Spinner className="text-teal-950/50 fill-white w-10 h-10" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-teal-900 rounded-2xl w-full h-full px-4 py-8 lg:p-10 flex flex-col">
      {confirmAction === 'DELETE_ACCOUNT' && (
        <ConfirmDeleteModal
          title="Tem certeza que deseja excluir esta conta?"
          description="Ao excluir a conta, também serão excluídos todos os registros de receitas e despesas relacionados."
          isLoading={isRemovingAccount}
          onClose={handleCloseConfirmModal}
          onConfirm={handleDeleteAccount}
        />
      )}

      {confirmAction === 'DEACTIVATE_CARD' && (
        <ConfirmDeleteModal
          title="Tem certeza que deseja inativar este cartão?"
          description="Você ainda poderá consultar faturas e histórico, mas novas compras serão bloqueadas."
          isLoading={isUpdatingCreditCard}
          onClose={handleCloseConfirmModal}
          onConfirm={handleDeactivateCreditCard}
        />
      )}

      <SummaryModal
        open={!!selectedAccount || !!selectedCreditCard}
        onClose={handleCloseSummary}
        account={selectedAccount}
        creditCard={selectedCreditCard}
        onEditAccount={handleEditAccountFromSummary}
        onDeleteAccount={handleOpenConfirmDeleteAccount}
        onCreateTransaction={handleCreateTransactionFromSummary}
        onEditCreditCard={handleEditCreditCardFromSummary}
        onNewCreditCardPurchase={handleNewPurchaseFromSummary}
        onPayCreditCardStatement={handlePayStatementFromSummary}
        onDeactivateCreditCard={handleOpenConfirmDeactivateCard}
        isDeletingAccount={isRemovingAccount && confirmAction === 'DELETE_ACCOUNT'}
        isDeactivatingCreditCard={isUpdatingCreditCard && confirmAction === 'DEACTIVATE_CARD'}
      />

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
            onClick={toggleValueVisibility}
          >
            <EyeIcon open={!areValuesVisible} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-end mt-10 lg:mt-0">
        {accounts.length === 0 && (
          <>
            <div className="mb-4" slot="container-start">
              <strong className="text-white tracking-[-1px] text-lg font-bold">
                Minhas contas
              </strong>
            </div>

            <button
              className="mt-4 h-52 rounded-2xl border-2 border-dashed border-teal-600 flex flex-col justify-center items-center gap-4 text-white hover:bg-teal-950/5 transition-colors"
              onClick={openNewAccountModal}
            >
              <div className="w-11 h-11 rounded-full border-2 border-dashed border-white flex items-center justify-center">
                <PlusIcon className="w-6 h-6" />
              </div>
              <span className="tracking-[-0.5px] font-medium w-32 text-center">
                Cadastre uma nova conta
              </span>
            </button>
          </>
        )}
        {accounts.length > 0 && (
          <div className="space-y-6">
            <Swiper
              spaceBetween={16}
              slidesPerView={windowWidth >= 500 ? 2.1 : 1.2}
              onSlideChange={swiper => {
                setSliderState({
                  isBeginning: swiper.isBeginning,
                  isEnd: swiper.isEnd
                })
              }}
            >
              <div className="flex items-center justify-between mb-4" slot="container-start">
                <strong className="text-white tracking-[-1px] text-lg font-bold">
                  Minhas contas
                </strong>

                <SliderNavigation
                  isBeginning={sliderState.isBeginning}
                  isEnd={sliderState.isEnd}
                />
              </div>

              {accounts.map(account => (
                <SwiperSlide key={account.id}>
                  <AccountCard data={account} onClick={handleOpenAccountSummary} />
                </SwiperSlide>
              ))}
            </Swiper>

            {creditCards.length > 0 && (
              <div>
                <strong className="text-white tracking-[-1px] text-lg font-bold block mb-3">
                  Meus cartões
                </strong>

                <div className="flex gap-4 overflow-x-auto pb-2">
                  {creditCards.map((creditCard) => (
                    <div key={creditCard.id} className="min-w-[280px] max-w-[320px] flex-1">
                      <CreditCardCard
                        data={creditCard}
                        onClick={handleOpenCreditCardSummary}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

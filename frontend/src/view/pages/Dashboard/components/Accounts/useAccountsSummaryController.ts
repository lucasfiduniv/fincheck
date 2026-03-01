import { useState } from 'react'
import { BankAccount } from '../../../../../app/entities/BankAccount'
import { CreditCard } from '../../../../../app/entities/CreditCard'
import { useDashboard } from '../DashboardContext/useDashboard'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { bankAccountsService } from '../../../../../app/services/bankAccounts'
import toast from 'react-hot-toast'
import { creditCardsService } from '../../../../../app/services/creditCardsService'

type ConfirmAction = 'DELETE_ACCOUNT' | 'DEACTIVATE_CARD' | null

export function useAccountsSummaryController() {
  const {
    openEditAccountModal,
    openNewTransactionModal,
    openEditCreditCardModal,
    openNewCreditCardPurchaseModal,
    openPayCreditCardStatementModal,
  } = useDashboard()

  const queryClient = useQueryClient()

  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null)
  const [selectedCreditCard, setSelectedCreditCard] = useState<CreditCard | null>(null)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null)

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

  return {
    selectedAccount,
    selectedCreditCard,
    confirmAction,
    isRemovingAccount,
    isUpdatingCreditCard,
    handleOpenAccountSummary,
    handleOpenCreditCardSummary,
    handleCloseSummary,
    handleOpenConfirmDeleteAccount,
    handleOpenConfirmDeactivateCard,
    handleCloseConfirmModal,
    handleEditAccountFromSummary,
    handleCreateTransactionFromSummary,
    handleEditCreditCardFromSummary,
    handleNewPurchaseFromSummary,
    handlePayStatementFromSummary,
    handleDeleteAccount,
    handleDeactivateCreditCard,
  }
}
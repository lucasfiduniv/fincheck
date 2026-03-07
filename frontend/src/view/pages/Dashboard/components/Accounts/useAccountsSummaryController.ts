import { useState } from 'react'
import { BankAccount } from '../../../../../app/entities/BankAccount'
import { CreditCard, CreditCardStatementInstallment } from '../../../../../app/entities/CreditCard'
import { useDashboard } from '../DashboardContext/useDashboard'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { bankAccountsService } from '../../../../../app/services/bankAccounts'
import toast from 'react-hot-toast'
import { creditCardsService } from '../../../../../app/services/creditCardsService'

type ConfirmAction = 'DELETE_ACCOUNT' | 'DELETE_CARD' | null

interface PurchaseBeingEdited {
  creditCardId: string
  purchaseId: string
  description: string
  purchaseDate: string
  purchaseAmount: number
  categoryId?: string | null
  fuelVehicleId?: string | null
  fuelOdometer?: number | null
  fuelLiters?: number | null
  fuelPricePerLiter?: number | null
  fuelFillType?: 'FULL' | 'PARTIAL' | null
  fuelFirstPumpClick?: boolean | null
  maintenanceVehicleId?: string | null
  maintenanceOdometer?: number | null
}

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
  const [purchaseBeingEdited, setPurchaseBeingEdited] = useState<PurchaseBeingEdited | null>(null)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null)

  const { mutateAsync: removeAccount, isLoading: isRemovingAccount } = useMutation(bankAccountsService.remove)
  const { mutateAsync: removeCreditCard, isLoading: isRemovingCreditCard } = useMutation(creditCardsService.remove)

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

  function handleOpenEditPurchaseFromSummary(purchase: CreditCardStatementInstallment) {
    if (!selectedCreditCard) {
      return
    }

    setPurchaseBeingEdited({
      creditCardId: selectedCreditCard.id,
      purchaseId: purchase.purchaseId,
      description: purchase.description,
      purchaseDate: purchase.purchaseDate,
      purchaseAmount: purchase.purchaseAmount,
      categoryId: purchase.category?.id,
      fuelVehicleId: purchase.fuelVehicleId,
      fuelOdometer: purchase.fuelOdometer,
      fuelLiters: purchase.fuelLiters,
      fuelPricePerLiter: purchase.fuelPricePerLiter,
      fuelFillType: purchase.fuelFillType,
      fuelFirstPumpClick: purchase.fuelFirstPumpClick,
      maintenanceVehicleId: purchase.maintenanceVehicleId,
      maintenanceOdometer: purchase.maintenanceOdometer,
    })
    handleCloseSummary()
  }

  function handleCloseEditPurchaseModal() {
    setPurchaseBeingEdited(null)
  }

  function handleOpenConfirmDeleteAccount() {
    setConfirmAction('DELETE_ACCOUNT')
  }

  function handleOpenConfirmDeleteCard() {
    setConfirmAction('DELETE_CARD')
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

  async function handleDeleteCreditCard() {
    if (!selectedCreditCard) {
      return
    }

    try {
      await removeCreditCard(selectedCreditCard.id)

      queryClient.invalidateQueries({ queryKey: ['creditCards'] })
      queryClient.invalidateQueries({ queryKey: ['creditCardStatement'] })
      toast.success('Cartão excluído com sucesso!')

      handleCloseConfirmModal()
      handleCloseSummary()
    } catch {
      toast.error('Erro ao excluir cartão!')
    }
  }

  return {
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
  }
}
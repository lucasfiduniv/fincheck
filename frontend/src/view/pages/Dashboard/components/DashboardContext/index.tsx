import { createContext, useCallback, useMemo, useState } from 'react'
import { BankAccount } from '../../../../../app/entities/BankAccount'
import { CreditCard } from '../../../../../app/entities/CreditCard'

type TransactionType = 'INCOME' | 'EXPENSE'

interface DashboardContextValue {
  areValuesVisible: boolean
  isNewAccountModalOpen: boolean
  isEditAccountModalOpen: boolean
  isNewTransactionModalOpen: boolean
  isCategoriesModalOpen: boolean
  isNewCreditCardModalOpen: boolean
  isNewCreditCardPurchaseModalOpen: boolean
  isPayCreditCardStatementModalOpen: boolean
  isEditCreditCardModalOpen: boolean
  accountBeingEdited: BankAccount | null
  creditCardBeingEdited: CreditCard | null
  newTransactionType: TransactionType | null
  transactionPresetBankAccountId: string | null
  creditCardPurchasePresetId: string | null
  payStatementPresetCardId: string | null
  toggleValueVisibility: () => void
  openNewAccountModal: () => void
  closeNewAccountModal: () => void
  openEditAccountModal: (bankAccount: BankAccount) => void
  closeEditAccountModal: () => void
  openNewTransactionModal: (type: TransactionType, bankAccountId?: string) => void
  closeNewTransactionModal: () => void
  openCategoriesModal: () => void
  closeCategoriesModal: () => void
  openNewCreditCardModal: () => void
  closeNewCreditCardModal: () => void
  openNewCreditCardPurchaseModal: (creditCardId?: string) => void
  closeNewCreditCardPurchaseModal: () => void
  openPayCreditCardStatementModal: (creditCardId?: string) => void
  closePayCreditCardStatementModal: () => void
  openEditCreditCardModal: (creditCard: CreditCard) => void
  closeEditCreditCardModal: () => void
}

export const DashboardContext = createContext({} as DashboardContextValue)

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [areValuesVisible, setAreValuesVisible] = useState(true)
  const [isNewAccountModalOpen, setIsNewAccountModalOpen] = useState(false)
  const [isEditAccountModalOpen, setIsEditAccountModalOpen] = useState(false)
  const [accountBeingEdited, setAccountBeingEdited] = useState<BankAccount | null>(null)
  const [isNewTransactionModalOpen, setIsNewTransactionModalOpen] = useState(false)
  const [newTransactionType, setNewTransactionType] = useState<TransactionType | null>(null)
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false)
  const [isNewCreditCardModalOpen, setIsNewCreditCardModalOpen] = useState(false)
  const [isNewCreditCardPurchaseModalOpen, setIsNewCreditCardPurchaseModalOpen] = useState(false)
  const [isPayCreditCardStatementModalOpen, setIsPayCreditCardStatementModalOpen] = useState(false)
  const [isEditCreditCardModalOpen, setIsEditCreditCardModalOpen] = useState(false)
  const [creditCardBeingEdited, setCreditCardBeingEdited] = useState<CreditCard | null>(null)
  const [transactionPresetBankAccountId, setTransactionPresetBankAccountId] = useState<string | null>(null)
  const [creditCardPurchasePresetId, setCreditCardPurchasePresetId] = useState<string | null>(null)
  const [payStatementPresetCardId, setPayStatementPresetCardId] = useState<string | null>(null)

  const toggleValueVisibility = useCallback(() => {
    setAreValuesVisible(prevState => !prevState)
  }, [])

  const openNewAccountModal = useCallback(() => {
    setIsNewAccountModalOpen(true)
  }, [])

  const closeNewAccountModal = useCallback(() => {
    setIsNewAccountModalOpen(false)
  }, [])

  const openEditAccountModal = useCallback((bankAccount: BankAccount) => {
    setAccountBeingEdited(bankAccount)
    setIsEditAccountModalOpen(true)
  }, [])

  const closeEditAccountModal = useCallback(() => {
    setAccountBeingEdited(null)
    setIsEditAccountModalOpen(false)
  }, [])

  const openNewTransactionModal = useCallback((type: TransactionType, bankAccountId?: string) => {
    setNewTransactionType(type)
    setTransactionPresetBankAccountId(bankAccountId ?? null)
    setIsNewTransactionModalOpen(true)
  }, [])

  const closeNewTransactionModal = useCallback(() => {
    setNewTransactionType(null)
    setTransactionPresetBankAccountId(null)
    setIsNewTransactionModalOpen(false)
  }, [])

  const openCategoriesModal = useCallback(() => {
    setIsCategoriesModalOpen(true)
  }, [])

  const closeCategoriesModal = useCallback(() => {
    setIsCategoriesModalOpen(false)
  }, [])

  const openNewCreditCardModal = useCallback(() => {
    setIsNewCreditCardModalOpen(true)
  }, [])

  const closeNewCreditCardModal = useCallback(() => {
    setIsNewCreditCardModalOpen(false)
  }, [])

  const openNewCreditCardPurchaseModal = useCallback((creditCardId?: string) => {
    setCreditCardPurchasePresetId(creditCardId ?? null)
    setIsNewCreditCardPurchaseModalOpen(true)
  }, [])

  const closeNewCreditCardPurchaseModal = useCallback(() => {
    setCreditCardPurchasePresetId(null)
    setIsNewCreditCardPurchaseModalOpen(false)
  }, [])

  const openPayCreditCardStatementModal = useCallback((creditCardId?: string) => {
    setPayStatementPresetCardId(creditCardId ?? null)
    setIsPayCreditCardStatementModalOpen(true)
  }, [])

  const closePayCreditCardStatementModal = useCallback(() => {
    setPayStatementPresetCardId(null)
    setIsPayCreditCardStatementModalOpen(false)
  }, [])

  const openEditCreditCardModal = useCallback((creditCard: CreditCard) => {
    setCreditCardBeingEdited(creditCard)
    setIsEditCreditCardModalOpen(true)
  }, [])

  const closeEditCreditCardModal = useCallback(() => {
    setCreditCardBeingEdited(null)
    setIsEditCreditCardModalOpen(false)
  }, [])

  const value = useMemo(
    () => ({
      areValuesVisible,
      toggleValueVisibility,
      isNewAccountModalOpen,
      isEditAccountModalOpen,
      isNewTransactionModalOpen,
      isCategoriesModalOpen,
      isNewCreditCardModalOpen,
      isNewCreditCardPurchaseModalOpen,
      isPayCreditCardStatementModalOpen,
      isEditCreditCardModalOpen,
      newTransactionType,
      transactionPresetBankAccountId,
      creditCardPurchasePresetId,
      payStatementPresetCardId,
      openNewAccountModal,
      closeNewAccountModal,
      openEditAccountModal,
      closeEditAccountModal,
      accountBeingEdited,
      creditCardBeingEdited,
      openNewTransactionModal,
      closeNewTransactionModal,
      openCategoriesModal,
      closeCategoriesModal,
      openNewCreditCardModal,
      closeNewCreditCardModal,
      openNewCreditCardPurchaseModal,
      closeNewCreditCardPurchaseModal,
      openPayCreditCardStatementModal,
      closePayCreditCardStatementModal,
      openEditCreditCardModal,
      closeEditCreditCardModal,
    }),
    [
      areValuesVisible,
      toggleValueVisibility,
      isNewAccountModalOpen,
      isEditAccountModalOpen,
      isNewTransactionModalOpen,
      isCategoriesModalOpen,
      isNewCreditCardModalOpen,
      isNewCreditCardPurchaseModalOpen,
      isPayCreditCardStatementModalOpen,
      isEditCreditCardModalOpen,
      newTransactionType,
      transactionPresetBankAccountId,
      creditCardPurchasePresetId,
      payStatementPresetCardId,
      openNewAccountModal,
      closeNewAccountModal,
      openEditAccountModal,
      closeEditAccountModal,
      accountBeingEdited,
      creditCardBeingEdited,
      openNewTransactionModal,
      closeNewTransactionModal,
      openCategoriesModal,
      closeCategoriesModal,
      openNewCreditCardModal,
      closeNewCreditCardModal,
      openNewCreditCardPurchaseModal,
      closeNewCreditCardPurchaseModal,
      openPayCreditCardStatementModal,
      closePayCreditCardStatementModal,
      openEditCreditCardModal,
      closeEditCreditCardModal,
    ],
  )

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  )
}

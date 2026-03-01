import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { useDashboard } from '../../components/DashboardContext/useDashboard'
import { useCreditCards } from '../../../../../app/hooks/useCreditCards'
import { useBankAccounts } from '../../../../../app/hooks/useBankAccounts'
import { creditCardsService } from '../../../../../app/services/creditCardsService'
import { useCreditCardStatement } from '../../../../../app/hooks/useCreditCardStatement'
import { useEffect } from 'react'
import { LINKED_BANK_ACCOUNT_OPTION } from './constants'
import { resolveOpenStatementReference } from './statementReference'

const schema = z.object({
  creditCardId: z.string().nonempty('Informe o cartão'),
  month: z.coerce.number().min(0).max(11),
  year: z.coerce.number().min(2000),
  bankAccountId: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export function usePayCreditCardStatementModalController() {
  const {
    isPayCreditCardStatementModalOpen: isOpen,
    closePayCreditCardStatementModal: onClose,
    payStatementPresetCardId,
  } = useDashboard()
  const { creditCards } = useCreditCards()
  const { accounts } = useBankAccounts()
  const queryClient = useQueryClient()

  const {
    register,
    control,
    handleSubmit: hookFormSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      month: new Date().getMonth(),
      year: new Date().getFullYear(),
      bankAccountId: LINKED_BANK_ACCOUNT_OPTION,
    },
  })

  const selectedCardId = watch('creditCardId')
  const selectedMonth = watch('month')
  const selectedYear = watch('year')

  const {
    statement,
    isLoadingStatement,
  } = useCreditCardStatement({
    creditCardId: selectedCardId,
    month: selectedMonth,
    year: selectedYear,
  })

  const { mutateAsync, isLoading } = useMutation(creditCardsService.payStatement)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const defaultCreditCardId = payStatementPresetCardId ?? creditCards[0]?.id

    if (!defaultCreditCardId) {
      return
    }

    setValue('creditCardId', defaultCreditCardId)
  }, [isOpen, payStatementPresetCardId, creditCards, setValue])

  useEffect(() => {
    if (!isOpen || !selectedCardId) {
      return
    }

    let isMounted = true

    async function syncOpenStatementReference() {
      const reference = await resolveOpenStatementReference({
        creditCardId: selectedCardId,
        getStatementByMonth: creditCardsService.getStatementByMonth,
      })

      if (!isMounted) {
        return
      }

      setValue('month', reference.month)
      setValue('year', reference.year)
    }

    syncOpenStatementReference()

    return () => {
      isMounted = false
    }
  }, [isOpen, selectedCardId, setValue])

  const handleSubmit = hookFormSubmit(async (data) => {
    try {
      await mutateAsync({
        creditCardId: data.creditCardId,
        month: data.month,
        year: data.year,
        bankAccountId:
          !data.bankAccountId || data.bankAccountId === LINKED_BANK_ACCOUNT_OPTION
            ? undefined
            : data.bankAccountId,
      })

      queryClient.invalidateQueries({ queryKey: ['creditCards'] })
      queryClient.invalidateQueries({ queryKey: ['bankAccounts'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['creditCardStatement'] })

      toast.success('Fatura paga com sucesso!')
      onClose()
      reset()
    } catch {
      toast.error('Erro ao pagar fatura!')
    }
  })

  return {
    isOpen,
    onClose,
    register,
    control,
    handleSubmit,
    errors,
    isLoading,
    creditCards,
    accounts,
    statement,
    isLoadingStatement,
  }
}

import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { useDashboard } from '../../components/DashboardContext/useDashboard'
import { useCategories } from '../../../../../app/hooks/useCategories'
import { useCreditCards } from '../../../../../app/hooks/useCreditCards'
import { creditCardsService } from '../../../../../app/services/creditCardsService'
import { currencyStringToNumber } from '../../../../../app/utils/currencyStringToNumber'
import { useEffect } from 'react'
import { toUTCDateISOString } from '../../../../../app/utils/toUTCDateISOString'

const schema = z.object({
  creditCardId: z.string().nonempty('Informe o cartão'),
  description: z.string().nonempty('Informe a descrição'),
  amount: z.union([z.string().nonempty('Informe o valor'), z.number()]),
  purchaseDate: z.date(),
  categoryId: z.string(),
  installmentCount: z.coerce.number().min(1).max(360),
})

type FormData = z.infer<typeof schema>

export function useNewCreditCardPurchaseModalController() {
  const {
    isNewCreditCardPurchaseModalOpen: isOpen,
    closeNewCreditCardPurchaseModal: onClose,
    creditCardPurchasePresetId,
  } = useDashboard()
  const { categories: allCategories } = useCategories()
  const { creditCards } = useCreditCards()
  const queryClient = useQueryClient()

  const {
    register,
    control,
    handleSubmit: hookFormSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      purchaseDate: new Date(),
      installmentCount: 1,
      categoryId: 'NONE',
      amount: '0',
    },
  })

  const { mutateAsync, isLoading } = useMutation(creditCardsService.createPurchase)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    if (creditCardPurchasePresetId) {
      setValue('creditCardId', creditCardPurchasePresetId)
    }
  }, [creditCardPurchasePresetId, isOpen, setValue])

  const handleSubmit = hookFormSubmit(async (data) => {
    try {
      await mutateAsync({
        creditCardId: data.creditCardId,
        description: data.description,
        amount: currencyStringToNumber(data.amount),
        purchaseDate: toUTCDateISOString(data.purchaseDate),
        categoryId: data.categoryId === 'NONE' ? undefined : data.categoryId,
        installmentCount: data.installmentCount,
      })

      queryClient.invalidateQueries({ queryKey: ['creditCards'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      toast.success('Compra lançada com sucesso!')
      onClose()
      reset()
    } catch {
      toast.error('Erro ao lançar compra no cartão!')
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
    categories: allCategories.filter((category) => category.type === 'EXPENSE'),
    creditCards,
  }
}

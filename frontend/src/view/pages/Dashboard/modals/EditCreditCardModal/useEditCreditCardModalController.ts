import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { useDashboard } from '../../components/DashboardContext/useDashboard'
import { useBankAccounts } from '../../../../../app/hooks/useBankAccounts'
import { creditCardsService } from '../../../../../app/services/creditCardsService'
import { currencyStringToNumber } from '../../../../../app/utils/currencyStringToNumber'

const schema = z.object({
  name: z.string().nonempty('Informe o nome'),
  brand: z.string().optional(),
  color: z.string().nonempty('Informe a cor'),
  bankAccountId: z.string().nonempty('Informe a conta vinculada'),
  creditLimit: z.union([z.string().nonempty('Informe o limite'), z.number()]),
  closingDay: z.coerce.number().min(1).max(31),
  dueDay: z.coerce.number().min(1).max(31),
  isActive: z.enum(['true', 'false']),
})

type FormData = z.infer<typeof schema>

export function useEditCreditCardModalController() {
  const {
    isEditCreditCardModalOpen: open,
    closeEditCreditCardModal: onClose,
    creditCardBeingEdited,
  } = useDashboard()
  const { accounts } = useBankAccounts()
  const queryClient = useQueryClient()

  const {
    register,
    control,
    handleSubmit: hookFormSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: creditCardBeingEdited?.name,
      brand: creditCardBeingEdited?.brand ?? undefined,
      color: creditCardBeingEdited?.color,
      bankAccountId: creditCardBeingEdited?.bankAccountId,
      creditLimit: creditCardBeingEdited?.creditLimit,
      closingDay: creditCardBeingEdited?.closingDay,
      dueDay: creditCardBeingEdited?.dueDay,
      isActive: creditCardBeingEdited?.isActive ? 'true' : 'false',
    },
  })

  const { mutateAsync, isLoading } = useMutation(creditCardsService.update)

  const handleSubmit = hookFormSubmit(async (data) => {
    if (!creditCardBeingEdited) return

    try {
      await mutateAsync({
        id: creditCardBeingEdited.id,
        ...data,
        brand: data.brand || undefined,
        creditLimit: currencyStringToNumber(data.creditLimit),
        isActive: data.isActive === 'true',
      })

      queryClient.invalidateQueries({ queryKey: ['creditCards'] })
      toast.success('Cartão atualizado com sucesso!')
      onClose()
    } catch {
      toast.error('Erro ao atualizar cartão!')
    }
  })

  return {
    open,
    onClose,
    register,
    control,
    handleSubmit,
    errors,
    isLoading,
    accounts,
  }
}

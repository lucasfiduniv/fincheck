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
  name: z.string().nonempty('Informe o nome do cartão'),
  brand: z.string().optional(),
  color: z.string().nonempty('Informe uma cor'),
  bankAccountId: z.string().nonempty('Informe a conta vinculada'),
  creditLimit: z.union([z.string().nonempty('Informe o limite'), z.number()]),
  closingDay: z.coerce.number().min(1).max(31),
  dueDay: z.coerce.number().min(1).max(31),
})

type FormData = z.infer<typeof schema>

export function useNewCreditCardModalController() {
  const { isNewCreditCardModalOpen: isOpen, closeNewCreditCardModal: onClose } = useDashboard()
  const { accounts } = useBankAccounts()
  const queryClient = useQueryClient()

  const {
    register,
    control,
    handleSubmit: hookFormSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      color: '#115E59',
      closingDay: 10,
      dueDay: 17,
      creditLimit: '0',
    },
  })

  const { mutateAsync, isLoading } = useMutation(creditCardsService.create)

  const handleSubmit = hookFormSubmit(async (data) => {
    try {
      await mutateAsync({
        ...data,
        creditLimit: currencyStringToNumber(data.creditLimit),
        brand: data.brand || undefined,
      })

      queryClient.invalidateQueries({ queryKey: ['creditCards'] })
      toast.success('Cartão cadastrado com sucesso!')
      onClose()
      reset()
    } catch {
      toast.error('Erro ao cadastrar cartão!')
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
    accounts,
  }
}

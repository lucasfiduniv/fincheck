import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useDashboard } from '../../components/DashboardContext/useDashboard'
import { useBankAccounts } from '../../../../../app/hooks/useBankAccounts'
import { transactionsService } from '../../../../../app/services/transactionsService'
import { currencyStringToNumber } from '../../../../../app/utils/currencyStringToNumber'
import { toUTCDateISOString } from '../../../../../app/utils/toUTCDateISOString'
import { toast } from 'react-hot-toast'

const schema = z
  .object({
    fromBankAccountId: z.string().nonempty('Selecione a conta de origem'),
    toBankAccountId: z.string().nonempty('Selecione a conta de destino'),
    value: z.union([z.string().nonempty('Informe o valor'), z.number()]),
    date: z.date(),
    description: z.string().optional(),
  })
  .refine((data) => data.fromBankAccountId !== data.toBankAccountId, {
    path: ['toBankAccountId'],
    message: 'A conta de destino deve ser diferente da origem',
  })

type FormData = z.infer<typeof schema>

export function useNewTransferModalController() {
  const { isNewTransferModalOpen, closeNewTransferModal } = useDashboard()
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
      value: '',
      date: new Date(),
      description: 'Transferência entre contas',
    },
  })

  const { mutateAsync, isLoading } = useMutation(transactionsService.createTransfer)

  const handleSubmit = hookFormSubmit(async (data) => {
    try {
      await mutateAsync({
        fromBankAccountId: data.fromBankAccountId,
        toBankAccountId: data.toBankAccountId,
        value: currencyStringToNumber(data.value),
        date: toUTCDateISOString(data.date),
        description: data.description,
      })

      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['bankAccounts'] })

      toast.success('Transferência realizada com sucesso!')
      closeNewTransferModal()
      reset({
        value: '',
        date: new Date(),
        description: 'Transferência entre contas',
        fromBankAccountId: '',
        toBankAccountId: '',
      })
    } catch {
      toast.error('Erro ao realizar transferência!')
    }
  })

  return {
    isOpen: isNewTransferModalOpen,
    onClose: closeNewTransferModal,
    register,
    control,
    errors,
    handleSubmit,
    isLoading,
    accounts,
  }
}

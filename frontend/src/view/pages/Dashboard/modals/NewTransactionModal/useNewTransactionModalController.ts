import { z } from 'zod'
import { useDashboard } from '../../components/DashboardContext/useDashboard'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useBankAccounts } from '../../../../../app/hooks/useBankAccounts'
import { useCategories } from '../../../../../app/hooks/useCategories'
import { useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { transactionsService } from '../../../../../app/services/transactionsService'
import { toast } from 'react-hot-toast'
import { currencyStringToNumber } from '../../../../../app/utils/currencyStringToNumber'

const schema = z.object({
  value: z.
    union([z.string().nonempty('Informe o valor'), z.number()])
    .transform((val, ctx) => {
      if (val === 0 || val === '0' || val === '0,00') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'A transação precisa ter um valor',
        })
        return z.NEVER
      }

      return val
    }),
  name: z.string().nonempty('Informe o nome'),
  categoryId: z.string().nonempty('Informe a categoria'),
  bankAccountId: z.string().nonempty('Informe a conta'),
  date: z.date(),
  repeatType: z.enum(['ONCE', 'RECURRING', 'INSTALLMENT']),
  repeatCount: z
    .union([z.coerce.number(), z.literal(''), z.undefined()])
    .optional()
    .transform((value) => value === '' || value === undefined ? undefined : value),
}).superRefine((data, ctx) => {
  if (data.repeatType === 'ONCE') {
    return
  }

  if (data.repeatType === 'INSTALLMENT') {
    if (!data.repeatCount || data.repeatCount < 2 || data.repeatCount > 60) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe uma quantidade entre 2 e 60',
        path: ['repeatCount'],
      })
    }

    return
  }

  if (
    data.repeatType === 'RECURRING' &&
    data.repeatCount !== undefined &&
    (data.repeatCount < 2 || data.repeatCount > 60)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Informe uma quantidade entre 2 e 60',
      path: ['repeatCount'],
    })
  }
})

type FormData = z.infer<typeof schema>;

export function useNewTransactionModalController() {
  const {
    isNewTransactionModalOpen,
    closeNewTransactionModal,
    newTransactionType,
  } = useDashboard()

  const {
    register,
    handleSubmit: hookFormSubmit,
    formState: { errors },
    control,
    watch,
    reset
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      value: '0',
      date: new Date(),
      repeatType: 'ONCE',
    }
  })

  const queryClient = useQueryClient()
  const { accounts } = useBankAccounts()
  const { categories: categoriesList } = useCategories()
  const {
    isLoading,
    mutateAsync
  } = useMutation(transactionsService.create)

  const repeatType = watch('repeatType')

  const handleSubmit = hookFormSubmit(async (data) => {
    try {
      await mutateAsync({
        ...data,
        value: currencyStringToNumber(data.value),
        type: newTransactionType!,
        date: data.date.toISOString(),
        repeatCount:
          data.repeatType === 'ONCE'
            ? undefined
            : data.repeatCount,
      })

      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['bankAccounts'] })

      toast.success(
        newTransactionType === 'EXPENSE'
          ? 'Despesa cadastrada com sucesso!'
          : 'Receita cadastrada com sucesso!'
      )
      closeNewTransactionModal()
      reset({
        value: '0',
        date: new Date(),
        repeatType: 'ONCE',
      })
    } catch {
      toast.success(
        newTransactionType === 'EXPENSE'
          ? 'Erro ao cadastrar despesa!'
          : 'Erro ao cadastrar receita!'
      )
    }
  })

  const categories = useMemo(() => (
    categoriesList.filter(category => category.type === newTransactionType)
  ), [categoriesList, newTransactionType])

  return {
    isNewTransactionModalOpen,
    closeNewTransactionModal,
    newTransactionType,
    register,
    errors,
    control,
    repeatType,
    handleSubmit,
    accounts,
    categories,
    isLoading
  }
}

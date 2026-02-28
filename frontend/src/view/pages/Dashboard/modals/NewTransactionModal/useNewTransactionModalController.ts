import { z } from 'zod'
import { useDashboard } from '../../components/DashboardContext/useDashboard'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useBankAccounts } from '../../../../../app/hooks/useBankAccounts'
import { useCategories } from '../../../../../app/hooks/useCategories'
import { useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
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
  dueDay: z.coerce.number().optional(),
  alertDaysBefore: z.coerce.number().optional(),
  repeatCount: z
    .union([z.coerce.number(), z.literal(''), z.undefined()])
    .optional()
    .transform((value) => value === '' || value === undefined ? undefined : value),
}).superRefine((data, ctx) => {
  if (data.repeatType === 'ONCE') {
    return
  }

  if (!data.dueDay || data.dueDay < 1 || data.dueDay > 31) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Informe o dia de vencimento entre 1 e 31',
      path: ['dueDay'],
    })
  }

  if (
    data.alertDaysBefore === undefined ||
    data.alertDaysBefore < 0 ||
    data.alertDaysBefore > 15
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Informe alerta entre 0 e 15 dias',
      path: ['alertDaysBefore'],
    })
  }

  if (data.repeatType === 'INSTALLMENT') {
    if (!data.repeatCount || data.repeatCount < 2 || data.repeatCount > 360) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe uma quantidade entre 2 e 360',
        path: ['repeatCount'],
      })
    }

    return
  }

  if (
    data.repeatType === 'RECURRING' &&
    data.repeatCount !== undefined &&
    (data.repeatCount < 2 || data.repeatCount > 360)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Informe uma quantidade entre 2 e 360',
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
    transactionPresetBankAccountId,
  } = useDashboard()

  const {
    register,
    handleSubmit: hookFormSubmit,
    formState: { errors },
    control,
    watch,
    reset,
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      value: '0',
      date: new Date(),
      repeatType: 'ONCE',
      dueDay: new Date().getDate(),
      alertDaysBefore: 3,
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

  useEffect(() => {
    if (!isNewTransactionModalOpen) {
      return
    }

    if (transactionPresetBankAccountId) {
      setValue('bankAccountId', transactionPresetBankAccountId)
    }
  }, [isNewTransactionModalOpen, setValue, transactionPresetBankAccountId])

  const handleSubmit = hookFormSubmit(async (data) => {
    try {
      await mutateAsync({
        ...data,
        value: currencyStringToNumber(data.value),
        type: newTransactionType!,
        date: new Date(
          Date.UTC(
            data.date.getFullYear(),
            data.date.getMonth(),
            data.date.getDate(),
          ),
        ).toISOString(),
        repeatCount:
          data.repeatType === 'ONCE'
            ? undefined
            : data.repeatCount,
        dueDay:
          data.repeatType === 'ONCE'
            ? undefined
            : data.dueDay,
        alertDaysBefore:
          data.repeatType === 'ONCE'
            ? undefined
            : data.alertDaysBefore,
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
        bankAccountId: transactionPresetBankAccountId ?? '',
        dueDay: new Date().getDate(),
        alertDaysBefore: 3,
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

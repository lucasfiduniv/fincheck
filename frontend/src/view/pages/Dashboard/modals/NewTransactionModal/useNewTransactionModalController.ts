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
import { toUTCDateISOString } from '../../../../../app/utils/toUTCDateISOString'
import { useVehicles } from '../../../../../app/hooks/useVehicles'
import { showActionToast } from '../../../../components/ActionToast'
import { revalidateFinancialQueries } from '../../../../../app/utils/revalidateFinancialQueries'

function normalizeCategoryName(value?: string) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

function isFuelCategoryName(value?: string) {
  const normalizedName = normalizeCategoryName(value)

  return normalizedName.includes('combust') || normalizedName.includes('abastec')
}

function isMaintenanceCategoryName(value?: string) {
  const normalizedName = normalizeCategoryName(value)

  return normalizedName.includes('manuten') || normalizedName.includes('oficina') || normalizedName.includes('mecan')
}

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
  fuelVehicleId: z.string().optional(),
  fuelOdometer: z
    .union([z.coerce.number(), z.literal(''), z.undefined()])
    .optional()
    .transform((value) => value === '' || value === undefined ? undefined : value),
  fuelLiters: z
    .union([z.coerce.number(), z.literal(''), z.undefined()])
    .optional()
    .transform((value) => value === '' || value === undefined ? undefined : value),
  fuelPricePerLiter: z
    .union([z.coerce.number(), z.literal(''), z.undefined()])
    .optional()
    .transform((value) => value === '' || value === undefined ? undefined : value),
  fuelFillType: z.enum(['FULL', 'PARTIAL']).optional(),
  fuelFirstPumpClick: z.boolean().optional(),
  maintenanceVehicleId: z.string().optional(),
  maintenanceOdometer: z
    .union([z.coerce.number(), z.literal(''), z.undefined()])
    .optional()
    .transform((value) => value === '' || value === undefined ? undefined : value),
}).superRefine((data, ctx) => {
  if (data.repeatType !== 'ONCE') {
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
  }

  const isFuel = data.name.toLowerCase().includes('combust')

  if (isFuel) {
    if (!data.fuelVehicleId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Selecione o veículo',
        path: ['fuelVehicleId'],
      })
    }

    if (!data.fuelOdometer || data.fuelOdometer <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe o odômetro',
        path: ['fuelOdometer'],
      })
    }

    if (!data.fuelLiters || data.fuelLiters <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe os litros',
        path: ['fuelLiters'],
      })
    }

    if (!data.fuelPricePerLiter || data.fuelPricePerLiter <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe o valor por litro',
        path: ['fuelPricePerLiter'],
      })
    }
  }

  const isMaintenance = data.name.toLowerCase().includes('manuten') || data.name.toLowerCase().includes('oficina')

  if (isMaintenance) {
    if (!data.maintenanceVehicleId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Selecione o veículo',
        path: ['maintenanceVehicleId'],
      })
    }
  }
})

type FormData = z.infer<typeof schema>;

function buildDefaultValues(bankAccountId?: string | null) {
  return {
    value: '',
    name: '',
    categoryId: '',
    date: new Date(),
    repeatType: 'ONCE' as const,
    dueDay: new Date().getDate(),
    alertDaysBefore: 3,
    repeatCount: undefined,
    bankAccountId: bankAccountId ?? '',
    fuelVehicleId: undefined,
    fuelOdometer: undefined,
    fuelLiters: undefined,
    fuelPricePerLiter: undefined,
    fuelFillType: 'PARTIAL' as const,
    fuelFirstPumpClick: false,
    maintenanceVehicleId: undefined,
    maintenanceOdometer: undefined,
  }
}

export function useNewTransactionModalController() {
  const {
    isNewTransactionModalOpen,
    closeNewTransactionModal,
    openNewTransactionModal,
    newTransactionType,
    transactionPresetBankAccountId,
    openCategoriesModal,
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
    defaultValues: buildDefaultValues(),
  })

  const queryClient = useQueryClient()
  const { accounts } = useBankAccounts()
  const { vehicles } = useVehicles()
  const { categories: categoriesList } = useCategories()
  const {
    isLoading,
    mutateAsync
  } = useMutation(transactionsService.create)

  const repeatType = watch('repeatType')
  const selectedCategoryId = watch('categoryId')
  const selectedBankAccountId = watch('bankAccountId')

  useEffect(() => {
    if (!isNewTransactionModalOpen) {
      reset(buildDefaultValues(transactionPresetBankAccountId))
      return
    }

    if (transactionPresetBankAccountId) {
      setValue('bankAccountId', transactionPresetBankAccountId)
    } else if (!selectedBankAccountId && accounts.length > 0) {
      setValue('bankAccountId', accounts[0].id)
    }

    setValue('fuelFillType', 'PARTIAL')
    setValue('fuelFirstPumpClick', false)
  }, [
    isNewTransactionModalOpen,
    setValue,
    transactionPresetBankAccountId,
    selectedBankAccountId,
    accounts,
    reset,
  ])

  const handleSubmit = hookFormSubmit(async (data) => {
    if (showMaintenanceFields && !data.maintenanceVehicleId) {
      toast.error('Selecione o veículo da manutenção.')
      return
    }

    try {
      await mutateAsync({
        ...data,
        value: currencyStringToNumber(data.value),
        type: newTransactionType!,
        date: toUTCDateISOString(data.date),
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
        fuelVehicleId: showFuelFields ? data.fuelVehicleId || undefined : undefined,
        fuelOdometer: showFuelFields ? data.fuelOdometer : undefined,
        fuelLiters: showFuelFields ? data.fuelLiters : undefined,
        fuelPricePerLiter: showFuelFields ? data.fuelPricePerLiter : undefined,
        fuelFillType: showFuelFields ? data.fuelFillType : undefined,
        fuelFirstPumpClick: showFuelFields ? data.fuelFirstPumpClick : undefined,
        maintenanceVehicleId: showMaintenanceFields ? data.maintenanceVehicleId || undefined : undefined,
        maintenanceOdometer: showMaintenanceFields ? data.maintenanceOdometer : undefined,
      })

      await revalidateFinancialQueries(queryClient)

      const isExpense = newTransactionType === 'EXPENSE'

      toast.success(isExpense ? 'Despesa criada.' : 'Valor recebido.')
      showActionToast({
        message: isExpense
          ? 'Registrar outra despesa?'
          : 'Receber outro valor?'
        ,
        actionLabel: isExpense
          ? 'Registrar agora'
          : 'Receber agora',
        onAction: () => openNewTransactionModal(newTransactionType!, data.bankAccountId),
      })

      closeNewTransactionModal()
      reset(buildDefaultValues(transactionPresetBankAccountId))
    } catch (error: any) {
      const apiMessage = error?.response?.data?.message

      if (Array.isArray(apiMessage)) {
        toast.error(apiMessage[0] ?? 'Erro ao cadastrar transação!')
        return
      }

      if (typeof apiMessage === 'string' && apiMessage.trim()) {
        toast.error(apiMessage)
        return
      }

      toast.error(
        newTransactionType === 'EXPENSE'
          ? 'Erro ao cadastrar despesa!'
          : 'Erro ao cadastrar receita!'
      )
    }
  })

  const categories = useMemo(() => (
    categoriesList.filter(category => category.type === newTransactionType)
  ), [categoriesList, newTransactionType])

  const hasFuelCategory = useMemo(
    () => categories.some((category) => isFuelCategoryName(category.name)),
    [categories],
  )

  const selectedCategory = categories.find((category) => category.id === selectedCategoryId)
  const showFuelFields =
    newTransactionType === 'EXPENSE' &&
    isFuelCategoryName(selectedCategory?.name)
  const showMaintenanceFields =
    newTransactionType === 'EXPENSE' &&
    isMaintenanceCategoryName(selectedCategory?.name)

  return {
    isNewTransactionModalOpen,
    closeNewTransactionModal,
    openCategoriesModal,
    newTransactionType,
    register,
    errors,
    control,
    repeatType,
    showFuelFields,
    showMaintenanceFields,
    hasFuelCategory,
    handleSubmit,
    accounts,
    vehicles,
    categories,
    selectedCategoryId,
    setValue,
    isLoading
  }
}

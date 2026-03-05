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

export function useNewTransactionModalController() {
  const {
    isNewTransactionModalOpen,
    closeNewTransactionModal,
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
    defaultValues: {
      value: '',
      date: new Date(),
      repeatType: 'ONCE',
      dueDay: new Date().getDate(),
      alertDaysBefore: 3,
    }
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

  useEffect(() => {
    if (!isNewTransactionModalOpen) {
      return
    }

    if (transactionPresetBankAccountId) {
      setValue('bankAccountId', transactionPresetBankAccountId)
    }
  }, [isNewTransactionModalOpen, setValue, transactionPresetBankAccountId])

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
        fuelVehicleId: data.fuelVehicleId,
        fuelOdometer: data.fuelOdometer,
        fuelLiters: data.fuelLiters,
        fuelPricePerLiter: data.fuelPricePerLiter,
        maintenanceVehicleId: data.maintenanceVehicleId,
        maintenanceOdometer: data.maintenanceOdometer,
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
        value: '',
        date: new Date(),
        repeatType: 'ONCE',
        bankAccountId: transactionPresetBankAccountId ?? '',
        dueDay: new Date().getDate(),
        alertDaysBefore: 3,
        fuelVehicleId: '',
      })
    } catch {
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

  const selectedCategoryId = watch('categoryId')
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
    isLoading
  }
}

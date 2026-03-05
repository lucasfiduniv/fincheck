import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { useDashboard } from '../../components/DashboardContext/useDashboard'
import { useCategories } from '../../../../../app/hooks/useCategories'
import { useCreditCards } from '../../../../../app/hooks/useCreditCards'
import { useVehicles } from '../../../../../app/hooks/useVehicles'
import { creditCardsService } from '../../../../../app/services/creditCardsService'
import { currencyStringToNumber } from '../../../../../app/utils/currencyStringToNumber'
import { useEffect, useRef } from 'react'
import { toUTCDateISOString } from '../../../../../app/utils/toUTCDateISOString'

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
  creditCardId: z.string().nonempty('Informe o cartão'),
  description: z.string().nonempty('Informe a descrição'),
  amount: z.union([z.string().nonempty('Informe o valor'), z.number()]),
  purchaseDate: z.date(),
  categoryId: z.string(),
  installmentCount: z.coerce.number().min(1).max(360),
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
  const { vehicles } = useVehicles()
  const queryClient = useQueryClient()

  const {
    register,
    control,
    handleSubmit: hookFormSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      purchaseDate: new Date(),
      installmentCount: 1,
      categoryId: 'NONE',
      amount: '',
      fuelVehicleId: '',
    },
  })

  const selectedCategoryId = watch('categoryId')
  const amount = watch('amount')
  const fuelLiters = watch('fuelLiters')
  const fuelPricePerLiter = watch('fuelPricePerLiter')
  const selectedCategory = allCategories.find((category) => category.id === selectedCategoryId)
  const showFuelFields = isFuelCategoryName(selectedCategory?.name)
  const showMaintenanceFields = isMaintenanceCategoryName(selectedCategory?.name)
  const previousFuelStateRef = useRef({
    amount: 0,
    liters: 0,
    pricePerLiter: 0,
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

  useEffect(() => {
    if (!showFuelFields) {
      previousFuelStateRef.current = {
        amount: 0,
        liters: 0,
        pricePerLiter: 0,
      }
      return
    }

    const amountNumber = currencyStringToNumber(String(amount ?? 0))
    const litersNumber = fuelLiters ? Number(fuelLiters) : 0
    const pricePerLiterNumber = fuelPricePerLiter ? Number(fuelPricePerLiter) : 0

    const previousState = previousFuelStateRef.current
    const amountChanged = Math.abs(amountNumber - previousState.amount) > 0.001
    const litersChanged = Math.abs(litersNumber - previousState.liters) > 0.001
    const priceChanged = Math.abs(pricePerLiterNumber - previousState.pricePerLiter) > 0.001

    if ((amountChanged || priceChanged) && pricePerLiterNumber > 0 && amountNumber > 0) {
      const nextLiters = Number((amountNumber / pricePerLiterNumber).toFixed(2))

      if (Math.abs(nextLiters - litersNumber) > 0.01) {
        setValue('fuelLiters', nextLiters)
        previousFuelStateRef.current = {
          amount: amountNumber,
          liters: nextLiters,
          pricePerLiter: pricePerLiterNumber,
        }
        return
      }
    }

    if (!amountChanged && !priceChanged && litersChanged && litersNumber > 0 && amountNumber > 0) {
      const nextPricePerLiter = Number((amountNumber / litersNumber).toFixed(3))

      if (Math.abs(nextPricePerLiter - pricePerLiterNumber) > 0.001) {
        setValue('fuelPricePerLiter', nextPricePerLiter)
        previousFuelStateRef.current = {
          amount: amountNumber,
          liters: litersNumber,
          pricePerLiter: nextPricePerLiter,
        }
        return
      }
    }

    previousFuelStateRef.current = {
      amount: amountNumber,
      liters: litersNumber,
      pricePerLiter: pricePerLiterNumber,
    }
  }, [
    amount,
    fuelLiters,
    fuelPricePerLiter,
    setValue,
    showFuelFields,
  ])

  const handleSubmit = hookFormSubmit(async (data) => {
    if (showFuelFields) {
      if (!data.fuelVehicleId || !data.fuelOdometer || !data.fuelLiters || !data.fuelPricePerLiter) {
        toast.error('Informe veículo, odômetro, litros e preço por litro.')
        return
      }
    }

    if (showMaintenanceFields && !data.maintenanceVehicleId) {
      toast.error('Selecione o veículo da manutenção.')
      return
    }

    try {
      await mutateAsync({
        creditCardId: data.creditCardId,
        description: data.description,
        amount: currencyStringToNumber(data.amount),
        purchaseDate: toUTCDateISOString(data.purchaseDate),
        categoryId: data.categoryId === 'NONE' ? undefined : data.categoryId,
        installmentCount: data.installmentCount,
        fuelVehicleId: showFuelFields ? data.fuelVehicleId : undefined,
        fuelOdometer: showFuelFields ? data.fuelOdometer : undefined,
        fuelLiters: showFuelFields ? data.fuelLiters : undefined,
        fuelPricePerLiter: showFuelFields ? data.fuelPricePerLiter : undefined,
        maintenanceVehicleId: showMaintenanceFields ? data.maintenanceVehicleId : undefined,
        maintenanceOdometer: showMaintenanceFields ? data.maintenanceOdometer : undefined,
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
    showFuelFields,
    showMaintenanceFields,
    categories: allCategories.filter((category) => category.type === 'EXPENSE'),
    creditCards,
    vehicles,
  }
}

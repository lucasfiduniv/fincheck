import { useEffect, useRef } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { Modal } from '../../../../components/Modal'
import { Input } from '../../../../components/Input'
import { InputCurrency } from '../../../../components/InputCurrency'
import { DatePickerInput } from '../../../../components/DatePickerInput'
import { Select } from '../../../../components/Select'
import { Button } from '../../../../components/Button'
import { useCategories } from '../../../../../app/hooks/useCategories'
import { useVehicles } from '../../../../../app/hooks/useVehicles'
import { creditCardsService } from '../../../../../app/services/creditCardsService'
import { currencyStringToNumber } from '../../../../../app/utils/currencyStringToNumber'
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

interface PurchaseBeingEdited {
  creditCardId: string
  purchaseId: string
  description: string
  purchaseDate: string
  purchaseAmount: number
  categoryId?: string | null
  fuelVehicleId?: string | null
  fuelOdometer?: number | null
  fuelLiters?: number | null
  fuelPricePerLiter?: number | null
  fuelFillType?: 'FULL' | 'PARTIAL' | null
  fuelFirstPumpClick?: boolean | null
  maintenanceVehicleId?: string | null
  maintenanceOdometer?: number | null
}

interface EditCreditCardPurchaseModalProps {
  open: boolean
  onClose(): void
  purchase: PurchaseBeingEdited | null
}

const schema = z.object({
  description: z.string().nonempty('Informe a descrição'),
  amount: z.union([z.string().nonempty('Informe o valor'), z.number()]),
  purchaseDate: z.date(),
  categoryId: z.string(),
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
})

type FormData = z.infer<typeof schema>

export function EditCreditCardPurchaseModal({
  open,
  onClose,
  purchase,
}: EditCreditCardPurchaseModalProps) {
  const queryClient = useQueryClient()
  const { categories: allCategories } = useCategories()
  const { vehicles } = useVehicles()

  const {
    register,
    control,
    handleSubmit: hookFormSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      description: '',
      amount: '0',
      purchaseDate: new Date(),
      categoryId: 'NONE',
      fuelVehicleId: '',
    },
  })

  useEffect(() => {
    if (!open || !purchase) {
      return
    }

    reset({
      description: purchase.description,
      amount: String(purchase.purchaseAmount),
      purchaseDate: new Date(purchase.purchaseDate),
      categoryId: purchase.categoryId ?? 'NONE',
      fuelVehicleId: purchase.fuelVehicleId ?? '',
      fuelOdometer: purchase.fuelOdometer ?? undefined,
      fuelLiters: purchase.fuelLiters ?? undefined,
      fuelPricePerLiter: purchase.fuelPricePerLiter ?? undefined,
      fuelFillType: purchase.fuelFillType ?? 'PARTIAL',
      fuelFirstPumpClick: purchase.fuelFirstPumpClick ?? false,
      maintenanceVehicleId: purchase.maintenanceVehicleId ?? '',
      maintenanceOdometer: purchase.maintenanceOdometer ?? undefined,
    })
  }, [open, purchase, reset])

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

  const { mutateAsync, isLoading } = useMutation(creditCardsService.updatePurchase)

  const handleSubmit = hookFormSubmit(async (data) => {
    if (!purchase) {
      return
    }

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
        creditCardId: purchase.creditCardId,
        purchaseId: purchase.purchaseId,
        description: data.description,
        amount: currencyStringToNumber(data.amount),
        purchaseDate: toUTCDateISOString(data.purchaseDate),
        categoryId: data.categoryId === 'NONE' ? null : data.categoryId,
        fuelVehicleId: showFuelFields ? data.fuelVehicleId || null : null,
        fuelOdometer: showFuelFields ? data.fuelOdometer ?? null : null,
        fuelLiters: showFuelFields ? data.fuelLiters ?? null : null,
        fuelPricePerLiter: showFuelFields ? data.fuelPricePerLiter ?? null : null,
        fuelFillType: showFuelFields ? data.fuelFillType : 'PARTIAL',
        fuelFirstPumpClick: showFuelFields ? data.fuelFirstPumpClick ?? false : false,
        maintenanceVehicleId: showMaintenanceFields ? data.maintenanceVehicleId || null : null,
        maintenanceOdometer: showMaintenanceFields ? data.maintenanceOdometer ?? null : null,
      })

      queryClient.invalidateQueries({ queryKey: ['creditCards'] })
      queryClient.invalidateQueries({ queryKey: ['creditCardStatement'] })
      toast.success('Compra atualizada com sucesso!')
      onClose()
    } catch {
      toast.error('Não foi possível atualizar a compra.')
    }
  })

  return (
    <Modal title="Editar compra" open={open} onClose={onClose} contentClassName="max-h-[90vh] overflow-hidden">
      <form onSubmit={handleSubmit} className="flex h-full max-h-[calc(90vh-180px)] flex-col">
        <div className="flex flex-col gap-4 overflow-y-auto pr-1">
        <Input
          type="text"
          placeholder="Descrição da compra"
          error={errors.description?.message}
          {...register('description')}
        />

        <div>
          <span className="text-gray-600 tracking-[-0.5px] text-xs">Valor da compra</span>
          <div className="flex items-center gap-2">
            <span className="text-gray-600 tracking-[-0.5px] text-lg">R$</span>
            <Controller
              control={control}
              name="amount"
              render={({ field: { onChange, value } }) => (
                <InputCurrency
                  error={errors.amount?.message}
                  value={value}
                  onChange={onChange}
                />
              )}
            />
          </div>
        </div>

        <Controller
          control={control}
          name="purchaseDate"
          render={({ field: { value, onChange } }) => (
            <DatePickerInput
              value={value}
              onChange={onChange}
              error={errors.purchaseDate?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="categoryId"
          defaultValue="NONE"
          render={({ field: { onChange, value } }) => (
            <Select
              placeholder="Categoria"
              onChange={onChange}
              value={value}
              error={errors.categoryId?.message}
              options={[
                { value: 'NONE', label: 'Sem categoria' },
                ...allCategories
                  .filter((category) => category.type === 'EXPENSE')
                  .map((category) => ({
                    value: category.id,
                    label: category.name,
                  })),
              ]}
            />
          )}
        />

        {showFuelFields && (
          <>
            <p className="text-xs text-gray-600">
              O valor total da compra é usado no cálculo automático de litros e custo por litro.
            </p>

            <Controller
              control={control}
              name="fuelVehicleId"
              defaultValue=""
              render={({ field: { onChange, value } }) => (
                <Select
                  placeholder="Veículo"
                  onChange={onChange}
                  value={value}
                  error={errors.fuelVehicleId?.message}
                  options={vehicles.map((vehicle) => ({
                    value: vehicle.id,
                    label: vehicle.name,
                  }))}
                />
              )}
            />

            <Input
              type="number"
              step="0.1"
              placeholder="Odômetro (km)"
              error={errors.fuelOdometer?.message}
              {...register('fuelOdometer')}
            />

            <Input
              type="number"
              step="0.01"
              placeholder="Litros abastecidos"
              error={errors.fuelLiters?.message}
              {...register('fuelLiters')}
            />

            <Input
              type="number"
              step="0.01"
              placeholder="Custo por litro"
              error={errors.fuelPricePerLiter?.message}
              {...register('fuelPricePerLiter')}
            />

            <Controller
              control={control}
              name="fuelFillType"
              defaultValue="PARTIAL"
              render={({ field: { onChange, value } }) => (
                <Select
                  placeholder="Tipo de abastecimento"
                  onChange={onChange}
                  value={value ?? 'PARTIAL'}
                  options={[
                    { value: 'PARTIAL', label: 'Parcial' },
                    { value: 'FULL', label: 'Tanque cheio' },
                  ]}
                />
              )}
            />

            <label className="flex items-center gap-2 text-xs text-gray-700 rounded-lg border border-gray-200 px-3 py-2">
              <input
                type="checkbox"
                {...register('fuelFirstPumpClick')}
              />
              Primeiro clique da bomba
            </label>
          </>
        )}

        {showMaintenanceFields && (
          <>
            <Controller
              control={control}
              name="maintenanceVehicleId"
              defaultValue=""
              render={({ field: { onChange, value } }) => (
                <Select
                  placeholder="Veículo da manutenção"
                  onChange={onChange}
                  value={value}
                  error={errors.maintenanceVehicleId?.message}
                  options={vehicles.map((vehicle) => ({
                    value: vehicle.id,
                    label: vehicle.name,
                  }))}
                />
              )}
            />

            <Input
              type="number"
              step="0.1"
              placeholder="Odômetro (opcional)"
              error={errors.maintenanceOdometer?.message}
              {...register('maintenanceOdometer')}
            />
          </>
        )}

        </div>

        <div className="pt-2 mt-3 border-t border-gray-100">
          <Button type="submit" isLoading={isLoading} className="w-full">Salvar compra</Button>
        </div>
      </form>
    </Modal>
  )
}

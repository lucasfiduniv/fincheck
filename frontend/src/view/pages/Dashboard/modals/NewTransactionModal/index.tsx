import { useEffect, useMemo, useState } from 'react'
import { Controller } from 'react-hook-form'
import { Button } from '../../../../components/Button'
import { DatePickerInput } from '../../../../components/DatePickerInput'
import { Input } from '../../../../components/Input'
import { InputCurrency } from '../../../../components/InputCurrency'
import { Modal } from '../../../../components/Modal'
import { Select } from '../../../../components/Select'
import { useNewTransactionModalController } from './useNewTransactionModalController'

export function NewTransactionModal() {
  const {
    closeNewTransactionModal,
    isNewTransactionModalOpen,
    openCategoriesModal,
    newTransactionType,
    control,
    errors,
    handleSubmit,
    register,
    accounts,
    categories,
    vehicles,
    repeatType,
    selectedCategoryId,
    showFuelFields,
    showMaintenanceFields,
    hasFuelCategory,
    setValue,
    isLoading
  } = useNewTransactionModalController()

  const isExpense = newTransactionType === 'EXPENSE'
  const [showAdvancedFields, setShowAdvancedFields] = useState(false)

  useEffect(() => {
    if (!isNewTransactionModalOpen) {
      setShowAdvancedFields(false)
      return
    }

    if (!selectedCategoryId && categories.length > 0) {
      setValue('categoryId', categories[0].id)
    }
  }, [categories, isNewTransactionModalOpen, selectedCategoryId, setValue])

  const hasAdvancedErrors = useMemo(() => (
    !!errors.categoryId
    || !!errors.repeatType
    || !!errors.repeatCount
    || !!errors.dueDay
    || !!errors.alertDaysBefore
    || !!errors.fuelVehicleId
    || !!errors.fuelOdometer
    || !!errors.fuelLiters
    || !!errors.fuelPricePerLiter
    || !!errors.maintenanceVehicleId
    || !!errors.maintenanceOdometer
  ), [errors])

  useEffect(() => {
    if (hasAdvancedErrors) {
      setShowAdvancedFields(true)
    }
  }, [hasAdvancedErrors])

  return (
    <Modal
      title={isExpense ? 'Nova Despesa' : 'Nova Receita'}
      open={isNewTransactionModalOpen}
      onClose={closeNewTransactionModal}
      contentClassName="max-h-[90vh] overflow-hidden"
    >
      <form onSubmit={handleSubmit} className="flex h-full max-h-[calc(90vh-180px)] flex-col">
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          <span className="text-gray-600 tracking-[-0.5px] text-xs">
            Valor da {isExpense ? 'despesa' : 'receita'}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-gray-600 tracking-[-0.5px] text-lg">R$</span>

            <Controller
              control={control}
              name="value"
              render={({ field: { onChange, value } }) => (
                <InputCurrency
                  error={errors.value?.message}
                  value={value}
                  onChange={onChange}
                />
              )}
            />
          </div>

          <div className="flex flex-col gap-4">
          <span className="text-xs text-gray-600">Essencial</span>

          <Input
            type="text"
            placeholder={isExpense ? 'Nome da Despesa' : 'Nome da Receita'}
            error={errors.name?.message}
            {...register('name')}
          />

          <Controller
            control={control}
            name="bankAccountId"
            defaultValue=""
            render={({ field: { onChange, value } }) => (
              <Select
                placeholder={isExpense ? 'Pagar com' : 'Receber com'}
                onChange={onChange}
                value={value}
                error={errors.bankAccountId?.message}
                options={accounts.map((account) => ({
                  value: account.id,
                  label: account.name,
                }))}
              />
            )}
          />

          <Controller
            control={control}
            name="date"
            render={({ field: { value, onChange } }) => (
              <DatePickerInput
                value={value}
                onChange={onChange}
                error={errors.date?.message}
              />
            )}
          />

          <button
            type="button"
            className="text-xs text-teal-700 hover:text-teal-800 underline text-left"
            onClick={() => setShowAdvancedFields((state) => !state)}
          >
            {showAdvancedFields ? 'Ocultar detalhes' : 'Mostrar detalhes'}
          </button>

          <div
            className={`overflow-hidden transition-all duration-200 ${
              showAdvancedFields ? 'max-h-[1400px] opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="pt-1 space-y-4">
              <span className="text-xs text-gray-600">Detalhes</span>

              <Controller
                control={control}
                name="categoryId"
                defaultValue=""
                render={({ field: { onChange, value } }) => (
                  <Select
                    placeholder="Categoria"
                    onChange={onChange}
                    value={value}
                    error={errors.categoryId?.message}
                    options={categories.map((category) => ({
                      value: category.id,
                      label: category.name,
                    }))}
                  />
                )}
              />

              {isExpense && !hasFuelCategory && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                  <p className="text-xs text-amber-900">
                    Você ainda não tem categoria de combustível.
                  </p>
                  <button
                    type="button"
                    onClick={openCategoriesModal}
                    className="mt-1 text-xs font-medium text-amber-900 underline underline-offset-2"
                  >
                    Criar categoria “Combustível”
                  </button>
                </div>
              )}

              {showFuelFields && (
                <>
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
                    placeholder="Valor por litro"
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

              <Controller
                control={control}
                name="repeatType"
                render={({ field: { onChange, value } }) => (
                  <Select
                    placeholder="Tipo de lançamento"
                    onChange={onChange}
                    value={value}
                    options={[
                      { value: 'ONCE', label: 'Única' },
                      { value: 'RECURRING', label: 'Recorrente mensal' },
                      { value: 'INSTALLMENT', label: 'Parcelada' },
                    ]}
                  />
                )}
              />

              {repeatType !== 'ONCE' && (
                <div className="space-y-2">
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    placeholder="Dia de vencimento"
                    error={errors.dueDay?.message}
                    {...register('dueDay')}
                  />

                  <Input
                    type="number"
                    min={0}
                    max={15}
                    placeholder="Alertar quantos dias antes"
                    error={errors.alertDaysBefore?.message}
                    {...register('alertDaysBefore')}
                  />

                  <Input
                    type="number"
                    min={2}
                    max={360}
                    placeholder={
                      repeatType === 'RECURRING'
                        ? 'Quantidade de meses (opcional)'
                        : 'Quantidade de parcelas'
                    }
                    error={errors.repeatCount?.message}
                    {...register('repeatCount')}
                  />

                  {repeatType === 'RECURRING' && (
                    <span className="text-xs text-gray-600 tracking-[-0.5px] block">
                      Se deixar em branco, vamos lançar 24 meses automaticamente.
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

        <div className="pt-2 mt-3 border-t border-gray-100 flex gap-2">
          <Button type="button" variant="ghost" className="flex-1" onClick={closeNewTransactionModal}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isLoading} className="flex-1">Criar</Button>
        </div>
      </form>
    </Modal>
  )
}

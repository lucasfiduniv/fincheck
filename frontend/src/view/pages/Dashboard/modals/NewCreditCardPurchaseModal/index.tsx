import { Controller } from 'react-hook-form'
import { Button } from '../../../../components/Button'
import { DatePickerInput } from '../../../../components/DatePickerInput'
import { Input } from '../../../../components/Input'
import { InputCurrency } from '../../../../components/InputCurrency'
import { Modal } from '../../../../components/Modal'
import { Select } from '../../../../components/Select'
import { useNewCreditCardPurchaseModalController } from './useNewCreditCardPurchaseModalController'

export function NewCreditCardPurchaseModal() {
  const {
    isOpen,
    onClose,
    register,
    control,
    handleSubmit,
    errors,
    isLoading,
    showFuelFields,
    showMaintenanceFields,
    categories,
    creditCards,
    vehicles,
  } = useNewCreditCardPurchaseModalController()

  return (
    <Modal title="Compra no Cartão" open={isOpen} onClose={onClose} contentClassName="max-h-[90vh] overflow-hidden">
      <form onSubmit={handleSubmit} className="flex h-full max-h-[calc(90vh-180px)] flex-col">
        <div className="flex flex-col gap-4 overflow-y-auto pr-1">
          <Controller
            control={control}
            name="creditCardId"
            defaultValue=""
            render={({ field: { onChange, value } }) => (
              <Select
                placeholder="Cartão"
                onChange={onChange}
                value={value}
                error={errors.creditCardId?.message}
                options={creditCards.map((card) => ({
                  value: card.id,
                  label: card.name,
                }))}
              />
            )}
          />

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
                  ...categories.map((category) => ({
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
                Use o valor total da compra acima. Ao alterar custo por litro ou litros, recalculamos automaticamente.
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

          <Input
            type="number"
            min={1}
            max={360}
            placeholder="Quantidade de parcelas"
            error={errors.installmentCount?.message}
            {...register('installmentCount')}
          />

        </div>

        <div className="pt-2 mt-3 border-t border-gray-100">
          <Button type="submit" isLoading={isLoading} className="w-full">Lançar compra</Button>
        </div>
      </form>
    </Modal>
  )
}

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
    categories,
    creditCards,
  } = useNewCreditCardPurchaseModalController()

  return (
    <Modal title="Compra no Cartão" open={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-4">
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

          <Input
            type="number"
            min={1}
            max={360}
            placeholder="Quantidade de parcelas"
            error={errors.installmentCount?.message}
            {...register('installmentCount')}
          />

          <Button type="submit" isLoading={isLoading}>Lançar compra</Button>
        </div>
      </form>
    </Modal>
  )
}

import { Controller } from 'react-hook-form'
import { Button } from '../../../../components/Button'
import { Input } from '../../../../components/Input'
import { InputCurrency } from '../../../../components/InputCurrency'
import { Modal } from '../../../../components/Modal'
import { Select } from '../../../../components/Select'
import { useNewCreditCardModalController } from './useNewCreditCardModalController'

export function NewCreditCardModal() {
  const {
    isOpen,
    onClose,
    register,
    control,
    handleSubmit,
    errors,
    isLoading,
    accounts,
  } = useNewCreditCardModalController()

  return (
    <Modal title="Novo Cartão" open={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-4">
          <Input
            type="text"
            placeholder="Nome do cartão"
            error={errors.name?.message}
            {...register('name')}
          />

          <Input
            type="text"
            placeholder="Bandeira (opcional)"
            error={errors.brand?.message}
            {...register('brand')}
          />

          <Controller
            control={control}
            name="bankAccountId"
            defaultValue=""
            render={({ field: { onChange, value } }) => (
              <Select
                placeholder="Conta vinculada"
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

          <div>
            <span className="text-gray-600 tracking-[-0.5px] text-xs">Limite do cartão</span>
            <div className="flex items-center gap-2">
              <span className="text-gray-600 tracking-[-0.5px] text-lg">R$</span>
              <Controller
                control={control}
                name="creditLimit"
                render={({ field: { onChange, value } }) => (
                  <InputCurrency
                    error={errors.creditLimit?.message}
                    value={value}
                    onChange={onChange}
                  />
                )}
              />
            </div>
          </div>

          <Input
            type="number"
            min={1}
            max={31}
            placeholder="Dia de fechamento"
            error={errors.closingDay?.message}
            {...register('closingDay')}
          />

          <Input
            type="number"
            min={1}
            max={31}
            placeholder="Dia de vencimento"
            error={errors.dueDay?.message}
            {...register('dueDay')}
          />

          <Input
            type="color"
            placeholder="Cor"
            error={errors.color?.message}
            {...register('color')}
          />

          <Button type="submit" isLoading={isLoading}>Criar cartão</Button>
        </div>
      </form>
    </Modal>
  )
}

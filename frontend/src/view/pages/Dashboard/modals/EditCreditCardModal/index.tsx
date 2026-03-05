import { Controller } from 'react-hook-form'
import { Button } from '../../../../components/Button'
import { ColorsDropdownInput } from '../../../../components/ColorsDropdownInput'
import { Input } from '../../../../components/Input'
import { InputCurrency } from '../../../../components/InputCurrency'
import { Modal } from '../../../../components/Modal'
import { Select } from '../../../../components/Select'
import { useEditCreditCardModalController } from './useEditCreditCardModalController'

export function EditCreditCardModal() {
  const {
    open,
    onClose,
    register,
    control,
    handleSubmit,
    errors,
    isLoading,
    accounts,
  } = useEditCreditCardModalController()

  return (
    <Modal title="Editar Cartão" open={open} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-4">
          <Input type="text" placeholder="Nome do cartão" error={errors.name?.message} {...register('name')} />
          <Input type="text" placeholder="Bandeira" error={errors.brand?.message} {...register('brand')} />

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
                options={accounts.map((account) => ({ value: account.id, label: account.name }))}
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

          <div className="grid grid-cols-2 gap-3">
            <Input type="number" min={1} max={31} placeholder="Fechamento" error={errors.closingDay?.message} {...register('closingDay')} />
            <Input type="number" min={1} max={31} placeholder="Vencimento" error={errors.dueDay?.message} {...register('dueDay')} />
          </div>

          <Controller
            name="color"
            control={control}
            defaultValue=""
            render={({ field: { onChange, value } }) => (
              <ColorsDropdownInput
                error={errors.color?.message}
                onChange={onChange}
                value={value}
              />
            )}
          />

          <Controller
            control={control}
            name="isActive"
            defaultValue="true"
            render={({ field: { onChange, value } }) => (
              <Select
                placeholder="Status"
                onChange={onChange}
                value={value}
                options={[
                  { value: 'true', label: 'Ativo' },
                  { value: 'false', label: 'Inativo' },
                ]}
              />
            )}
          />

          <Button type="submit" isLoading={isLoading}>Salvar</Button>
        </div>
      </form>
    </Modal>
  )
}

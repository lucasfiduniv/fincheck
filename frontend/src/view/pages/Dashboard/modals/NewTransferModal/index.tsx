import { Controller } from 'react-hook-form'
import { Button } from '../../../../components/Button'
import { DatePickerInput } from '../../../../components/DatePickerInput'
import { Input } from '../../../../components/Input'
import { InputCurrency } from '../../../../components/InputCurrency'
import { Modal } from '../../../../components/Modal'
import { Select } from '../../../../components/Select'
import { useNewTransferModalController } from './useNewTransferModalController'

export function NewTransferModal() {
  const {
    isOpen,
    onClose,
    register,
    control,
    errors,
    handleSubmit,
    isLoading,
    accounts,
  } = useNewTransferModalController()

  return (
    <Modal title="Transferência" open={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-4">
          <div>
            <span className="text-gray-600 tracking-[-0.5px] text-xs block">Valor da transferência</span>
            <div className="flex items-center gap-2 mt-1">
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
          </div>

          <Controller
            control={control}
            name="fromBankAccountId"
            defaultValue=""
            render={({ field: { onChange, value } }) => (
              <Select
                placeholder="Conta de origem"
                onChange={onChange}
                value={value}
                error={errors.fromBankAccountId?.message}
                options={accounts.map((account) => ({
                  value: account.id,
                  label: account.name,
                }))}
              />
            )}
          />

          <Controller
            control={control}
            name="toBankAccountId"
            defaultValue=""
            render={({ field: { onChange, value } }) => (
              <Select
                placeholder="Conta de destino"
                onChange={onChange}
                value={value}
                error={errors.toBankAccountId?.message}
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

          <Input
            type="text"
            placeholder="Descrição"
            error={errors.description?.message}
            {...register('description')}
          />

          <Button type="submit" isLoading={isLoading}>Transferir</Button>
        </div>
      </form>
    </Modal>
  )
}

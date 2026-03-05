import { useMemo, useState } from 'react'
import { Controller } from 'react-hook-form'
import { useWatch } from 'react-hook-form'
import { Button } from '../../../../components/Button'
import { DatePickerInput } from '../../../../components/DatePickerInput'
import { Input } from '../../../../components/Input'
import { InputCurrency } from '../../../../components/InputCurrency'
import { Modal } from '../../../../components/Modal'
import { Select } from '../../../../components/Select'
import { useNewTransferModalController } from './useNewTransferModalController'
import { currencyStringToNumber } from '../../../../../app/utils/currencyStringToNumber'
import { formatCurrency } from '../../../../../app/utils/formatCurrency'

export function NewTransferModal() {
  const [showDetails, setShowDetails] = useState(false)

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

  const fromBankAccountId = useWatch({ control, name: 'fromBankAccountId' })
  const toBankAccountId = useWatch({ control, name: 'toBankAccountId' })
  const transferValue = useWatch({ control, name: 'value' })

  const transferValueNumber = useMemo(
    () => currencyStringToNumber(String(transferValue ?? '0')),
    [transferValue],
  )

  const fromAccount = accounts.find((account) => account.id === fromBankAccountId)
  const toAccount = accounts.find((account) => account.id === toBankAccountId)

  const fromAfter = fromAccount
    ? fromAccount.currentBalance - transferValueNumber
    : null

  const toAfter = toAccount
    ? toAccount.currentBalance + transferValueNumber
    : null

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

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-1 text-xs">
            <span className="text-gray-700 font-medium block">Impacto da transferência</span>
            <p className="text-gray-600">
              {fromAccount ? `${fromAccount.name}: ${formatCurrency(fromAccount.currentBalance)} → ${fromAfter !== null ? formatCurrency(fromAfter) : '-'}` : 'Selecione conta de origem'}
            </p>
            <p className="text-gray-600">
              {toAccount ? `${toAccount.name}: ${formatCurrency(toAccount.currentBalance)} → ${toAfter !== null ? formatCurrency(toAfter) : '-'}` : 'Selecione conta de destino'}
            </p>
          </div>

          <button
            type="button"
            className="text-xs text-teal-700 hover:text-teal-800 underline text-left"
            onClick={() => setShowDetails((state) => !state)}
          >
            {showDetails ? 'Ocultar detalhes' : 'Mostrar detalhes'}
          </button>

          <div
            className={`overflow-hidden transition-all duration-200 ${
              showDetails ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="pt-1">
              <Input
                type="text"
                placeholder="Descrição"
                error={errors.description?.message}
                {...register('description')}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100 flex gap-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isLoading} className="flex-1">Transferir</Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

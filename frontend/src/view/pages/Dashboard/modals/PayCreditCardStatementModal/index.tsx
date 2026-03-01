import { Controller } from 'react-hook-form'
import { Button } from '../../../../components/Button'
import { Input } from '../../../../components/Input'
import { Modal } from '../../../../components/Modal'
import { Select } from '../../../../components/Select'
import { Spinner } from '../../../../components/Spinner'
import { formatCurrency } from '../../../../../app/utils/formatCurrency'
import { formatDate } from '../../../../../app/utils/formatDate'
import { formatStatusLabel } from '../../../../../app/utils/formatStatusLabel'
import { usePayCreditCardStatementModalController } from './usePayCreditCardStatementModalController'
import { LINKED_BANK_ACCOUNT_OPTION, PAY_STATEMENT_MONTH_OPTIONS } from './constants'

export function PayCreditCardStatementModal() {
  const {
    isOpen,
    onClose,
    register,
    control,
    handleSubmit,
    errors,
    isLoading,
    creditCards,
    accounts,
    statement,
    isLoadingStatement,
  } = usePayCreditCardStatementModalController()

  return (
    <Modal title="Pagar Fatura" open={isOpen} onClose={onClose}>
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

          <div className="grid grid-cols-2 gap-3">
            <Controller
              control={control}
              name="month"
              defaultValue={new Date().getMonth()}
              render={({ field: { onChange, value } }) => (
                <Select
                  placeholder="Mês"
                  onChange={(selectedValue) => onChange(Number(selectedValue))}
                  value={String(value)}
                  error={errors.month?.message}
                  options={PAY_STATEMENT_MONTH_OPTIONS}
                />
              )}
            />

            <Input
              type="number"
              min={2000}
              placeholder="Ano"
              error={errors.year?.message}
              {...register('year')}
            />
          </div>

          <Controller
            control={control}
            name="bankAccountId"
            defaultValue=""
            render={({ field: { onChange, value } }) => (
              <Select
                placeholder="Conta para pagar"
                onChange={onChange}
                value={value}
                error={errors.bankAccountId?.message}
                options={[
                  { value: LINKED_BANK_ACCOUNT_OPTION, label: 'Conta vinculada ao cartão' },
                  ...accounts.map((account) => ({
                    value: account.id,
                    label: account.name,
                  })),
                ]}
              />
            )}
          />

          <div className="rounded-xl bg-gray-50 p-3 min-h-[86px]">
            {isLoadingStatement && (
              <div className="h-full flex items-center justify-center">
                <Spinner className="w-5 h-5" />
              </div>
            )}

            {!isLoadingStatement && !statement && (
              <span className="text-sm text-gray-600">
                Selecione cartão, mês e ano para ver o valor da fatura.
              </span>
            )}

            {!isLoadingStatement && statement && (
              <div className="space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status</span>
                  <strong className="text-gray-800">{formatStatusLabel(statement.status)}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Vencimento</span>
                  <strong className="text-gray-800">{formatDate(new Date(statement.dueDate))}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Pendente</span>
                  <strong className="text-red-800">{formatCurrency(statement.pending)}</strong>
                </div>
              </div>
            )}
          </div>

          <Button type="submit" isLoading={isLoading}>Pagar fatura</Button>
        </div>
      </form>
    </Modal>
  )
}

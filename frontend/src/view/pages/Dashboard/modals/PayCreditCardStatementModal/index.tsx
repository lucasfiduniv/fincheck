import { useMemo, useState } from 'react'
import { Controller } from 'react-hook-form'
import { useWatch } from 'react-hook-form'
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
  const [showDetails, setShowDetails] = useState(false)

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
    handleCancelPurchase,
    isCancelingPurchase,
  } = usePayCreditCardStatementModalController()

  const selectedBankAccountId = useWatch({ control, name: 'bankAccountId' })
  const paymentAmount = useWatch({ control, name: 'amount' })
  const selectedAccount = accounts.find((account) => account.id === selectedBankAccountId)

  const pendingAfterPayment = useMemo(() => {
    if (!statement || !paymentAmount) {
      return null
    }

    return Math.max(0, statement.pending - paymentAmount)
  }, [paymentAmount, statement])

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

          <Input
            type="number"
            min={0.01}
            step="0.01"
            placeholder="Valor a pagar"
            error={errors.amount?.message}
            {...register('amount')}
          />

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 min-h-[86px]">
            <span className="text-xs text-gray-700 font-medium block mb-1">Impacto do pagamento</span>
            <div className="space-y-1 text-xs text-gray-600">
              <p>
                {statement
                  ? `Fatura pendente após pagamento: ${pendingAfterPayment !== null ? formatCurrency(pendingAfterPayment) : '-'}`
                  : 'Selecione cartão/mês/ano para calcular o impacto da fatura.'}
              </p>
              <p>
                {selectedAccount
                  ? `${selectedAccount.name}: ${formatCurrency(selectedAccount.currentBalance)} → ${formatCurrency(selectedAccount.currentBalance - (paymentAmount ?? 0))}`
                  : 'Selecione a conta de pagamento para ver o saldo final.'}
              </p>
            </div>
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
            </div>
          </div>

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
              <div className="space-y-2 text-sm">
                <div className="space-y-1">
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

                {statement.installments.filter((installment) => installment.status === 'PENDING').length > 0 && (
                  <div className="border-t border-gray-200 pt-2 space-y-2 max-h-36 overflow-y-auto">
                    <span className="text-xs text-gray-700 block">Itens pendentes (cancelável)</span>

                    {statement.installments
                      .filter((installment) => installment.status === 'PENDING')
                      .slice(0, 5)
                      .map((installment) => (
                        <div key={installment.id} className="flex items-center justify-between gap-2 text-xs">
                          <span className="text-gray-700 truncate">
                            {installment.description} ({installment.installmentNumber}/{installment.installmentCount})
                          </span>

                          <button
                            type="button"
                            className="text-red-800 font-medium disabled:opacity-50"
                            disabled={isCancelingPurchase}
                            onClick={() => handleCancelPurchase(installment.purchaseId)}
                          >
                            Cancelar
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-gray-100 flex gap-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isLoading} className="flex-1">Pagar fatura</Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

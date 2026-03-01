import { Controller } from 'react-hook-form'
import { Button } from '../../../../components/Button'
import { DatePickerInput } from '../../../../components/DatePickerInput'
import { Input } from '../../../../components/Input'
import { InputCurrency } from '../../../../components/InputCurrency'
import { Modal } from '../../../../components/Modal'
import { Select } from '../../../../components/Select'
import { useEditTransactionModalController } from './useEditTransactionModalController'
import { Transaction } from '../../../../../app/entities/Transaction'
import { ConfirmDeleteModal } from '../../../../components/ConfirmDeleteModal'
import { TrashIcon } from '../../../../components/icons/TrashIcon'
import { useState } from 'react'
import { RecurrenceAdjustmentScope } from '../../../../../app/services/transactionsService/adjustFutureValuesByGroup'

interface EditTransactionModalProps {
  open: boolean
  onClose(): void
  transaction: Transaction | null
  onAdjustFutureValuesByGroup(params: {
    recurrenceGroupId: string;
    transactionId?: string;
    value: number;
    scope?: RecurrenceAdjustmentScope;
    fromDate?: string;
  }): Promise<void>
  isAdjustingFutureValues: boolean
}

export function EditTransactionModal({
  transaction,
  open,
  onClose,
  onAdjustFutureValuesByGroup,
  isAdjustingFutureValues,
}: EditTransactionModalProps) {
  const {
    control,
    errors,
    handleSubmit,
    register,
    accounts,
    categories,
    isLoading,
    isLoadingDelete,
    isDeleteModalOpen,
    handleDeleteTransaction,
    handleOpenDeleteModal,
    handleCloseDeleteModal
  } = useEditTransactionModalController(transaction, onClose)
  const [futureValue, setFutureValue] = useState('')
  const [futureFromDate, setFutureFromDate] = useState('')
  const [adjustmentScope, setAdjustmentScope] = useState<RecurrenceAdjustmentScope>('THIS_AND_NEXT')

  const isExpense = transaction?.type === 'EXPENSE'
  const canAdjustFutureValues = !!transaction?.recurrenceGroupId

  async function handleAdjustFutureValues() {
    if (!transaction?.recurrenceGroupId || !futureValue) {
      return
    }

    await onAdjustFutureValuesByGroup({
      recurrenceGroupId: transaction.recurrenceGroupId,
      transactionId: transaction.id,
      value: Number(futureValue),
      scope: adjustmentScope,
      fromDate:
        adjustmentScope === 'THIS_AND_NEXT' && futureFromDate
          ? new Date(futureFromDate).toISOString()
          : undefined,
    })

    setFutureValue('')
    setFutureFromDate('')
    setAdjustmentScope('THIS_AND_NEXT')
  }

  if (isDeleteModalOpen)
    return (
      <ConfirmDeleteModal
        title={`Tem certeza que deseja excluir esta ${isExpense ? 'despesa' : 'receita'}?`}
        isLoading={isLoadingDelete}
        onClose={handleCloseDeleteModal}
        onConfirm={handleDeleteTransaction}
      />
    )

  return (
    <Modal
      title={isExpense ? 'Editar Despesa' : 'Editar Receita'}
      open={open}
      onClose={onClose}
      rightAction={
        <button onClick={handleOpenDeleteModal}>
          <TrashIcon className="w-6 h-6 text-red-900" />
        </button>
      }
    >
      <form onSubmit={handleSubmit}>
        <div>
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
        </div>

        <div className="mt-10 flex flex-col gap-4">
          <Input
            type="text"
            placeholder={isExpense ? 'Nome da Despesa' : 'Nome da Receita'}
            error={errors.name?.message}
            {...register('name')}
          />

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

          {canAdjustFutureValues && (
            <div className="rounded-xl border border-gray-200 p-3 space-y-3">
              <strong className="text-sm tracking-[-0.5px] text-gray-800 block">
                Reajustar valores futuros
              </strong>

              <Input
                name="futureValue"
                type="number"
                min={0.01}
                step="0.01"
                placeholder="Novo valor para as próximas"
                value={futureValue}
                onChange={(event) => setFutureValue(event.target.value)}
              />

              <Select
                placeholder="Escopo da alteração"
                value={adjustmentScope}
                onChange={(value) => setAdjustmentScope(value as RecurrenceAdjustmentScope)}
                options={[
                  { value: 'THIS', label: 'Só esta' },
                  { value: 'THIS_AND_NEXT', label: 'Esta e próximas' },
                  { value: 'ALL', label: 'Todas da série' },
                ]}
              />

              {adjustmentScope === 'THIS_AND_NEXT' && (
                <Input
                  name="futureFromDate"
                  type="date"
                  placeholder="Aplicar a partir de"
                  value={futureFromDate}
                  onChange={(event) => setFutureFromDate(event.target.value)}
                />
              )}

              <Button
                type="button"
                onClick={handleAdjustFutureValues}
                isLoading={isAdjustingFutureValues}
              >
                Aplicar reajuste
              </Button>
            </div>
          )}

          <Button type="submit" isLoading={isLoading}>Salvar</Button>
        </div>
      </form>
    </Modal>
  )
}

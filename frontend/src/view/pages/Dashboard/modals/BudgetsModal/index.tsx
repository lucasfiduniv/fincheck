import { useEffect, useState } from 'react'
import { Controller } from 'react-hook-form'
import { formatCurrency } from '../../../../../app/utils/formatCurrency'
import { Button } from '../../../../components/Button'
import { ConfirmDeleteModal } from '../../../../components/ConfirmDeleteModal'
import { InputCurrency } from '../../../../components/InputCurrency'
import { Modal } from '../../../../components/Modal'
import { Select } from '../../../../components/Select'
import { CategoryIcon } from '../../../../components/icons/categories/CategoryIcon'
import { TrashIcon } from '../../../../components/icons/TrashIcon'
import { CategoryBudgetSummary } from '../../../../../app/entities/CategoryBudget'
import { useBudgetsModalController } from './useBudgetsModalController'

interface BudgetsModalProps {
  open: boolean
  onClose(): void
  month: number
  year: number
  budgets: CategoryBudgetSummary[]
}

export function BudgetsModal({
  open,
  onClose,
  month,
  year,
  budgets,
}: BudgetsModalProps) {
  const [showDetails, setShowDetails] = useState(false)

  const {
    mode,
    control,
    errors,
    handleSubmit,
    budgetableCategories,
    isLoading,
    isDeleteModalOpen,
    budgetBeingDeleted,
    isLoadingDelete,
    handleDeleteBudget,
    handleOpenDeleteModal,
    handleCloseDeleteModal,
    handleOpenCreateForm,
    handleOpenEditForm,
    handleCloseForm,
    handleCancelEdit,
    isEditMode,
    budgetBeingEdited,
  } = useBudgetsModalController({ month, year, budgets })

  const budgetsWithLimit = budgets.filter((budget) => budget.categoryBudgetId !== null)

  useEffect(() => {
    if (mode !== 'form') {
      setShowDetails(false)
    }
  }, [mode])

  if (isDeleteModalOpen && budgetBeingDeleted) {
    return (
      <ConfirmDeleteModal
        title="Deseja remover este limite mensal?"
        description="A categoria continuará existindo, apenas sem orçamento definido neste mês."
        isLoading={isLoadingDelete}
        onClose={handleCloseDeleteModal}
        onConfirm={handleDeleteBudget}
      />
    )
  }

  return (
    <Modal title="Orçamento por categoria" open={open} onClose={onClose}>
      <div className="space-y-6">
        {mode === 'list' && (
          <>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 tracking-[-0.5px]">Limites definidos</span>
                <button
                  className="text-sm text-teal-900 font-medium"
                  onClick={handleOpenCreateForm}
                >
                  Novo limite
                </button>
              </div>

              <div className="space-y-2 mt-2 max-h-52 overflow-y-auto">
                {budgetsWithLimit.length === 0 && (
                  <div className="h-20 rounded-lg bg-gray-50 text-sm text-gray-700 flex flex-col items-center justify-center gap-2 px-3 text-center">
                    <span>Nenhum limite definido para este mês.</span>
                    <button
                      className="text-teal-900 font-medium"
                      onClick={handleOpenCreateForm}
                    >
                      Criar primeiro limite
                    </button>
                  </div>
                )}

                {budgetsWithLimit.map((budget) => (
                  <div
                    key={budget.categoryId}
                    className="rounded-lg border border-gray-300 px-3 py-2 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <CategoryIcon type="EXPENSE" category={budget.categoryIcon} />
                      <div className="min-w-0">
                        <strong className="text-sm text-gray-800 block truncate">
                          {budget.categoryName}
                        </strong>
                        <span className="text-xs text-gray-600 block">
                          Limite {formatCurrency(budget.limit ?? 0)}
                        </span>
                        {(budget.carryOverAmount ?? 0) > 0 && (
                          <span className="text-[10px] text-teal-800 block">
                            Inclui carry-over de {formatCurrency(budget.carryOverAmount ?? 0)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        className="text-xs text-teal-900 font-medium"
                        onClick={() => handleOpenEditForm(budget)}
                      >
                        Editar
                      </button>
                      <button
                        className="w-8 h-8 flex items-center justify-center"
                        onClick={() => handleOpenDeleteModal(budget)}
                      >
                        <TrashIcon className="w-4 h-4 text-red-900" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {budgetsWithLimit.length > 0 && (
              <Button className="w-full" type="button" onClick={handleOpenCreateForm}>
                Novo limite mensal
              </Button>
            )}
          </>
        )}

        {mode === 'form' && (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 tracking-[-0.5px] block">
                {isEditMode ? 'Editar limite mensal' : 'Novo limite mensal'}
              </span>

              <button
                type="button"
                className="text-sm text-gray-700"
                onClick={handleCloseForm}
              >
                Voltar
              </button>
            </div>

            {!isEditMode && budgetableCategories.length === 0 && (
              <div className="rounded-lg bg-gray-50 text-sm text-gray-700 p-3 text-center">
                Todas as categorias de despesa já têm limite neste mês.
              </div>
            )}

            {isEditMode && budgetBeingEdited && (
              <div className="rounded-lg border border-gray-300 px-3 py-2 flex items-center gap-2">
                <CategoryIcon type="EXPENSE" category={budgetBeingEdited.categoryIcon} />
                <span className="text-sm text-gray-800">{budgetBeingEdited.categoryName}</span>
              </div>
            )}

            {!isEditMode && (
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
                    options={budgetableCategories.map((category) => ({
                      value: category.id,
                      label: category.name,
                    }))}
                  />
                )}
              />
            )}

            <div>
              <span className="text-gray-600 tracking-[-0.5px] text-xs block">Limite mensal</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-gray-600 tracking-[-0.5px] text-lg">R$</span>
                <Controller
                  control={control}
                  name="limit"
                  render={({ field: { onChange, value } }) => (
                    <InputCurrency
                      error={errors.limit?.message}
                      value={value}
                      onChange={onChange}
                      className="text-2xl"
                    />
                  )}
                />
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
                showDetails ? 'max-h-28 opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="pt-1">
                <Controller
                  control={control}
                  name="carryOverEnabled"
                  render={({ field: { value, onChange } }) => (
                    <label className="rounded-lg border border-gray-300 px-3 py-2 flex items-center justify-between gap-3 cursor-pointer">
                      <div>
                        <strong className="text-sm text-gray-800 block">Levar saldo para o próximo mês</strong>
                        <span className="text-xs text-gray-600">
                          Soma o restante positivo ao limite do mês seguinte
                        </span>
                      </div>

                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-teal-900"
                        checked={Boolean(value)}
                        onChange={(event) => onChange(event.target.checked)}
                      />
                    </label>
                  )}
                />
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 flex gap-2">
              <Button
                className="flex-1"
                type="button"
                variant="ghost"
                onClick={isEditMode ? handleCancelEdit : handleCloseForm}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                type="submit"
                isLoading={isLoading}
                disabled={!isEditMode && budgetableCategories.length === 0}
              >
                {isEditMode ? 'Salvar limite' : 'Criar limite'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  )
}

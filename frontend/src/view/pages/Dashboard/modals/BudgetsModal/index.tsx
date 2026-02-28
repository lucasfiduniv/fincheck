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
  const {
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
    handleCancelEdit,
    isEditMode,
  } = useBudgetsModalController({ month, year, budgets })

  const budgetsWithLimit = budgets.filter((budget) => budget.categoryBudgetId !== null)

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

          <div className="space-y-2 mt-2 max-h-44 overflow-y-auto">
            {budgetsWithLimit.length === 0 && (
              <div className="h-16 rounded-lg bg-gray-50 text-sm text-gray-700 flex items-center justify-center">
                Nenhum limite definido para este mês.
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

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700 tracking-[-0.5px] block">
              {isEditMode ? 'Editar limite' : 'Novo limite mensal'}
            </span>

            {isEditMode && (
              <button
                type="button"
                className="text-sm text-gray-700"
                onClick={handleCancelEdit}
              >
                Cancelar
              </button>
            )}
          </div>

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

          <Button className="w-full" type="submit" isLoading={isLoading}>
            {isEditMode ? 'Salvar limite' : 'Criar limite'}
          </Button>
        </form>
      </div>
    </Modal>
  )
}

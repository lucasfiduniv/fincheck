import { Controller } from 'react-hook-form'
import { Button } from '../../../../components/Button'
import { ConfirmDeleteModal } from '../../../../components/ConfirmDeleteModal'
import { Input } from '../../../../components/Input'
import { Modal } from '../../../../components/Modal'
import { Select } from '../../../../components/Select'
import { CategoryIcon } from '../../../../components/icons/categories/CategoryIcon'
import { TrashIcon } from '../../../../components/icons/TrashIcon'
import { useCategoriesModalController } from './useCategoriesModalController'
import { cn } from '../../../../../app/utils/cn'

export function CategoriesModal() {
  const {
    isCategoriesModalOpen,
    closeCategoriesModal,
    categories,
    activeType,
    setActiveType,
    mode,
    register,
    control,
    errors,
    handleSubmit,
    isLoading,
    isEditMode,
    handleOpenCreateForm,
    handleOpenEditForm,
    handleCloseForm,
    handleCancelEdit,
    iconOptions,
    selectedIcon,
    isDeleteModalOpen,
    categoryBeingDeleted,
    handleOpenDeleteModal,
    handleCloseDeleteModal,
    handleDeleteCategory,
    isLoadingDelete,
  } = useCategoriesModalController()

  if (isDeleteModalOpen && categoryBeingDeleted) {
    return (
      <ConfirmDeleteModal
        title="Tem certeza que deseja excluir esta categoria?"
        description="As transações relacionadas ficarão sem categoria."
        isLoading={isLoadingDelete}
        onClose={handleCloseDeleteModal}
        onConfirm={handleDeleteCategory}
      />
    )
  }

  return (
    <Modal
      title="Categorias"
      open={isCategoriesModalOpen}
      onClose={closeCategoriesModal}
    >
      <div className="space-y-6">
        <div>
          <span className="text-sm text-gray-700 tracking-[-0.5px]">Tipo</span>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              className={cn(
                'h-10 rounded-lg border border-gray-300 text-sm font-medium text-gray-800 transition-colors',
                activeType === 'EXPENSE' && 'bg-gray-200 border-gray-200'
              )}
              onClick={() => setActiveType('EXPENSE')}
            >
              Despesa
            </button>
            <button
              type="button"
              className={cn(
                'h-10 rounded-lg border border-gray-300 text-sm font-medium text-gray-800 transition-colors',
                activeType === 'INCOME' && 'bg-gray-200 border-gray-200'
              )}
              onClick={() => setActiveType('INCOME')}
            >
              Receita
            </button>
          </div>
        </div>

        {mode === 'list' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 tracking-[-0.5px]">Minhas categorias</span>
              <button
                className="text-sm text-teal-900 font-medium"
                onClick={handleOpenCreateForm}
              >
                Nova categoria
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto">
              {categories.length === 0 && (
                <div className="h-16 rounded-lg bg-gray-50 text-sm text-gray-700 flex items-center justify-center">
                  Nenhuma categoria cadastrada nesse tipo.
                </div>
              )}

              {categories.map((category) => (
                <div
                  key={category.id}
                  className="h-12 px-3 rounded-lg border border-gray-300 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2">
                    <CategoryIcon type={category.type} category={category.icon} />
                    <span className="text-sm text-gray-800">{category.name}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      className="text-xs font-medium text-teal-900"
                      onClick={() => handleOpenEditForm(category)}
                    >
                      Editar
                    </button>
                    <button
                      className="w-8 h-8 flex items-center justify-center"
                      onClick={() => handleOpenDeleteModal(category)}
                    >
                      <TrashIcon className="w-4 h-4 text-red-900" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {mode === 'form' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 tracking-[-0.5px] block">
                {isEditMode ? 'Editar categoria' : 'Nova categoria'}
              </span>

              <button
                type="button"
                className="text-sm text-gray-700"
                onClick={handleCloseForm}
              >
                Voltar
              </button>
            </div>

            <Input
              type="text"
              placeholder="Nome"
              error={errors.name?.message}
              {...register('name')}
            />

            <Controller
              control={control}
              name="icon"
              render={({ field: { value, onChange } }) => (
                <Select
                  placeholder="Ícone"
                  onChange={onChange}
                  value={value}
                  error={errors.icon?.message}
                  options={iconOptions}
                />
              )}
            />

            <div className="h-12 px-3 rounded-lg bg-gray-50 flex items-center gap-2 text-sm text-gray-700">
              <CategoryIcon type={activeType} category={selectedIcon} />
              Pré-visualização do ícone
            </div>

            <Button className="w-full" type="submit" isLoading={isLoading}>
              {isEditMode ? 'Salvar alterações' : 'Criar categoria'}
            </Button>

            {isEditMode && (
              <Button
                className="w-full"
                type="button"
                variant="ghost"
                onClick={handleCancelEdit}
              >
                Cancelar edição
              </Button>
            )}
          </form>
        )}
      </div>
    </Modal>
  )
}

import { useState } from 'react'
import { Controller } from 'react-hook-form'
import { Button } from '../../../../components/Button'
import { ConfirmDeleteModal } from '../../../../components/ConfirmDeleteModal'
import { Input } from '../../../../components/Input'
import { Modal } from '../../../../components/Modal'
import { CategoryIcon } from '../../../../components/icons/categories/CategoryIcon'
import { TrashIcon } from '../../../../components/icons/TrashIcon'
import { useCategoriesModalController } from './useCategoriesModalController'
import { cn } from '../../../../../app/utils/cn'

export function CategoriesModal() {
  const [showManualIconSelection, setShowManualIconSelection] = useState(false)
  const [draggedCategoryId, setDraggedCategoryId] = useState<string | null>(null)
  const [dragOverCategoryId, setDragOverCategoryId] = useState<string | null>(null)

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
    isLoadingReorder,
    handleReorderCategories,
    handleMoveCategoryByOffset,
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
      contentClassName="max-w-[720px] max-h-[88vh] overflow-y-auto"
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

            <p className="text-xs text-gray-500">
              Arraste e solte para definir a ordem das categorias mais usadas.
            </p>

            <div className="space-y-2 max-h-[52vh] overflow-y-auto pr-1">
              {categories.length === 0 && (
                <div className="h-16 rounded-lg bg-gray-50 text-sm text-gray-700 flex items-center justify-center">
                  Nenhuma categoria cadastrada nesse tipo.
                </div>
              )}

              {categories.map((category) => (
                <div
                  key={category.id}
                  draggable={!isLoadingReorder}
                  onDragStart={() => {
                    setDraggedCategoryId(category.id)
                    setDragOverCategoryId(category.id)
                  }}
                  onDragEnter={() => setDragOverCategoryId(category.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDragEnd={() => {
                    setDraggedCategoryId(null)
                    setDragOverCategoryId(null)
                  }}
                  onDrop={async (event) => {
                    event.preventDefault()

                    if (!draggedCategoryId) {
                      return
                    }

                    await handleReorderCategories(draggedCategoryId, category.id)
                    setDraggedCategoryId(null)
                    setDragOverCategoryId(null)
                  }}
                  className={cn(
                    'h-14 px-3 rounded-lg border border-gray-300 flex items-center justify-between gap-3 bg-white cursor-grab active:cursor-grabbing',
                    dragOverCategoryId === category.id && draggedCategoryId !== category.id && 'border-teal-500 ring-2 ring-teal-100',
                    draggedCategoryId === category.id && 'opacity-60',
                    isLoadingReorder && 'cursor-wait opacity-80',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-sm" aria-hidden>
                      ::
                    </span>
                    <CategoryIcon type={category.type} category={category.icon} />
                    <span className="text-sm text-gray-800">{category.name}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="w-7 h-7 rounded-md border border-gray-200 text-gray-600 disabled:opacity-40"
                      onClick={() => void handleMoveCategoryByOffset(category.id, -1)}
                      disabled={isLoadingReorder || categories[0]?.id === category.id}
                      title="Mover para cima"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="w-7 h-7 rounded-md border border-gray-200 text-gray-600 disabled:opacity-40"
                      onClick={() => void handleMoveCategoryByOffset(category.id, 1)}
                      disabled={isLoadingReorder || categories[categories.length - 1]?.id === category.id}
                      title="Mover para baixo"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="text-xs font-medium text-teal-900"
                      onClick={() => handleOpenEditForm(category)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
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
                onClick={() => {
                  setShowManualIconSelection(false)
                  handleCloseForm()
                }}
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

            <button
              type="button"
              className="text-xs text-teal-700 hover:text-teal-800 underline text-left"
              onClick={() => setShowManualIconSelection((state) => !state)}
            >
              {showManualIconSelection ? 'Ocultar seleção manual de ícone' : 'Escolher ícone manualmente (opcional)'}
            </button>

            <div
              className={`overflow-hidden transition-all duration-200 ${
                showManualIconSelection ? 'max-h-[520px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="pt-2">
                <Controller
                  control={control}
                  name="icon"
                  render={({ field: { value, onChange } }) => (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[300px] overflow-y-auto pr-1">
                        {iconOptions.map((option) => {
                          const isSelected = value === option.value

                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => onChange(option.value)}
                              className={cn(
                                'rounded-lg border px-2 py-2 bg-white flex items-center gap-2 text-left transition-colors',
                                isSelected
                                  ? 'border-teal-700 ring-2 ring-teal-100'
                                  : 'border-gray-200 hover:border-gray-300',
                              )}
                            >
                              <CategoryIcon type={activeType} category={option.value} />
                              <span className="text-xs text-gray-700 leading-tight">{option.label}</span>
                            </button>
                          )
                        })}
                      </div>

                      {errors.icon?.message && (
                        <p className="text-xs text-red-900 mt-2">{errors.icon.message}</p>
                      )}
                    </div>
                  )}
                />
              </div>
            </div>

            <div className="h-12 px-3 rounded-lg bg-gray-50 flex items-center gap-2 text-sm text-gray-700">
              <CategoryIcon type={activeType} category={selectedIcon} />
              Ícone sugerido automaticamente
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

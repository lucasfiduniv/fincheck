import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useDashboard } from '../../components/DashboardContext/useDashboard'
import { useCategories } from '../../../../../app/hooks/useCategories'
import { useEffect, useMemo, useState } from 'react'
import { Category } from '../../../../../app/entities/Category'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { categoriesService } from '../../../../../app/services/categoriesService'
import toast from 'react-hot-toast'

const schema = z.object({
  name: z.string().nonempty('Nome é obrigatório'),
  icon: z.string().nonempty('Ícone é obrigatório'),
})

type FormData = z.infer<typeof schema>

const EXPENSE_ICON_OPTIONS = [
  { value: 'home', label: 'Casa' },
  { value: 'bills', label: 'Boletos' },
  { value: 'food', label: 'Alimentação' },
  { value: 'education', label: 'Educação' },
  { value: 'fun', label: 'Lazer' },
  { value: 'grocery', label: 'Mercado' },
  { value: 'clothes', label: 'Roupas' },
  { value: 'beauty', label: 'Beleza' },
  { value: 'health', label: 'Saúde' },
  { value: 'pet', label: 'Pet' },
  { value: 'electronics', label: 'Eletrônicos' },
  { value: 'investments', label: 'Investimentos' },
  { value: 'transport', label: 'Transporte' },
  { value: 'travel', label: 'Viagem' },
  { value: 'sports', label: 'Esportes' },
  { value: 'other', label: 'Outros' },
]

const INCOME_ICON_OPTIONS = [
  { value: 'salary', label: 'Salário' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'bonus', label: 'Bônus' },
  { value: 'cashback', label: 'Cashback' },
  { value: 'investments', label: 'Investimentos' },
  { value: 'rent', label: 'Aluguel recebido' },
  { value: 'sales', label: 'Vendas' },
  { value: 'other', label: 'Outros' },
]

function getDefaultIconByType(type: Category['type']) {
  return type === 'EXPENSE' ? 'home' : 'salary'
}

export function useCategoriesModalController() {
  const { isCategoriesModalOpen, closeCategoriesModal } = useDashboard()
  const { categories } = useCategories()
  const queryClient = useQueryClient()

  const [activeType, setActiveType] = useState<Category['type']>('EXPENSE')
  const [mode, setMode] = useState<'list' | 'form'>('list')
  const [categoryBeingEdited, setCategoryBeingEdited] = useState<Category | null>(null)
  const [categoryBeingDeleted, setCategoryBeingDeleted] = useState<Category | null>(null)

  const {
    register,
    control,
    handleSubmit: hookFormSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      icon: 'home',
    },
  })

  const { isLoading: isLoadingCreate, mutateAsync: createCategory } = useMutation(categoriesService.create)
  const { isLoading: isLoadingUpdate, mutateAsync: updateCategory } = useMutation(categoriesService.update)
  const { isLoading: isLoadingReorder, mutateAsync: reorderCategories } = useMutation(categoriesService.reorder)
  const { isLoading: isLoadingDelete, mutateAsync: removeCategory } = useMutation(categoriesService.remove)

  const selectedIcon = watch('icon')

  const filteredCategories = useMemo(
    () => categories.filter((category) => category.type === activeType),
    [categories, activeType]
  )

  const iconOptions = useMemo(
    () => activeType === 'EXPENSE' ? EXPENSE_ICON_OPTIONS : INCOME_ICON_OPTIONS,
    [activeType],
  )

  function handleSetActiveType(type: Category['type']) {
    setActiveType(type)

    if (!categoryBeingEdited) {
      setValue('icon', getDefaultIconByType(type))
    }
  }

  function handleOpenCreateForm() {
    setCategoryBeingEdited(null)
    setMode('form')
    reset({
      name: '',
      icon: getDefaultIconByType(activeType),
    })
  }

  function handleCloseForm() {
    setCategoryBeingEdited(null)
    setMode('list')
  }

  useEffect(() => {
    if (!isCategoriesModalOpen) return

    setMode('list')
    setCategoryBeingEdited(null)
    setCategoryBeingDeleted(null)
  }, [isCategoriesModalOpen])

  function handleOpenEditForm(category: Category) {
    setActiveType(category.type)
    setCategoryBeingEdited(category)
    setMode('form')
    reset({
      name: category.name,
      icon: category.icon,
    })
  }

  function handleCancelEdit() {
    handleCloseForm()
  }

  function handleOpenDeleteModal(category: Category) {
    setCategoryBeingDeleted(category)
  }

  function handleCloseDeleteModal() {
    setCategoryBeingDeleted(null)
  }

  async function invalidateData() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['categories'] }),
      queryClient.invalidateQueries({ queryKey: ['transactions'] }),
    ])
  }

  async function handleDeleteCategory() {
    if (!categoryBeingDeleted) return

    try {
      await removeCategory(categoryBeingDeleted.id)

      await invalidateData()

      if (categoryBeingEdited?.id === categoryBeingDeleted.id) {
        handleCloseForm()
      }

      toast.success('Categoria excluída com sucesso!')
      handleCloseDeleteModal()
    } catch {
      toast.error('Erro ao excluir categoria!')
    }
  }

  async function handleReorderCategories(draggedCategoryId: string, targetCategoryId: string) {
    if (draggedCategoryId === targetCategoryId) {
      return
    }

    const draggedIndex = filteredCategories.findIndex((category) => category.id === draggedCategoryId)
    const targetIndex = filteredCategories.findIndex((category) => category.id === targetCategoryId)

    if (draggedIndex < 0 || targetIndex < 0) {
      return
    }

    const reorderedCategories = [...filteredCategories]
    const [draggedItem] = reorderedCategories.splice(draggedIndex, 1)
    reorderedCategories.splice(targetIndex, 0, draggedItem)

    const orderedCategoryIds = reorderedCategories.map((category) => category.id)

    queryClient.setQueryData<Category[]>(['categories'], (currentCategories = []) => {
      const orderMap = new Map(orderedCategoryIds.map((id, index) => [id, index]))

      return currentCategories
        .map((category) => {
          if (category.type !== activeType) {
            return category
          }

          const nextSortOrder = orderMap.get(category.id)

          return {
            ...category,
            sortOrder: nextSortOrder ?? category.sortOrder,
          }
        })
        .sort((a, b) => {
          if (a.type !== b.type) {
            return a.type.localeCompare(b.type)
          }

          return (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
        })
    })

    try {
      await reorderCategories({
        type: activeType,
        orderedCategoryIds,
      })

      await queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Ordem das categorias atualizada!')
    } catch {
      await queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.error('Erro ao reordenar categorias!')
    }
  }

  async function handleMoveCategoryByOffset(categoryId: string, offset: -1 | 1) {
    const currentIndex = filteredCategories.findIndex((category) => category.id === categoryId)

    if (currentIndex < 0) {
      return
    }

    const targetIndex = currentIndex + offset

    if (targetIndex < 0 || targetIndex >= filteredCategories.length) {
      return
    }

    const targetCategory = filteredCategories[targetIndex]

    await handleReorderCategories(categoryId, targetCategory.id)
  }

  const handleSubmit = hookFormSubmit(async (data) => {
    try {
      if (categoryBeingEdited) {
        await updateCategory({
          ...data,
          id: categoryBeingEdited.id,
          type: activeType,
        })

        toast.success('Categoria editada com sucesso!')
      } else {
        await createCategory({
          ...data,
          type: activeType,
        })
        toast.success('Categoria criada com sucesso!')
      }

      await invalidateData()
      handleCloseForm()
    } catch {
      toast.error('Erro ao salvar categoria!')
    }
  })

  return {
    isCategoriesModalOpen,
    closeCategoriesModal,
    categories: filteredCategories,
    activeType,
    setActiveType: handleSetActiveType,
    mode,
    register,
    control,
    errors,
    handleSubmit,
    isLoading: isLoadingCreate || isLoadingUpdate,
    isEditMode: !!categoryBeingEdited,
    handleOpenCreateForm,
    handleOpenEditForm,
    handleCloseForm,
    handleCancelEdit,
    iconOptions,
    selectedIcon,
    isDeleteModalOpen: !!categoryBeingDeleted,
    categoryBeingDeleted,
    handleOpenDeleteModal,
    handleCloseDeleteModal,
    handleDeleteCategory,
    isLoadingDelete,
    isLoadingReorder,
    handleReorderCategories,
    handleMoveCategoryByOffset,
  }
}

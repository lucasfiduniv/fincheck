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
  { value: 'food', label: 'Alimentação' },
  { value: 'education', label: 'Educação' },
  { value: 'fun', label: 'Lazer' },
  { value: 'grocery', label: 'Mercado' },
  { value: 'clothes', label: 'Roupas' },
  { value: 'transport', label: 'Transporte' },
  { value: 'travel', label: 'Viagem' },
  { value: 'other', label: 'Outro' },
]

const INCOME_ICON_OPTIONS = [
  { value: 'salary', label: 'Salário' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'other', label: 'Outro' },
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
  const { isLoading: isLoadingDelete, mutateAsync: removeCategory } = useMutation(categoriesService.remove)

  const selectedIcon = watch('icon')

  const filteredCategories = useMemo(
    () => categories.filter((category) => category.type === activeType),
    [categories, activeType]
  )

  const iconOptions = useMemo(
    () => activeType === 'EXPENSE' ? EXPENSE_ICON_OPTIONS : INCOME_ICON_OPTIONS,
    [activeType]
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
  }
}

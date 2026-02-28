import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { z } from 'zod'
import { CategoryBudgetSummary } from '../../../../../app/entities/CategoryBudget'
import { useCategories } from '../../../../../app/hooks/useCategories'
import { categoryBudgetsService } from '../../../../../app/services/categoryBudgetsService'
import { currencyStringToNumber } from '../../../../../app/utils/currencyStringToNumber'

const schema = z.object({
  categoryId: z.string().nonempty('Selecione uma categoria'),
  limit: z
    .union([z.string().nonempty('Informe o limite mensal'), z.number()])
    .transform((val, ctx) => {
      if (val === 0 || val === '0' || val === '0,00') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Informe um limite maior que zero',
        })
        return z.NEVER
      }

      return val
    }),
})

type FormData = z.infer<typeof schema>

interface UseBudgetsModalControllerProps {
  month: number
  year: number
  budgets: CategoryBudgetSummary[]
}

export function useBudgetsModalController({
  month,
  year,
  budgets,
}: UseBudgetsModalControllerProps) {
  const queryClient = useQueryClient()
  const { categories } = useCategories()
  const [budgetBeingEdited, setBudgetBeingEdited] =
    useState<CategoryBudgetSummary | null>(null)
  const [budgetBeingDeleted, setBudgetBeingDeleted] =
    useState<CategoryBudgetSummary | null>(null)

  const {
    control,
    handleSubmit: hookFormSubmit,
    formState: { errors },
    setValue,
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      limit: '0',
      categoryId: '',
    },
  })

  const { isLoading: isLoadingCreate, mutateAsync: createBudget } =
    useMutation(categoryBudgetsService.create)
  const { isLoading: isLoadingUpdate, mutateAsync: updateBudget } =
    useMutation(categoryBudgetsService.update)
  const { isLoading: isLoadingDelete, mutateAsync: removeBudget } =
    useMutation(categoryBudgetsService.remove)

  const expenseCategories = useMemo(
    () => categories.filter((category) => category.type === 'EXPENSE'),
    [categories],
  )

  const budgetableCategories = useMemo(() => {
    if (!budgetBeingEdited) {
      return expenseCategories.filter(
        (category) =>
          !budgets.some(
            (budget) =>
              budget.categoryId === category.id && budget.categoryBudgetId !== null,
          ),
      )
    }

    return expenseCategories
  }, [expenseCategories, budgets, budgetBeingEdited])

  const handleSubmit = hookFormSubmit(async (data) => {
    try {
      const parsedLimit = currencyStringToNumber(data.limit)

      if (budgetBeingEdited?.categoryBudgetId) {
        await updateBudget({
          id: budgetBeingEdited.categoryBudgetId,
          limit: parsedLimit,
        })

        toast.success('Limite mensal atualizado com sucesso!')
      } else {
        await createBudget({
          categoryId: data.categoryId,
          limit: parsedLimit,
          month,
          year,
        })

        toast.success('Limite mensal criado com sucesso!')
      }

      await queryClient.invalidateQueries({ queryKey: ['categoryBudgets', month, year] })
      setBudgetBeingEdited(null)
      reset({
        categoryId: '',
        limit: '0',
      })
    } catch {
      toast.error('Erro ao salvar limite mensal!')
    }
  })

  function handleOpenCreateForm() {
    setBudgetBeingEdited(null)
    reset({
      categoryId: '',
      limit: '0',
    })
  }

  function handleOpenEditForm(budget: CategoryBudgetSummary) {
    setBudgetBeingEdited(budget)
    setValue('categoryId', budget.categoryId)
    setValue('limit', budget.limit ?? 0)
  }

  function handleCancelEdit() {
    handleOpenCreateForm()
  }

  function handleOpenDeleteModal(budget: CategoryBudgetSummary) {
    setBudgetBeingDeleted(budget)
  }

  function handleCloseDeleteModal() {
    setBudgetBeingDeleted(null)
  }

  async function handleDeleteBudget() {
    if (!budgetBeingDeleted?.categoryBudgetId) return

    try {
      await removeBudget(budgetBeingDeleted.categoryBudgetId)
      await queryClient.invalidateQueries({ queryKey: ['categoryBudgets', month, year] })

      if (budgetBeingEdited?.categoryBudgetId === budgetBeingDeleted.categoryBudgetId) {
        handleOpenCreateForm()
      }

      toast.success('Limite removido com sucesso!')
      handleCloseDeleteModal()
    } catch {
      toast.error('Erro ao remover limite!')
    }
  }

  return {
    control,
    errors,
    handleSubmit,
    expenseCategories,
    budgetableCategories,
    budgets,
    isLoading: isLoadingCreate || isLoadingUpdate,
    isDeleteModalOpen: !!budgetBeingDeleted,
    budgetBeingDeleted,
    isLoadingDelete,
    handleDeleteBudget,
    handleOpenDeleteModal,
    handleCloseDeleteModal,
    handleOpenCreateForm,
    handleOpenEditForm,
    handleCancelEdit,
    isEditMode: !!budgetBeingEdited,
  }
}

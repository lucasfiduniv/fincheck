import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useBankAccounts } from '../../../../../app/hooks/useBankAccounts'
import { useCategories } from '../../../../../app/hooks/useCategories'
import { useMemo, useState } from 'react'
import { Transaction } from '../../../../../app/entities/Transaction'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { transactionsService } from '../../../../../app/services/transactionsService'
import { currencyStringToNumber } from '../../../../../app/utils/currencyStringToNumber'
import { toast } from 'react-hot-toast'

const schema = z.object({
  value: z.
    union([z.string().nonempty('Informe o valor'), z.number()])
    .transform((val, ctx) => {
      if (val === 0 || val === '0' || val === '0,00') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'A transação precisa ter um valor',
        })
        return z.NEVER
      }

      return val
    }),
  name: z.string().nonempty('Informe o nome'),
  categoryId: z.string().optional(),
  bankAccountId: z.string().nonempty('Informe a conta'),
  date: z.date(),
})

type FormData = z.infer<typeof schema>;

export function useEditTransactionModalController(
  transaction: Transaction | null,
  onClose: () => void
) {
  const editableTransactionType = transaction?.type

  const {
    register,
    handleSubmit: hookFormSubmit,
    formState: { errors },
    control,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: transaction?.name,
      value: transaction?.value,
      bankAccountId: transaction?.bankAccountId,
      categoryId: transaction?.categoryId ?? '',
      date: transaction ? new Date(transaction.date) : new Date(),
    },
  })

  const { accounts } = useBankAccounts()
  const { categories: categoriesList } = useCategories()
  const queryClient = useQueryClient()
  const { isLoading, mutateAsync: updateTransaction } = useMutation(
    transactionsService.update
  )
  const { isLoading: isLoadingDelete, mutateAsync: removeTransaction } =
    useMutation(transactionsService.remove)

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  async function handleDeleteTransaction() {
    try {
      await removeTransaction(transaction!.id)

      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['bankAccounts'] })
      toast.success('Transação deletada com sucesso!')
      onClose()
    } catch {
      toast.error('Erro ao deletar transação!')
    }
  }

  function handleOpenDeleteModal() {
    setIsDeleteModalOpen(true)
  }

  function handleCloseDeleteModal() {
    setIsDeleteModalOpen(false)
  }

  const handleSubmit = hookFormSubmit(async (data) => {
    if (!editableTransactionType) {
      toast.error('Transação inválida para edição.')
      return
    }

    const categoryId = editableTransactionType === 'TRANSFER'
      ? undefined
      : data.categoryId

    if (editableTransactionType !== 'TRANSFER' && !categoryId) {
      toast.error('Informe a categoria.')
      return
    }

    try {
      await updateTransaction({
        ...data,
        id: transaction!.id,
        type: editableTransactionType,
        categoryId,
        value: currencyStringToNumber(data.value),
        date: new Date(
          Date.UTC(
            data.date.getFullYear(),
            data.date.getMonth(),
            data.date.getDate(),
          ),
        ).toISOString(),
      })

      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['bankAccounts'] })

      toast.success(
        editableTransactionType === 'TRANSFER'
          ? 'Transferência editada com sucesso!'
          : editableTransactionType === 'EXPENSE'
          ? 'Despesa editada com sucesso!'
          : 'Receita editada com sucesso!'
      )
      onClose()
    } catch {
      toast.error(
        editableTransactionType === 'TRANSFER'
          ? 'Erro ao editar transferência!'
          : editableTransactionType === 'EXPENSE'
          ? 'Erro ao editar despesa!'
          : 'Erro ao editar receita!'
      )
    }
  })

  const categories = useMemo(
    () =>
      transaction?.type === 'TRANSFER'
        ? []
        :
      categoriesList.filter((category) => category.type === transaction?.type),
    [categoriesList, transaction]
  )

  return {
    register,
    errors,
    control,
    handleSubmit,
    accounts,
    categories,
    isLoading,
    isDeleteModalOpen,
    isLoadingDelete,
    handleOpenDeleteModal,
    handleCloseDeleteModal,
    handleDeleteTransaction,
  }
}

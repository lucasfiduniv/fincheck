import { useQuery } from '@tanstack/react-query'
import { categoryBudgetsService } from '../services/categoryBudgetsService'

export function useCategoryBudgets({ month, year }: { month: number; year: number }) {
  const { data, isFetching, isInitialLoading, refetch } = useQuery({
    queryKey: ['categoryBudgets', month, year],
    queryFn: () => categoryBudgetsService.getSummary({ month, year }),
  })

  return {
    categoryBudgets: data ?? [],
    isLoadingCategoryBudgets: isFetching,
    isInitialLoadingCategoryBudgets: isInitialLoading,
    refetchCategoryBudgets: refetch,
  }
}

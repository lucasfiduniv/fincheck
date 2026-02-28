import { useQuery } from '@tanstack/react-query'
import { creditCardsService } from '../services/creditCardsService'

export function useCreditCards() {
  const { data, isFetching, isInitialLoading, refetch } = useQuery({
    queryKey: ['creditCards'],
    queryFn: creditCardsService.getAll,
  })

  return {
    creditCards: data ?? [],
    isLoadingCreditCards: isFetching,
    isInitialLoadingCreditCards: isInitialLoading,
    refetchCreditCards: refetch,
  }
}

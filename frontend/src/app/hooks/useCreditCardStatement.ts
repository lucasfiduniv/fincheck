import { useQuery } from '@tanstack/react-query'
import { creditCardsService } from '../services/creditCardsService'

export function useCreditCardStatement({
  creditCardId,
  month,
  year,
}: {
  creditCardId?: string
  month: number
  year: number
}) {
  const { data, isFetching, isInitialLoading, refetch } = useQuery({
    queryKey: ['creditCardStatement', creditCardId, month, year],
    queryFn: () =>
      creditCardsService.getStatementByMonth({
        creditCardId: creditCardId!,
        month,
        year,
      }),
    enabled: !!creditCardId,
  })

  return {
    statement: data,
    isLoadingStatement: isFetching,
    isInitialLoadingStatement: isInitialLoading,
    refetchStatement: refetch,
  }
}

import { useQuery } from '@tanstack/react-query'
import { transactionsService } from '../services/transactionsService'

export function useTransactionDueAlerts({ month, year }: { month: number; year: number }) {
  const { data, isFetching, isInitialLoading, refetch } = useQuery({
    queryKey: ['transactionDueAlerts', month, year],
    queryFn: () => transactionsService.getDueAlertsSummary({ month, year }),
  })

  return {
    dueAlerts: data ?? [],
    isLoadingDueAlerts: isFetching,
    isInitialLoadingDueAlerts: isInitialLoading,
    refetchDueAlerts: refetch,
  }
}

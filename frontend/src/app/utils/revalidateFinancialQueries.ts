import { QueryClient } from '@tanstack/react-query'

export async function revalidateFinancialQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['transactions'], refetchType: 'all' }),
    queryClient.invalidateQueries({ queryKey: ['bankAccounts'], refetchType: 'all' }),
    queryClient.invalidateQueries({ queryKey: ['creditCards'], refetchType: 'all' }),
    queryClient.invalidateQueries({ queryKey: ['creditCardStatement'], refetchType: 'all' }),
    queryClient.invalidateQueries({ queryKey: ['categoryBudgets'], refetchType: 'all' }),
    queryClient.invalidateQueries({ queryKey: ['transactionDueAlerts'], refetchType: 'all' }),
  ])
}

import { useQuery } from '@tanstack/react-query'

import { savingsBoxesService } from '../services/savingsBoxesService'

export function useSavingsBoxes() {
  const { data, isFetching } = useQuery({
    queryKey: ['savingsBoxes', 'summary'],
    queryFn: savingsBoxesService.getAll,
  })

  return {
    savingsBoxes: data?.savingsBoxes ?? [],
    totalSavingsBoxesBalance: data?.totalBalance ?? 0,
    isLoadingSavingsBoxes: isFetching,
  }
}
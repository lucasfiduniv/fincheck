import { useQuery } from '@tanstack/react-query'
import { vehiclesService } from '../services/vehiclesService'

export function useVehicles() {
  const { data, isFetching } = useQuery({
    queryKey: ['vehicles'],
    queryFn: vehiclesService.getAll,
  })

  return {
    vehicles: data ?? [],
    isLoadingVehicles: isFetching,
  }
}

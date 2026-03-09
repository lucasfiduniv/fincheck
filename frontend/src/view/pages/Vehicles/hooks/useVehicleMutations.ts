import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Vehicle, VehicleDetails } from '../../../../app/entities/Vehicle'
import { transactionsService } from '../../../../app/services/transactionsService'
import { UpdateVehicleParams, vehiclesService } from '../../../../app/services/vehiclesService'

export function useVehicleMutations() {
  const queryClient = useQueryClient()

  const { mutateAsync: createVehicle, isLoading: isCreatingVehicle } = useMutation(vehiclesService.create)
  const { mutateAsync: createPart, isLoading: isCreatingPart } = useMutation(vehiclesService.createPart)
  const { mutateAsync: createTransaction, isLoading: isCreatingQuickAction } = useMutation(transactionsService.create)

  const { mutateAsync: updateVehicle, isLoading: isUpdatingVehicle } = useMutation({
    mutationFn: vehiclesService.update,
    onMutate: async (variables: UpdateVehicleParams) => {
      if (!variables.vehicleId) {
        return undefined
      }

      await queryClient.cancelQueries({ queryKey: ['vehicles', variables.vehicleId] })
      const previousVehicle = queryClient.getQueryData<VehicleDetails>(['vehicles', variables.vehicleId])

      queryClient.setQueryData(['vehicles', variables.vehicleId], (oldData: VehicleDetails | undefined) => {
        if (!oldData) {
          return oldData
        }

        return {
          ...oldData,
          ...variables,
          effectiveCurrentOdometer: variables.currentOdometer ?? oldData.effectiveCurrentOdometer,
        }
      })

      queryClient.setQueryData(['vehicles'], (oldData: Vehicle[] | undefined) => {
        if (!Array.isArray(oldData)) {
          return oldData
        }

        return oldData.map((vehicle) => (
          vehicle.id === variables.vehicleId
            ? {
              ...vehicle,
              ...variables,
              effectiveCurrentOdometer: variables.currentOdometer ?? vehicle.effectiveCurrentOdometer,
            }
            : vehicle
        ))
      })

      return { previousVehicle }
    },
    onError: (_error, variables, context) => {
      if (context?.previousVehicle && variables.vehicleId) {
        queryClient.setQueryData(['vehicles', variables.vehicleId], context.previousVehicle)
      }
    },
  })

  const { mutateAsync: recalibrateNow, isLoading: isRecalibratingNow } = useMutation({
    mutationFn: vehiclesService.recalibrateNow,
  })

  const { mutateAsync: trackUsageEvent } = useMutation({
    mutationFn: vehiclesService.trackUsageEvent,
  })

  return {
    createVehicle,
    isCreatingVehicle,
    createPart,
    isCreatingPart,
    createTransaction,
    isCreatingQuickAction,
    updateVehicle,
    isUpdatingVehicle,
    recalibrateNow,
    isRecalibratingNow,
    trackUsageEvent,
  }
}

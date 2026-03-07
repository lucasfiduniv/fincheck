import { httpClient } from '../httpClient'

export interface UpdateCreditCardPurchaseParams {
  creditCardId: string
  purchaseId: string
  description?: string
  amount?: number
  purchaseDate?: string
  categoryId?: string | null
  fuelVehicleId?: string | null
  fuelOdometer?: number | null
  fuelLiters?: number | null
  fuelPricePerLiter?: number | null
  fuelFillType?: 'FULL' | 'PARTIAL'
  fuelFirstPumpClick?: boolean | null
  maintenanceVehicleId?: string | null
  maintenanceOdometer?: number | null
}

export async function updatePurchase({
  creditCardId,
  purchaseId,
  ...params
}: UpdateCreditCardPurchaseParams) {
  const { data } = await httpClient.put(
    `/credit-cards/${creditCardId}/purchases/${purchaseId}`,
    params,
  )

  return data
}

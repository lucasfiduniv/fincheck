import { httpClient } from '../httpClient'

export interface CreateCreditCardPurchaseParams {
  creditCardId: string
  description: string
  amount: number
  purchaseDate: string
  categoryId?: string
  installmentCount: number
  fuelVehicleId?: string
  fuelOdometer?: number
  fuelLiters?: number
  fuelPricePerLiter?: number
  maintenanceVehicleId?: string
  maintenanceOdometer?: number
}

export async function createPurchase({ creditCardId, ...params }: CreateCreditCardPurchaseParams) {
  const { data } = await httpClient.post(`/credit-cards/${creditCardId}/purchases`, params)

  return data
}

import { httpClient } from '../httpClient'

export interface CreateTransactionParams {
  bankAccountId: string
  categoryId: string
  name: string
  value: number
  type: 'INCOME' | 'EXPENSE'
  date: string
  repeatType?: 'ONCE' | 'RECURRING' | 'INSTALLMENT'
  repeatCount?: number
  dueDay?: number
  alertDaysBefore?: number
  fuelVehicleId?: string
  fuelOdometer?: number
  fuelLiters?: number
  fuelPricePerLiter?: number
  maintenanceVehicleId?: string
  maintenanceOdometer?: number
}

export async function create(params: CreateTransactionParams) {
  const { data } = await httpClient.post('/transactions', params)

  return data
}

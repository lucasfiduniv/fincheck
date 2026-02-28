import { httpClient } from '../httpClient'

export interface CreateCreditCardParams {
  name: string
  brand?: string
  color: string
  bankAccountId: string
  creditLimit: number
  closingDay: number
  dueDay: number
}

export async function create(params: CreateCreditCardParams) {
  const { data } = await httpClient.post('/credit-cards', params)

  return data
}

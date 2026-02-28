import { httpClient } from '../httpClient'

export interface UpdateCreditCardParams {
  id: string
  name?: string
  brand?: string
  color?: string
  bankAccountId?: string
  creditLimit?: number
  closingDay?: number
  dueDay?: number
  isActive?: boolean
}

export async function update({ id, ...params }: UpdateCreditCardParams) {
  const { data } = await httpClient.put(`/credit-cards/${id}`, params)

  return data
}

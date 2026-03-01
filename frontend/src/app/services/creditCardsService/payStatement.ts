import { httpClient } from '../httpClient'

export interface PayCreditCardStatementParams {
  creditCardId: string
  month: number
  year: number
  bankAccountId?: string
  amount?: number
}

export async function payStatement({ creditCardId, ...params }: PayCreditCardStatementParams) {
  const { data } = await httpClient.post(`/credit-cards/${creditCardId}/statements/payments`, params)

  return data
}

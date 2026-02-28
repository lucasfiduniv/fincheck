import { CreditCardStatement } from '../../entities/CreditCard'
import { httpClient } from '../httpClient'

export interface GetCreditCardStatementByMonthParams {
  creditCardId: string
  month: number
  year: number
}

export async function getStatementByMonth({
  creditCardId,
  month,
  year,
}: GetCreditCardStatementByMonthParams) {
  const { data } = await httpClient.get<CreditCardStatement>(
    `/credit-cards/${creditCardId}/statements`,
    {
      params: { month, year },
    },
  )

  return data
}

import { CreditCard } from '../../entities/CreditCard'
import { httpClient } from '../httpClient'

type CreditCardsResponse = CreditCard[]

export async function getAll() {
  const { data } = await httpClient.get<CreditCardsResponse>('/credit-cards')

  return data
}

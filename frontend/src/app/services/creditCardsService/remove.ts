import { httpClient } from '../httpClient'

export async function remove(creditCardId: string) {
  const { data } = await httpClient.delete(`/credit-cards/${creditCardId}`)

  return data
}

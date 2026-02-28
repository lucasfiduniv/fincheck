import { httpClient } from '../httpClient'

export async function remove(id: string) {
  const { data } = await httpClient.delete(`/category-budgets/${id}`)

  return data
}

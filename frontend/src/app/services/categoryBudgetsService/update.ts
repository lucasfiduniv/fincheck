import { httpClient } from '../httpClient'

export interface UpdateCategoryBudgetParams {
  id: string
  limit: number
  carryOverEnabled?: boolean
}

export async function update({ id, ...params }: UpdateCategoryBudgetParams) {
  const { data } = await httpClient.put(`/category-budgets/${id}`, params)

  return data
}

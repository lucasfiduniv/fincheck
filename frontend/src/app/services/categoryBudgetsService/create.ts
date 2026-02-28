import { httpClient } from '../httpClient'

export interface CreateCategoryBudgetParams {
  categoryId: string
  month: number
  year: number
  limit: number
}

export async function create(params: CreateCategoryBudgetParams) {
  const { data } = await httpClient.post('/category-budgets', params)

  return data
}

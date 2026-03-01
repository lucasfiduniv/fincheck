import { httpClient } from '../httpClient'

export interface CreateCategoryBudgetParams {
  categoryId: string
  month: number
  year: number
  limit: number
  carryOverEnabled?: boolean
}

export async function create(params: CreateCategoryBudgetParams) {
  const { data } = await httpClient.post('/category-budgets', params)

  return data
}

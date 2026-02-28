import { CategoryBudgetSummary } from '../../entities/CategoryBudget'
import { httpClient } from '../httpClient'

export interface CategoryBudgetsFilters {
  month: number
  year: number
}

type CategoryBudgetsSummaryResponse = Array<CategoryBudgetSummary>

export async function getSummary(filters: CategoryBudgetsFilters) {
  const { data } = await httpClient.get<CategoryBudgetsSummaryResponse>('/category-budgets/summary', {
    params: filters,
  })

  return data
}

export interface CategoryBudgetSummary {
  categoryId: string
  categoryName: string
  categoryIcon: string
  categoryBudgetId: string | null
  limit: number | null
  spent: number
  remaining: number | null
  percentageUsed: number | null
  status: 'NO_BUDGET' | 'SAFE' | 'WARNING' | 'OVER'
  hasAlert: boolean
}

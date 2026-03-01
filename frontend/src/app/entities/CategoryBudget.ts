export interface CategoryBudgetSummary {
  categoryId: string
  categoryName: string
  categoryIcon: string
  categoryBudgetId: string | null
  limit: number | null
  baseLimit?: number | null
  carryOverAmount?: number
  carryOverEnabled?: boolean
  spent: number
  remaining: number | null
  percentageUsed: number | null
  status: 'NO_BUDGET' | 'SAFE' | 'WARNING' | 'OVER'
  hasAlert: boolean
}

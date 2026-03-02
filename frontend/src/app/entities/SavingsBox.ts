export type SavingsBoxStatus = 'ACTIVE' | 'ARCHIVED'
export type SavingsBoxYieldMode = 'PERCENT' | 'FIXED'
export type SavingsBoxTransactionType = 'DEPOSIT' | 'WITHDRAW' | 'YIELD' | 'ADJUSTMENT'
export type SavingsBoxAlertStatus = 'PENDING' | 'SENT' | 'FAILED'

export interface SavingsBox {
  id: string
  userId: string
  isOwner?: boolean
  ownerName?: string
  name: string
  description: string | null
  status: SavingsBoxStatus
  currentBalance: number
  targetAmount: number | null
  targetDate: string | null
  alertEnabled: boolean
  recurrenceEnabled: boolean
  recurrenceDay: number | null
  recurrenceAmount: number | null
  lastRecurrenceRunAt: string | null
  monthlyYieldRate: number | null
  yieldMode: SavingsBoxYieldMode | null
  lastYieldAppliedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface SavingsBoxCollaborator {
  userId: string
  name: string
  email: string
}

export interface SavingsBoxTransaction {
  id: string
  userId: string
  savingsBoxId: string
  type: SavingsBoxTransactionType
  amount: number
  date: string
  description: string | null
  sourceBankAccountId: string | null
  destinationBankAccountId: string | null
  isAutomatic: boolean
  createdAt: string
}

export interface SavingsBoxAlert {
  id: string
  userId: string
  savingsBoxId: string
  type: 'GOAL_COMPLETED' | 'GOAL_NEAR_DUE' | 'LOW_PROGRESS' | 'RECURRING_EXECUTED'
  status: SavingsBoxAlertStatus
  message: string
  errorMessage: string | null
  sentAt: string | null
  createdAt: string
}

export interface SavingsBoxProgress {
  targetAmount: number | null
  targetDate: string | null
  currentBalance: number
  percentage: number
  remaining: number | null
  daysToTarget: number | null
  monthlyRequired: number | null
  isCompleted: boolean
}

export interface SavingsBoxProjection {
  monthlyContribution: number
  projectedBalanceIn12Months: number
  estimatedMonthsToGoal: number | null
  estimatedGoalDate: string | null
}

export interface SavingsBoxDetails extends SavingsBox {
  progress: SavingsBoxProgress
  projection: SavingsBoxProjection
  collaborators?: SavingsBoxCollaborator[]
  transactions: SavingsBoxTransaction[]
  alerts: SavingsBoxAlert[]
}

export interface SavingsBoxesSummary {
  totalBalance: number
  savingsBoxes: SavingsBox[]
}

export interface SavingsBoxesAnnualPlanning {
  year: number
  planning: Array<{
    savingsBoxId: string
    name: string
    targetAmount: number | null
    targetDate: string | null
    currentBalance: number
    projectedEndOfYearBalance: number
    months: Array<{
      month: number
      plannedContribution: number
      plannedYield: number
      projectedBalance: number
    }>
  }>
}

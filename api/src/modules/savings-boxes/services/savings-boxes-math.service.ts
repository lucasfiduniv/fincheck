import { Injectable } from '@nestjs/common'
import { SavingsBoxYieldMode } from '@prisma/client'

interface SavingsBoxProgressInput {
  currentBalance: number
  targetAmount: number | null
  targetDate: Date | null
}

interface SavingsBoxProjectionInput {
  currentBalance: number
  targetAmount: number | null
  recurrenceEnabled: boolean
  recurrenceAmount: number | null
  monthlyYieldRate: number | null
  yieldMode: SavingsBoxYieldMode | null
}

@Injectable()
export class SavingsBoxesMathService {
  computeProgress(savingsBox: SavingsBoxProgressInput) {
    const targetAmount = savingsBox.targetAmount ?? 0
    const percentage =
      targetAmount > 0
        ? Number(((savingsBox.currentBalance / targetAmount) * 100).toFixed(2))
        : 0

    const remaining =
      targetAmount > 0
        ? Number((targetAmount - savingsBox.currentBalance).toFixed(2))
        : null

    const now = new Date()
    const daysToTarget = savingsBox.targetDate
      ? Math.ceil((savingsBox.targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null

    const monthlyRequired =
      remaining !== null && remaining > 0 && daysToTarget !== null && daysToTarget > 0
        ? Number((remaining / Math.max(1, daysToTarget / 30)).toFixed(2))
        : null

    return {
      targetAmount: savingsBox.targetAmount,
      targetDate: savingsBox.targetDate,
      currentBalance: savingsBox.currentBalance,
      percentage,
      remaining,
      daysToTarget,
      monthlyRequired,
      isCompleted: targetAmount > 0 && savingsBox.currentBalance >= targetAmount,
    }
  }

  computeProjection(savingsBox: SavingsBoxProjectionInput) {
    const monthlyContribution = savingsBox.recurrenceEnabled
      ? (savingsBox.recurrenceAmount ?? 0)
      : 0

    let projectedBalance = savingsBox.currentBalance
    let estimatedMonthsToGoal: number | null = null

    if (savingsBox.targetAmount && savingsBox.targetAmount > projectedBalance) {
      let monthCounter = 0
      while (projectedBalance < savingsBox.targetAmount && monthCounter < 600) {
        projectedBalance += monthlyContribution
        projectedBalance += this.computeProjectedMonthlyYield(
          savingsBox.yieldMode,
          savingsBox.monthlyYieldRate,
          projectedBalance,
        )

        monthCounter += 1
      }

      estimatedMonthsToGoal = monthCounter < 600 ? monthCounter : null
    }

    const projectedBalanceIn12Months = this.projectBalanceInMonths(
      savingsBox.currentBalance,
      monthlyContribution,
      savingsBox.yieldMode,
      savingsBox.monthlyYieldRate,
      12,
    )

    return {
      monthlyContribution,
      projectedBalanceIn12Months,
      estimatedMonthsToGoal,
      estimatedGoalDate:
        estimatedMonthsToGoal !== null
          ? this.addMonths(new Date(), estimatedMonthsToGoal).toISOString()
          : null,
    }
  }

  computeProjectedMonthlyYield(
    yieldMode: SavingsBoxYieldMode | null,
    monthlyYieldRate: number | null,
    currentBalance: number,
  ) {
    if (!yieldMode || !monthlyYieldRate || monthlyYieldRate <= 0) {
      return 0
    }

    if (yieldMode === SavingsBoxYieldMode.FIXED) {
      return Number(monthlyYieldRate.toFixed(2))
    }

    return Number(((currentBalance * monthlyYieldRate) / 100).toFixed(2))
  }

  computeYieldAmount(savingsBox: {
    currentBalance: number
    monthlyYieldRate: number | null
    yieldMode: SavingsBoxYieldMode | null
  }) {
    if (!savingsBox.monthlyYieldRate || !savingsBox.yieldMode) {
      return 0
    }

    if (savingsBox.yieldMode === SavingsBoxYieldMode.FIXED) {
      return Number(savingsBox.monthlyYieldRate.toFixed(2))
    }

    return Number(((savingsBox.currentBalance * savingsBox.monthlyYieldRate) / 100).toFixed(2))
  }

  private projectBalanceInMonths(
    currentBalance: number,
    monthlyContribution: number,
    yieldMode: SavingsBoxYieldMode | null,
    monthlyYieldRate: number | null,
    months: number,
  ) {
    let balance = currentBalance

    for (let index = 0; index < months; index += 1) {
      balance += monthlyContribution
      balance += this.computeProjectedMonthlyYield(yieldMode, monthlyYieldRate, balance)
    }

    return Number(balance.toFixed(2))
  }

  private addMonths(date: Date, months: number) {
    const clonedDate = new Date(date)

    clonedDate.setMonth(clonedDate.getMonth() + months)

    return clonedDate
  }
}

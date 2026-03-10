import { Injectable } from '@nestjs/common'
import { CreditCardInstallmentsRepository } from 'src/shared/database/repositories/credit-card-installments.repository'
import { CreditCardPurchasesRepository } from 'src/shared/database/repositories/credit-card-purchases.repository'

@Injectable()
export class CreditCardStatementScheduleService {
  constructor(
    private readonly creditCardPurchasesRepo: CreditCardPurchasesRepository,
    private readonly creditCardInstallmentsRepo: CreditCardInstallmentsRepository,
  ) {}

  splitInstallments(amount: number, installmentCount: number) {
    const totalCents = Math.round(amount * 100)
    const installmentBaseCents = Math.floor(totalCents / installmentCount)
    const remainder = totalCents - installmentBaseCents * installmentCount

    return Array.from({ length: installmentCount }).map((_, index) => {
      const cents = installmentBaseCents + (index < remainder ? 1 : 0)

      return Number((cents / 100).toFixed(2))
    })
  }

  resolveStatementForPurchase(date: Date, closingDay: number) {
    const day = date.getUTCDate()

    // Purchases made on the closing day are treated as next statement.
    if (day >= closingDay) {
      return this.addMonthsToStatement(
        {
          month: date.getUTCMonth(),
          year: date.getUTCFullYear(),
        },
        1,
      )
    }

    return {
      month: date.getUTCMonth(),
      year: date.getUTCFullYear(),
    }
  }

  addMonthsToStatement(
    statement: { month: number; year: number },
    monthsToAdd: number,
  ) {
    const computedDate = new Date(Date.UTC(statement.year, statement.month + monthsToAdd, 1))

    return {
      month: computedDate.getUTCMonth(),
      year: computedDate.getUTCFullYear(),
    }
  }

  buildDueDate(year: number, month: number, dueDay: number) {
    const maxDayInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
    const normalizedDay = Math.min(dueDay, maxDayInMonth)

    return new Date(Date.UTC(year, month, normalizedDay))
  }

  getCurrentStatementReference() {
    const now = new Date()

    return {
      month: now.getUTCMonth(),
      year: now.getUTCFullYear(),
    }
  }

  async recalculateInstallmentsSchedule(
    userId: string,
    card: {
      id: string
      closingDay: number
      dueDay: number
    },
    options?: {
      includePaid?: boolean
      includeCanceled?: boolean
    },
  ) {
    const includePaid = !!options?.includePaid
    const includeCanceled = !!options?.includeCanceled

    const purchases = await this.creditCardPurchasesRepo.findMany({
      where: {
        userId,
        creditCardId: card.id,
      },
      select: {
        id: true,
        purchaseDate: true,
        installments: {
          orderBy: [{ installmentNumber: 'asc' }],
          select: {
            id: true,
            installmentNumber: true,
            statementMonth: true,
            statementYear: true,
            dueDate: true,
            status: true,
          },
        },
      },
    })

    let updatedInstallments = 0
    let skippedInstallments = 0

    for (const purchase of purchases) {
      const firstStatement = this.resolveStatementForPurchase(
        purchase.purchaseDate,
        card.closingDay,
      )

      for (const installment of purchase.installments) {
        const canRecalculate = installment.status === 'PENDING'
          || (includePaid && installment.status === 'PAID')
          || (includeCanceled && installment.status === 'CANCELED')

        if (!canRecalculate) {
          skippedInstallments += 1
          continue
        }

        const statementRef = this.addMonthsToStatement(
          firstStatement,
          installment.installmentNumber - 1,
        )
        const nextDueDate = this.buildDueDate(statementRef.year, statementRef.month, card.dueDay)

        const statementChanged = installment.statementMonth !== statementRef.month
          || installment.statementYear !== statementRef.year
        const dueDateChanged = installment.dueDate.getTime() !== nextDueDate.getTime()

        if (!statementChanged && !dueDateChanged) {
          skippedInstallments += 1
          continue
        }

        await this.creditCardInstallmentsRepo.update({
          where: {
            id: installment.id,
          },
          data: {
            statementMonth: statementRef.month,
            statementYear: statementRef.year,
            dueDate: nextDueDate,
          },
        })

        updatedInstallments += 1
      }
    }

    return {
      creditCardId: card.id,
      updatedInstallments,
      skippedInstallments,
      includePaid,
      includeCanceled,
    }
  }
}

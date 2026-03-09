import { Injectable } from '@nestjs/common'
import { TransactionsRepository } from 'src/shared/database/repositories/transactions.repository'
import { TransactionStatus, TransactionType } from '../entities/Transaction'

@Injectable()
export class TransactionsReportsInputUseCaseService {
  constructor(private readonly transactionsRepo: TransactionsRepository) {}

  findAllByUserId(
    userId: string,
    filters: {
      month: number;
      year: number;
      bankAccountId?: string;
      type?: TransactionType;
    },
  ) {
    return this.transactionsRepo.findMany({
      where: {
        userId,
        date: {
          gte: new Date(Date.UTC(filters.year, filters.month)),
          lt: new Date(Date.UTC(filters.year, filters.month + 1)),
        },
        bankAccountId: filters.bankAccountId,
        type: filters.type,
      },
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
      include: {
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
          },
        },
      },
    })
  }

  async findDueAlertsSummaryByMonth(
    userId: string,
    { month, year }: { month: number; year: number },
  ) {
    const reminders = await this.transactionsRepo.findMany({
      where: {
        userId,
        status: TransactionStatus.PLANNED,
        entryType: {
          in: ['RECURRING', 'INSTALLMENT'],
        },
        dueDay: {
          not: null,
        },
        date: {
          gte: new Date(Date.UTC(year, month)),
          lt: new Date(Date.UTC(year, month + 1)),
        },
      },
      orderBy: [{ dueDay: 'asc' }, { name: 'asc' }],
    })

    const uniqueByGroup = new Map<string, (typeof reminders)[number]>()

    for (const reminder of reminders) {
      const groupKey =
        reminder.recurrenceGroupId ?? `${reminder.id}-${reminder.name}`

      if (!uniqueByGroup.has(groupKey)) {
        uniqueByGroup.set(groupKey, reminder)
      }
    }

    const now = new Date()
    const nowAtMidnight = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    )

    return Array.from(uniqueByGroup.values()).map((reminder) => {
      const reminderDueDay = reminder.dueDay ?? reminder.date.getUTCDate()
      const dueDateAtMidnight = new Date(Date.UTC(year, month, reminderDueDay))
      const dayDiff = Math.floor(
        (dueDateAtMidnight.getTime() - nowAtMidnight.getTime()) /
          (1000 * 60 * 60 * 24),
      )

      const alertBefore = reminder.alertDaysBefore ?? 3

      const status =
        dayDiff < 0
          ? 'OVERDUE'
          : dayDiff === 0
            ? 'DUE_TODAY'
            : dayDiff <= alertBefore
              ? 'UPCOMING'
              : 'FUTURE'

      return {
        id: reminder.id,
        recurrenceGroupId: reminder.recurrenceGroupId,
        name: reminder.name,
        entryType: reminder.entryType,
        dueDay: reminderDueDay,
        alertDaysBefore: alertBefore,
        amount: reminder.value,
        daysUntilDue: dayDiff,
        status,
        hasAlert: status !== 'FUTURE',
      }
    })
  }
}

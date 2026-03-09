import { BadRequestException, Injectable } from '@nestjs/common'
import { TransactionsRepository } from 'src/shared/database/repositories/transactions.repository'
import { RecurrenceAdjustmentScope } from '../dto/adjust-recurrence-future-values.dto'
import { TransactionStatus } from '../entities/Transaction'

@Injectable()
export class TransactionsRecurrenceUseCaseService {
  constructor(private readonly transactionsRepo: TransactionsRepository) {}

  async adjustFutureValuesByRecurrenceGroup(
    userId: string,
    recurrenceGroupId: string,
    data: {
      value: number;
      fromDate?: string;
      scope?: RecurrenceAdjustmentScope;
      transactionId?: string;
    },
  ) {
    const recurrenceGroup = await this.transactionsRepo.findFirst({
      where: {
        userId,
        recurrenceGroupId,
      },
      select: { id: true },
    })

    if (!recurrenceGroup) {
      throw new BadRequestException('Recurrence group not found.')
    }

    const scope = data.scope ?? RecurrenceAdjustmentScope.THIS_AND_NEXT

    const anchorTransaction = data.transactionId
      ? await this.transactionsRepo.findFirst({
          where: {
            id: data.transactionId,
            userId,
            recurrenceGroupId,
          },
          select: {
            id: true,
            date: true,
          },
        })
      : null

    if (data.transactionId && !anchorTransaction) {
      throw new BadRequestException('Transaction does not belong to this recurrence group.')
    }

    if (scope === RecurrenceAdjustmentScope.THIS) {
      if (!anchorTransaction) {
        throw new BadRequestException('transactionId is required when scope is THIS.')
      }

      return this.transactionsRepo.updateMany({
        where: {
          userId,
          recurrenceGroupId,
          id: anchorTransaction.id,
        },
        data: {
          value: data.value,
        },
      })
    }

    if (scope === RecurrenceAdjustmentScope.ALL) {
      return this.transactionsRepo.updateMany({
        where: {
          userId,
          recurrenceGroupId,
          status: TransactionStatus.PLANNED,
        },
        data: {
          value: data.value,
        },
      })
    }

    const fromDate = anchorTransaction?.date
      ?? (data.fromDate ? new Date(data.fromDate) : new Date())

    return this.transactionsRepo.updateMany({
      where: {
        userId,
        recurrenceGroupId,
        status: TransactionStatus.PLANNED,
        date: {
          gte: fromDate,
        },
      },
      data: {
        value: data.value,
      },
    })
  }
}

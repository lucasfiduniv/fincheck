import { Injectable } from '@nestjs/common'
import { TransactionsRepository } from 'src/shared/database/repositories/transactions.repository'
import { TransactionType } from '../entities/Transaction'
import { isDuplicateNameEquivalent, toMoneyCents } from './transactions-import.utils'

@Injectable()
export class TransactionsImportDeduplicationService {
  constructor(
    private readonly transactionsRepo: TransactionsRepository,
  ) {}

  async findPossibleDuplicateTransaction({
    userId,
    bankAccountId,
    date,
    value,
    type,
    name,
    matchByName = true,
  }: {
    userId: string;
    bankAccountId: string;
    date: Date;
    value: number;
    type: TransactionType;
    name: string;
    matchByName?: boolean;
  }) {
    const dayStart = new Date(Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
    ))

    const dayEnd = new Date(Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() + 1,
    ))

    const candidates = await this.transactionsRepo.findMany({
      where: {
        userId,
        bankAccountId,
        type,
        date: {
          gte: dayStart,
          lt: dayEnd,
        },
      },
      select: {
        id: true,
        name: true,
        value: true,
      },
    })

    const targetValueInCents = toMoneyCents(value)

    const duplicate = candidates.find((candidate) => {
      const candidateValueInCents = toMoneyCents(Number(candidate.value))

      if (candidateValueInCents !== targetValueInCents) {
        return false
      }

      if (!matchByName) {
        return true
      }

      return isDuplicateNameEquivalent(candidate.name, name)
    })

    if (!duplicate) {
      return null
    }

    return {
      id: duplicate.id,
    }
  }
}
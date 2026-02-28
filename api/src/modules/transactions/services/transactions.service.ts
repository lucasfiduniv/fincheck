import { BadRequestException, Injectable } from '@nestjs/common'
import { CreateTransactionDto } from '../dto/create-transaction.dto'
import { UpdateTransactionDto } from '../dto/update-transaction.dto'
import { TransactionsRepository } from 'src/shared/database/repositories/transactions.repository'
import { ValidateBankAccountOwnershipService } from '../../bank-accounts/services/validate-bank-account-ownership.service'
import { ValidateCategoryOwnershipService } from '../../categories/services/validate-category-ownership.service'
import { ValidateTransactionOwnershipService } from './validate-transaction-ownership.service'
import { TransactionCreationType, TransactionType } from '../entities/Transaction'
import { randomUUID } from 'crypto'

@Injectable()
export class TransactionsService {
  private readonly defaultRecurringMonths = 24

  constructor(
    private readonly transactionsRepo: TransactionsRepository,
    private readonly validateBankAccountOwnershipService: ValidateBankAccountOwnershipService,
    private readonly validateCategoryOwnershipService: ValidateCategoryOwnershipService,
    private readonly validateTransactionOwnershipService: ValidateTransactionOwnershipService,
  ) {}

  async create(userId: string, createTransactionDto: CreateTransactionDto) {
    const {
      bankAccountId,
      categoryId,
      date,
      name,
      type,
      value,
      repeatCount,
      repeatType,
    } =
      createTransactionDto

    await this.validateEntitiesOwnership({
      userId,
      bankAccountId,
      categoryId,
    })

    const creationType = repeatType ?? TransactionCreationType.ONCE

    if (
      creationType === TransactionCreationType.INSTALLMENT &&
      !repeatCount
    ) {
      throw new BadRequestException('repeatCount is required for installments.')
    }

    const transactionsCount =
      creationType === TransactionCreationType.ONCE
        ? 1
        : creationType === TransactionCreationType.INSTALLMENT
          ? repeatCount!
          : repeatCount ?? this.defaultRecurringMonths
    const recurrenceGroupId =
      creationType === TransactionCreationType.ONCE ? null : randomUUID()
    const baseDate = new Date(date)

    const createdTransactions = await Promise.all(
      Array.from({ length: transactionsCount }).map((_, index) => {
        const occurrenceDate = this.addMonthsUTC(baseDate, index)
        const installmentLabel = `${name} (${index + 1}/${transactionsCount})`

        return this.transactionsRepo.create({
          data: {
            userId,
            bankAccountId,
            categoryId,
            date: occurrenceDate,
            name:
              creationType === TransactionCreationType.INSTALLMENT
                ? installmentLabel
                : name,
            type,
            value,
            entryType: this.getEntryType(creationType),
            recurrenceGroupId,
            installmentNumber:
              creationType === TransactionCreationType.INSTALLMENT
                ? index + 1
                : null,
            installmentCount:
              creationType === TransactionCreationType.INSTALLMENT
                ? transactionsCount
                : null,
          },
        })
      }),
    )

    return createdTransactions[0]
  }

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

  async update(
    userId: string,
    transactionId: string,
    updateTransactionDto: UpdateTransactionDto,
  ) {
    const { bankAccountId, categoryId, date, name, type, value } =
      updateTransactionDto

    await this.validateEntitiesOwnership({
      userId,
      bankAccountId,
      categoryId,
      transactionId,
    })

    return this.transactionsRepo.update({
      where: { id: transactionId },
      data: {
        bankAccountId,
        categoryId,
        date,
        name,
        type,
        value,
      },
    })
  }

  async remove(userId: string, transactionId: string) {
    await this.validateEntitiesOwnership({ userId, transactionId })

    await this.transactionsRepo.delete({
      where: { id: transactionId },
    })
  }

  private async validateEntitiesOwnership({
    userId,
    bankAccountId,
    categoryId,
    transactionId,
  }: {
    userId: string;
    bankAccountId?: string;
    categoryId?: string;
    transactionId?: string;
  }) {
    await Promise.all([
      transactionId &&
        this.validateTransactionOwnershipService.validate(
          userId,
          transactionId,
        ),
      bankAccountId &&
        this.validateBankAccountOwnershipService.validate(
          userId,
          bankAccountId,
        ),
      categoryId &&
        this.validateCategoryOwnershipService.validate(userId, categoryId),
    ])
  }

  private addMonthsUTC(date: Date, monthsToAdd: number) {
    const utcDate = new Date(date)

    utcDate.setUTCMonth(utcDate.getUTCMonth() + monthsToAdd)

    return utcDate
  }

  private getEntryType(type: TransactionCreationType) {
    if (type === TransactionCreationType.RECURRING) {
      return 'RECURRING'
    }

    if (type === TransactionCreationType.INSTALLMENT) {
      return 'INSTALLMENT'
    }

    return 'SINGLE'
  }
}

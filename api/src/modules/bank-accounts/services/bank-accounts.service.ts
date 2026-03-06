import { Injectable } from '@nestjs/common'
import { CreateBankAccountDto } from '../dto/create-bank-account.dto'
import { UpdateBankAccountDto } from '../dto/update-bank-account.dto'
import { BankAccountsRepository } from 'src/shared/database/repositories/bank-accounts.repository'
import { ValidateBankAccountOwnershipService } from './validate-bank-account-ownership.service'
import { TransactionsRepository } from 'src/shared/database/repositories/transactions.repository'

@Injectable()
export class BankAccountsService {
  constructor(
    private readonly bankAccountsRepo: BankAccountsRepository,
    private readonly transactionsRepo: TransactionsRepository,
    private readonly validateBankAccountOwnershipService: ValidateBankAccountOwnershipService,
  ) {}
  create(userId: string, createBankAccountDto: CreateBankAccountDto) {
    const { color, initialBalance, name, type } = createBankAccountDto

    return this.bankAccountsRepo.create({
      data: {
        userId,
        color,
        initialBalance,
        name,
        type,
      },
    })
  }

  async findAllByUserId(userId: string) {
    const bankAccounts = await this.bankAccountsRepo.findMany({
      where: { userId },
      include: {
        transactions: {
          select: {
            type: true,
            value: true,
            status: true,
          },
        },
      },
    })

    return bankAccounts.map(({ transactions, ...bankAccount }) => {
      const totalTransactions = transactions.reduce(
        (acc, transaction) => {
          if (transaction.status !== 'POSTED') {
            return acc
          }

          if (transaction.type === 'TRANSFER') {
            return acc + transaction.value
          }

          return acc +
            (transaction.type === 'INCOME'
              ? transaction.value
              : -transaction.value)
        },
        0,
      )

      const currentBalance = bankAccount.initialBalance + totalTransactions

      return {
        ...bankAccount,
        currentBalance,
      }
    })
  }

  async update(
    userId: string,
    bankAccountId: string,
    updateBankAccountDto: UpdateBankAccountDto,
  ) {
    await this.validateBankAccountOwnershipService.validate(
      userId,
      bankAccountId,
    )

    const { color, initialBalance, name, type } = updateBankAccountDto

    const currentAccount = await this.bankAccountsRepo.findFirst({
      where: {
        id: bankAccountId,
        userId,
      },
      include: {
        transactions: {
          select: {
            type: true,
            value: true,
            status: true,
          },
        },
      },
    })

    if (!currentAccount) {
      return null
    }

    const currentBalance = this.calculateCurrentBalance(
      currentAccount.initialBalance,
      currentAccount.transactions,
    )

    const desiredBalance = initialBalance
    const calibrationDelta = Number((desiredBalance - currentBalance).toFixed(2))

    const updatedAccount = await this.bankAccountsRepo.update({
      where: { id: bankAccountId },
      data: {
        color,
        initialBalance: currentAccount.initialBalance,
        name,
        type,
      },
    })

    if (Math.abs(calibrationDelta) >= 0.01) {
      await this.transactionsRepo.create({
        data: {
          userId,
          bankAccountId,
          categoryId: null,
          name: 'Calibragem de saldo',
          value: calibrationDelta,
          date: new Date(),
          type: 'TRANSFER',
          status: 'POSTED',
          entryType: 'SINGLE',
        },
      })
    }

    return updatedAccount
  }

  private calculateCurrentBalance(
    initialBalance: number,
    transactions: Array<{
      type: string;
      value: number;
      status: string;
    }>,
  ) {
    const totalTransactions = transactions.reduce((acc, transaction) => {
      if (transaction.status !== 'POSTED') {
        return acc
      }

      if (transaction.type === 'TRANSFER') {
        return acc + transaction.value
      }

      return acc + (transaction.type === 'INCOME'
        ? transaction.value
        : -transaction.value)
    }, 0)

    return initialBalance + totalTransactions
  }

  async remove(userId: string, bankAccountId: string) {
    await this.validateBankAccountOwnershipService.validate(
      userId,
      bankAccountId,
    )

    await this.bankAccountsRepo.delete({
      where: { id: bankAccountId },
    })

    return null
  }
}

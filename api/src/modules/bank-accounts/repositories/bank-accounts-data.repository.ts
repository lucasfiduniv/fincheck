import { Injectable } from '@nestjs/common'
import { BankAccountsRepository } from 'src/shared/database/repositories/bank-accounts.repository'
import { TransactionsRepository } from 'src/shared/database/repositories/transactions.repository'
import { CreateBankAccountDto } from '../dto/create-bank-account.dto'
import { UpdateBankAccountDto } from '../dto/update-bank-account.dto'

@Injectable()
export class BankAccountsDataRepository {
  constructor(
    private readonly bankAccountsRepo: BankAccountsRepository,
    private readonly transactionsRepo: TransactionsRepository,
  ) {}

  create(userId: string, createBankAccountDto: CreateBankAccountDto) {
    return this.bankAccountsRepo.create({
      data: {
        userId,
        color: createBankAccountDto.color,
        initialBalance: createBankAccountDto.initialBalance,
        name: createBankAccountDto.name,
        type: createBankAccountDto.type,
      },
    })
  }

  findAllWithTransactionsByUserId(userId: string) {
    return this.bankAccountsRepo.findMany({
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
  }

  findOneWithTransactionsByIdAndUserId(bankAccountId: string, userId: string) {
    return this.bankAccountsRepo.findFirst({
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
  }

  update(
    bankAccountId: string,
    data: Pick<UpdateBankAccountDto, 'color' | 'name' | 'type'> & { initialBalance: number },
  ) {
    return this.bankAccountsRepo.update({
      where: { id: bankAccountId },
      data,
    })
  }

  createBalanceCalibrationTransaction(params: {
    userId: string
    bankAccountId: string
    value: number
  }) {
    return this.transactionsRepo.create({
      data: {
        userId: params.userId,
        bankAccountId: params.bankAccountId,
        categoryId: null,
        name: 'Calibragem de saldo',
        value: params.value,
        date: new Date(),
        type: 'TRANSFER',
        status: 'POSTED',
        entryType: 'SINGLE',
      },
    })
  }

  remove(bankAccountId: string) {
    return this.bankAccountsRepo.delete({
      where: { id: bankAccountId },
    })
  }
}

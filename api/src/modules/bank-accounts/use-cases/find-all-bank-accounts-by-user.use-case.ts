import { Injectable } from '@nestjs/common'
import { BankAccountsDataRepository } from '../repositories/bank-accounts-data.repository'
import { BankAccountBalanceCalculatorService } from '../services/bank-account-balance-calculator.service'

@Injectable()
export class FindAllBankAccountsByUserUseCase {
  constructor(
    private readonly bankAccountsDataRepository: BankAccountsDataRepository,
    private readonly bankAccountBalanceCalculatorService: BankAccountBalanceCalculatorService,
  ) {}

  async execute(userId: string) {
    const bankAccounts = await this.bankAccountsDataRepository.findAllWithTransactionsByUserId(userId)

    return bankAccounts.map(({ transactions, ...bankAccount }) => ({
      ...bankAccount,
      currentBalance: this.bankAccountBalanceCalculatorService.calculate(
        bankAccount.initialBalance,
        transactions,
      ),
    }))
  }
}

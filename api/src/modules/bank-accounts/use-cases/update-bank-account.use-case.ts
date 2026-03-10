import { Injectable } from '@nestjs/common'
import { UpdateBankAccountDto } from '../dto/update-bank-account.dto'
import { ValidateBankAccountOwnershipService } from '../services/validate-bank-account-ownership.service'
import { BankAccountsDataRepository } from '../repositories/bank-accounts-data.repository'
import { BankAccountBalanceCalculatorService } from '../services/bank-account-balance-calculator.service'

@Injectable()
export class UpdateBankAccountUseCase {
  constructor(
    private readonly validateBankAccountOwnershipService: ValidateBankAccountOwnershipService,
    private readonly bankAccountsDataRepository: BankAccountsDataRepository,
    private readonly bankAccountBalanceCalculatorService: BankAccountBalanceCalculatorService,
  ) {}

  async execute(
    userId: string,
    bankAccountId: string,
    updateBankAccountDto: UpdateBankAccountDto,
  ) {
    await this.validateBankAccountOwnershipService.validate(userId, bankAccountId)

    const { color, initialBalance, name, type } = updateBankAccountDto

    const currentAccount = await this.bankAccountsDataRepository.findOneWithTransactionsByIdAndUserId(
      bankAccountId,
      userId,
    )

    if (!currentAccount) {
      return null
    }

    const currentBalance = this.bankAccountBalanceCalculatorService.calculate(
      currentAccount.initialBalance,
      currentAccount.transactions,
    )

    const calibrationDelta = Number((initialBalance - currentBalance).toFixed(2))

    const updatedAccount = await this.bankAccountsDataRepository.update(bankAccountId, {
      color,
      initialBalance: currentAccount.initialBalance,
      name,
      type,
    })

    if (Math.abs(calibrationDelta) >= 0.01) {
      await this.bankAccountsDataRepository.createBalanceCalibrationTransaction({
        userId,
        bankAccountId,
        value: calibrationDelta,
      })
    }

    return updatedAccount
  }
}

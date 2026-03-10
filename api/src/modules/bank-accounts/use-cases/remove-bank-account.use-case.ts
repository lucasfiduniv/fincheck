import { Injectable } from '@nestjs/common'
import { ValidateBankAccountOwnershipService } from '../services/validate-bank-account-ownership.service'
import { BankAccountsDataRepository } from '../repositories/bank-accounts-data.repository'

@Injectable()
export class RemoveBankAccountUseCase {
  constructor(
    private readonly validateBankAccountOwnershipService: ValidateBankAccountOwnershipService,
    private readonly bankAccountsDataRepository: BankAccountsDataRepository,
  ) {}

  async execute(userId: string, bankAccountId: string) {
    await this.validateBankAccountOwnershipService.validate(userId, bankAccountId)

    await this.bankAccountsDataRepository.remove(bankAccountId)

    return null
  }
}

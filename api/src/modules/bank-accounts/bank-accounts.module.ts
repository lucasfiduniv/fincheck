import { Module } from '@nestjs/common'
import { BankAccountsService } from './services/bank-accounts.service'
import { BankAccountsController } from './bank-accounts.controller'
import { ValidateBankAccountOwnershipService } from './services/validate-bank-account-ownership.service'
import { BankAccountsDataRepository } from './repositories/bank-accounts-data.repository'
import { BankAccountBalanceCalculatorService } from './services/bank-account-balance-calculator.service'
import { CreateBankAccountUseCase } from './use-cases/create-bank-account.use-case'
import { FindAllBankAccountsByUserUseCase } from './use-cases/find-all-bank-accounts-by-user.use-case'
import { UpdateBankAccountUseCase } from './use-cases/update-bank-account.use-case'
import { RemoveBankAccountUseCase } from './use-cases/remove-bank-account.use-case'

@Module({
  controllers: [BankAccountsController],
  providers: [
    BankAccountsService,
    ValidateBankAccountOwnershipService,
    BankAccountsDataRepository,
    BankAccountBalanceCalculatorService,
    CreateBankAccountUseCase,
    FindAllBankAccountsByUserUseCase,
    UpdateBankAccountUseCase,
    RemoveBankAccountUseCase,
  ],
  exports: [ValidateBankAccountOwnershipService],
})
export class BankAccountsModule {}

import { Module } from '@nestjs/common'
import { CreditCardsController } from './credit-cards.controller'
import { CreditCardsService } from './services/credit-cards.service'
import { BankAccountsModule } from '../bank-accounts/bank-accounts.module'
import { CategoriesModule } from '../categories/categories.module'
import { PayCreditCardStatementUseCase } from './use-cases/pay-credit-card-statement.use-case'
import { FindCreditCardStatementByMonthUseCase } from './use-cases/find-credit-card-statement-by-month.use-case'
import { ImportCreditCardStatementUseCase } from './use-cases/import-credit-card-statement.use-case'
import { ExportCreditCardStatementUseCase } from './use-cases/export-credit-card-statement.use-case'
import { AiModule } from '../ai/ai.module'
import { TransactionsModule } from '../transactions/transactions.module'

@Module({
  imports: [BankAccountsModule, CategoriesModule, AiModule, TransactionsModule],
  controllers: [CreditCardsController],
  providers: [
    CreditCardsService,
    PayCreditCardStatementUseCase,
    FindCreditCardStatementByMonthUseCase,
    ImportCreditCardStatementUseCase,
    ExportCreditCardStatementUseCase,
  ],
})
export class CreditCardsModule {}

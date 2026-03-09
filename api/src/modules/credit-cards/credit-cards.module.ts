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
import { CreditCardPurchaseMetadataService } from './services/credit-card-purchase-metadata.service'
import { CreditCardStatementScheduleService } from './services/credit-card-statement-schedule.service'
import { CreditCardStatementParserService } from './services/credit-card-statement-parser.service'
import { CreditCardStatementPaymentImportService } from './services/credit-card-statement-payment-import.service'
import { CreditCardStatementPurchaseImportService } from './services/credit-card-statement-purchase-import.service'
import { CreditCardPurchasesWriteService } from './services/credit-card-purchases-write.service'

@Module({
  imports: [BankAccountsModule, CategoriesModule, AiModule, TransactionsModule],
  controllers: [CreditCardsController],
  providers: [
    CreditCardsService,
    PayCreditCardStatementUseCase,
    FindCreditCardStatementByMonthUseCase,
    ImportCreditCardStatementUseCase,
    ExportCreditCardStatementUseCase,
    CreditCardPurchaseMetadataService,
    CreditCardStatementScheduleService,
    CreditCardStatementParserService,
    CreditCardStatementPaymentImportService,
    CreditCardStatementPurchaseImportService,
    CreditCardPurchasesWriteService,
  ],
})
export class CreditCardsModule {}

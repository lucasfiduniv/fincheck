import { Module } from '@nestjs/common'
import { TransactionsService } from './services/transactions.service'
import { TransactionsController } from './transactions.controller'
import { BankAccountsModule } from '../bank-accounts/bank-accounts.module'
import { CategoriesModule } from '../categories/categories.module'
import { ValidateTransactionOwnershipService } from './services/validate-transaction-ownership.service'
import { StatementImportService } from './services/statement-import/statement-import.service'
import { NubankStatementParser } from './services/statement-import/parsers/nubank-statement.parser'
import { NubankOfxStatementParser } from './services/statement-import/parsers/nubank-ofx-statement.parser'

@Module({
  imports: [BankAccountsModule, CategoriesModule],
  controllers: [TransactionsController],
  providers: [
    TransactionsService,
    ValidateTransactionOwnershipService,
    StatementImportService,
    NubankStatementParser,
    NubankOfxStatementParser,
  ],
})
export class TransactionsModule {}

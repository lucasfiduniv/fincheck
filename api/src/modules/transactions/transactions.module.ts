import { Module } from '@nestjs/common'
import { TransactionsService } from './services/transactions.service'
import { TransactionsController } from './transactions.controller'
import { BankAccountsModule } from '../bank-accounts/bank-accounts.module'
import { CategoriesModule } from '../categories/categories.module'
import { ValidateTransactionOwnershipService } from './services/validate-transaction-ownership.service'
import { StatementImportService } from './services/statement-import/statement-import.service'
import { NubankStatementParser } from './services/statement-import/parsers/nubank-statement.parser'
import { NubankOfxStatementParser } from './services/statement-import/parsers/nubank-ofx-statement.parser'
import { BancoDoBrasilOfxStatementParser } from './services/statement-import/parsers/banco-do-brasil-ofx-statement.parser'
import { SicoobPdfStatementParser } from './services/statement-import/parsers/sicoob-pdf-statement.parser'
import { AiModule } from '../ai/ai.module'
import { TransactionsGateway } from './transactions.gateway'
import { TransactionsCreateUseCaseService } from './services/transactions-create.use-case.service'
import { TransactionsImportUseCaseService } from './services/transactions-import.use-case.service'
import { TransactionsRecurrenceUseCaseService } from './services/transactions-recurrence.use-case.service'
import { TransactionsReportsInputUseCaseService } from './services/transactions-reports-input.use-case.service'
import { TransactionsImportDeduplicationService } from './services/transactions-import-deduplication.service'
import { TransactionsImportTransferService } from './services/transactions-import-transfer.service'

@Module({
  imports: [BankAccountsModule, CategoriesModule, AiModule],
  controllers: [TransactionsController],
  providers: [
    TransactionsService,
    ValidateTransactionOwnershipService,
    StatementImportService,
    NubankStatementParser,
    NubankOfxStatementParser,
    BancoDoBrasilOfxStatementParser,
    SicoobPdfStatementParser,
    TransactionsGateway,
    TransactionsCreateUseCaseService,
    TransactionsImportUseCaseService,
    TransactionsImportDeduplicationService,
    TransactionsImportTransferService,
    TransactionsRecurrenceUseCaseService,
    TransactionsReportsInputUseCaseService,
  ],
  exports: [TransactionsGateway],
})
export class TransactionsModule {}

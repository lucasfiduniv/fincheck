import { Global, Module } from '@nestjs/common'
import { PrismaService } from './prisma.service'
import { UsersRepository } from './repositories/users.repository'
import { CategoriesRepository } from './repositories/categories.repository'
import { BankAccountsRepository } from './repositories/bank-accounts.repository'
import { TransactionsRepository } from './repositories/transactions.repository'
import { CategoryBudgetsRepository } from './repositories/category-budgets.repository'
import { CreditCardsRepository } from './repositories/credit-cards.repository'
import { CreditCardPurchasesRepository } from './repositories/credit-card-purchases.repository'
import { CreditCardInstallmentsRepository } from './repositories/credit-card-installments.repository'

@Global()
@Module({
  providers: [
    PrismaService,
    UsersRepository,
    CategoriesRepository,
    BankAccountsRepository,
    TransactionsRepository,
    CategoryBudgetsRepository,
    CreditCardsRepository,
    CreditCardPurchasesRepository,
    CreditCardInstallmentsRepository,
  ],
  exports: [
    UsersRepository,
    CategoriesRepository,
    BankAccountsRepository,
    TransactionsRepository,
    CategoryBudgetsRepository,
    CreditCardsRepository,
    CreditCardPurchasesRepository,
    CreditCardInstallmentsRepository,
  ],
})
export class DatabaseModule {}

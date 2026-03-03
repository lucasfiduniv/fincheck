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
import { NotificationEventsRepository } from './repositories/notification-events.repository'
import { SavingsBoxesRepository } from './repositories/savings-boxes.repository'
import { SavingsBoxTransactionsRepository } from './repositories/savings-box-transactions.repository'
import { SavingsBoxAlertsRepository } from './repositories/savings-box-alerts.repository'
import { FriendshipsRepository } from './repositories/friendships.repository'
import { SavingsBoxCollaboratorsRepository } from './repositories/savings-box-collaborators.repository'
import { VehiclesRepository } from './repositories/vehicles.repository'
import { FuelRecordsRepository } from './repositories/fuel-records.repository'
import { VehiclePartsRepository } from './repositories/vehicle-parts.repository'

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
    NotificationEventsRepository,
    SavingsBoxesRepository,
    SavingsBoxTransactionsRepository,
    SavingsBoxAlertsRepository,
    FriendshipsRepository,
    SavingsBoxCollaboratorsRepository,
    VehiclesRepository,
    FuelRecordsRepository,
    VehiclePartsRepository,
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
    NotificationEventsRepository,
    SavingsBoxesRepository,
    SavingsBoxTransactionsRepository,
    SavingsBoxAlertsRepository,
    FriendshipsRepository,
    SavingsBoxCollaboratorsRepository,
    VehiclesRepository,
    FuelRecordsRepository,
    VehiclePartsRepository,
  ],
})
export class DatabaseModule {}

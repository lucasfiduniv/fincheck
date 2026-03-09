import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { UsersModule } from './modules/users/users.module'
import { DatabaseModule } from './shared/database/database.module'
import { AuthModule } from './modules/auth/auth.module'
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { AuthGuard } from './modules/auth/auth.guard'
import { CategoriesModule } from './modules/categories/categories.module'
import { BankAccountsModule } from './modules/bank-accounts/bank-accounts.module'
import { TransactionsModule } from './modules/transactions/transactions.module'
import { CategoryBudgetsModule } from './modules/category-budgets/category-budgets.module'
import { CreditCardsModule } from './modules/credit-cards/credit-cards.module'
import { NotificationsModule } from './modules/notifications/notifications.module'
import { SavingsBoxesModule } from './modules/savings-boxes/savings-boxes.module'
import { FriendshipsModule } from './modules/friendships/friendships.module'
import { VehiclesModule } from './modules/vehicles/vehicles.module'
import { AiModule } from './modules/ai/ai.module'
import { HttpExceptionFilter } from './shared/http/http-exception.filter'
import { HttpLoggingInterceptor } from './shared/http/http-logging.interceptor'
import { RequestContextMiddleware } from './shared/http/request-context.middleware'

@Module({
  imports: [
    UsersModule,
    DatabaseModule,
    AuthModule,
    CategoriesModule,
    BankAccountsModule,
    TransactionsModule,
    CategoryBudgetsModule,
    CreditCardsModule,
    NotificationsModule,
    SavingsBoxesModule,
    FriendshipsModule,
    VehiclesModule,
    AiModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpLoggingInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*')
  }
}
